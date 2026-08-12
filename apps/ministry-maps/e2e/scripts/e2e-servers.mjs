#!/usr/bin/env node
/**
 * E2E server supervisor — the single `webServer` Playwright starts.
 *
 * WHY THIS EXISTS
 * ---------------
 * `firebase-tools` spawns the emulator JARs **detached** (each one gets its own
 * process group *and* session). Playwright shuts a `webServer` down by killing
 * its process group, so those JARs are unreachable that way: they survive the
 * run and keep holding 8080/9099, which is exactly the "emulators still running
 * after the tests finished" symptom. The only thing that reliably stops them is
 * the Firebase CLI's own SIGINT handler — so the CLI has to be signalled, and
 * then given time to exit, before anything escalates to SIGKILL.
 *
 * This supervisor owns that lifecycle:
 *
 *  1. **Pre-flight** — force-frees every managed port, so a previous run that
 *     was `kill -9`'d (agent timeouts, closed terminals) can never block this
 *     one. Leaks cannot accumulate.
 *  2. **Start** — emulators and the Angular dev server are started in parallel,
 *     each `detached` in its own process group so this process controls their
 *     shutdown ordering instead of inheriting Playwright's blunt group kill.
 *  3. **Ready** — resolves only once every managed port accepts connections; if
 *     a child dies first, it prints the tail of that child's log and exits
 *     non-zero so Playwright fails fast instead of waiting out its timeout.
 *  4. **Shutdown** — SIGINT to the Firebase CLI (the signal it cleans up on),
 *     wait for it to exit, then stop the app server, then sweep the ports as a
 *     last resort. Runs on SIGINT/SIGTERM/SIGHUP and if this process is
 *     orphaned (parent killed), so no exit path leaves a stray listener.
 *
 * Child output goes to log files rather than stdout: an interleaved emulator +
 * webpack firehose is unreadable for humans and burns an agent's context. Only
 * a one-line ready banner (and, on failure, the relevant log tail) is printed.
 *
 * Env overrides: `E2E_APP_PORT`, `E2E_FIREBASE_PROJECT`, `E2E_STARTUP_TIMEOUT`,
 * `E2E_NO_PORT_CLEANUP=1` (fail instead of killing pre-flight port squatters).
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(scriptDir, '..', '..', '..', '..');

/** Emulators the suite needs. `hosting` is deliberately excluded — the specs run against the dev server. */
const EMULATORS = ['firestore', 'auth', 'functions'];

/**
 * Ports the Firebase CLI opens alongside the emulators themselves (UI, hub,
 * logging, the Firestore websocket channel). Nothing waits on them, but they
 * must be swept: `emulators:start` refuses to boot when any of them is taken,
 * so one leftover here would block every subsequent run.
 */
const AUXILIARY_PORTS = [
  { name: 'emulator ui', port: 4000, configKey: 'ui' },
  { name: 'emulator hub', port: 4400, configKey: 'hub' },
  { name: 'emulator logging', port: 4500, configKey: 'logging' },
  { name: 'firestore websocket', port: 9150, configKey: undefined },
];
const PROJECT_ID = process.env['E2E_FIREBASE_PROJECT'] ?? 'du-ministry-maps';
const APP_PORT = Number(process.env['E2E_APP_PORT'] ?? 4200);
const STARTUP_TIMEOUT_MS = Number(process.env['E2E_STARTUP_TIMEOUT'] ?? 180_000);

/** The Firebase CLI needs a generous window: it stops the JARs and waits for their ports to be released. */
const EMULATOR_SHUTDOWN_TIMEOUT_MS = 20_000;
const APP_SHUTDOWN_TIMEOUT_MS = 10_000;

const LOG_DIR = join(workspaceRoot, 'dist', '.playwright', 'apps', 'ministry-maps', 'logs');
const E2E_FIREBASE_CONFIG_PATH = join(workspaceRoot, 'firebase.e2e.json');

const log = (message) => console.log(`[e2e-servers] ${message}`);

/* -------------------------------------------------------------------------- */
/* Ports                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Emulator ports come from `firebase.json` — the file the emulators actually
 * bind from — so this script can never drift out of sync with them.
 */
function readFirebaseConfig() {
  return JSON.parse(readFileSync(join(workspaceRoot, 'firebase.json'), 'utf8'));
}

const firebaseConfig = readFirebaseConfig();

/**
 * Keep the normal developer config (and its Emulator UI) intact, but disable
 * the UI for this unattended stack. Firebase CLI has no `--no-ui` flag; an
 * invocation-only config is the supported way to opt out.
 */
function writeE2EFirebaseConfig() {
  const e2eConfig = {
    ...firebaseConfig,
    emulators: {
      ...firebaseConfig.emulators,
      ui: { ...firebaseConfig.emulators?.ui, enabled: false },
    },
  };

  writeFileSync(E2E_FIREBASE_CONFIG_PATH, `${JSON.stringify(e2eConfig, null, 2)}\n`);
}

function removeE2EFirebaseConfig() {
  try {
    unlinkSync(E2E_FIREBASE_CONFIG_PATH);
  } catch {
    /* already removed, or the run failed before it was created */
  }
}

/** Ports the run cannot start without — each one is waited on before declaring the stack ready. */
const requiredPorts = [
  ...EMULATORS.map((name) => {
    const port = firebaseConfig.emulators?.[name]?.port;

    if (typeof port !== 'number') {
      throw new Error(
        `firebase.json has no "emulators.${name}.port". Add it, or drop "${name}" from EMULATORS in ${relative(
          workspaceRoot,
          fileURLToPath(import.meta.url)
        )}.`
      );
    }

    return { name, port };
  }),
  { name: 'angular dev-server', port: APP_PORT },
];

/** Everything this script is responsible for freeing — required plus the CLI's own side ports. */
const managedPorts = [
  ...requiredPorts,
  ...AUXILIARY_PORTS.map(({ name, port, configKey }) => ({
    name,
    port: (configKey && firebaseConfig.emulators?.[configKey]?.port) || port,
  })),
];

function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const settle = (listening) => {
      socket.destroy();
      resolve(listening);
    };

    socket.setTimeout(500);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
  });
}

/** Best-effort PID lookup for a listening port. Returns `[]` when no supported tool is available. */
function pidsOnPort(port) {
  const lsof = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });

  if (lsof.status === 0) {
    return lsof.stdout
      .split('\n')
      .map((pid) => Number(pid.trim()))
      .filter(Boolean);
  }

  const fuser = spawnSync('fuser', [`${port}/tcp`], { encoding: 'utf8' });

  if (fuser.status === 0) {
    return fuser.stdout
      .split(/\s+/)
      .map((pid) => Number(pid.trim()))
      .filter(Boolean);
  }

  return [];
}

/** SIGKILLs whatever is listening on `port` and waits for the port to actually free up. */
async function freePort(port, label) {
  const pids = pidsOnPort(port);

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone, or not ours to kill */
    }
  }

  if (pids.length > 0) {
    log(`freed port ${port} (${label}) — killed leftover pid(s) ${pids.join(', ')}`);
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    if (!(await isPortListening(port))) {
      return true;
    }
    await delay(250);
  }

  return false;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/* Child processes                                                             */
/* -------------------------------------------------------------------------- */

/** @type {{ label: string, child: import('node:child_process').ChildProcess, logPath: string, exited: boolean, code: number | null }[]} */
const children = [];

function resolveBin(name) {
  const local = join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);

  if (existsSync(local)) {
    return local;
  }

  throw new Error(
    `Could not find "${name}" in node_modules/.bin. Run \`npm ci --legacy-peer-deps\` from the workspace root.`
  );
}

function start(label, command, args) {
  const logPath = join(LOG_DIR, `${label}.log`);
  const fd = openSync(logPath, 'w');

  const child = spawn(command, args, {
    cwd: workspaceRoot,
    // Own process group: this supervisor decides how and in which order these
    // die, instead of being caught by whatever group-kill Playwright issues.
    detached: true,
    stdio: ['ignore', fd, fd],
    env: { ...process.env, FORCE_COLOR: '0', NX_TUI: 'false' },
  });

  const entry = { label, child, logPath, exited: false, code: null };

  child.on('exit', (code) => {
    entry.exited = true;
    entry.code = code;
  });

  children.push(entry);

  return entry;
}

function logTail(entry, lines = 30) {
  try {
    return readFileSync(entry.logPath, 'utf8').split('\n').slice(-lines).join('\n');
  } catch {
    return '(no output captured)';
  }
}

/** Signals the child's whole process group, then escalates to SIGKILL if it outstays `timeoutMs`. */
async function stop(entry, signal, timeoutMs) {
  if (entry.exited || entry.child.pid === undefined) {
    return;
  }

  const killGroup = (sig) => {
    try {
      process.kill(-entry.child.pid, sig);
    } catch {
      /* group already reaped */
    }
  };

  killGroup(signal);

  const deadline = Date.now() + timeoutMs;

  while (!entry.exited && Date.now() < deadline) {
    await delay(100);
  }

  if (!entry.exited) {
    log(`${entry.label} ignored ${signal} after ${timeoutMs}ms — sending SIGKILL`);
    killGroup('SIGKILL');
    await delay(500);
  }
}

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                   */
/* -------------------------------------------------------------------------- */

let shuttingDown = false;
let watchdog;

async function shutdown(reason, exitCode) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  clearInterval(watchdog);

  log(`shutting down (${reason})`);

  const [emulators, app] = children;

  // Emulators first, and with SIGINT: it is the only signal the Firebase CLI
  // cleans up on, and its cleanup is what stops the detached emulator JARs.
  if (emulators) {
    await stop(emulators, 'SIGINT', EMULATOR_SHUTDOWN_TIMEOUT_MS);
  }
  if (app) {
    await stop(app, 'SIGTERM', APP_SHUTDOWN_TIMEOUT_MS);
  }

  // Last resort: anything still holding a managed port (a JAR that escaped its
  // parent, a dev-server worker) goes now, so the next run starts clean.
  for (const { name, port } of managedPorts) {
    if (await isPortListening(port)) {
      await freePort(port, name);
    }
  }

  log('all servers stopped, ports released');
  process.exit(exitCode);
}

async function waitUntilReady() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  const pending = new Map(requiredPorts.map(({ name, port }) => [port, name]));

  while (pending.size > 0) {
    const dead = children.find((entry) => entry.exited);

    if (dead) {
      throw new Error(
        `${dead.label} exited with code ${dead.code} before the servers were ready.\n` +
          `--- tail of ${relative(workspaceRoot, dead.logPath)} ---\n${logTail(dead)}`
      );
    }

    if (Date.now() > deadline) {
      const missing = [...pending].map(([port, name]) => `${name} (:${port})`).join(', ');

      throw new Error(
        `Timed out after ${STARTUP_TIMEOUT_MS}ms waiting for: ${missing}.\n` +
          `Check the logs in ${relative(workspaceRoot, LOG_DIR)}.`
      );
    }

    for (const [port, name] of pending) {
      if (await isPortListening(port)) {
        pending.delete(port);
        log(`${name} is up on :${port}`);
      }
    }

    if (pending.size > 0) {
      await delay(300);
    }
  }
}

async function main() {
  mkdirSync(LOG_DIR, { recursive: true });

  for (const { name, port } of managedPorts) {
    if (!(await isPortListening(port))) {
      continue;
    }

    if (process.env['E2E_NO_PORT_CLEANUP'] === '1') {
      throw new Error(
        `Port ${port} (${name}) is already in use and E2E_NO_PORT_CLEANUP=1. ` +
          `Stop that process, or set E2E_REUSE_SERVERS=1 to run the specs against the stack you already have.`
      );
    }

    if (!(await freePort(port, name))) {
      throw new Error(`Port ${port} (${name}) is still in use after SIGKILL — free it manually and retry.`);
    }
  }

  log(`starting emulators (${EMULATORS.join(', ')}) and the ministry-maps dev server…`);
  writeE2EFirebaseConfig();

  start('emulators', resolveBin('firebase'), [
    'emulators:start',
    '--only',
    EMULATORS.join(','),
    '--project',
    PROJECT_ID,
    '--config',
    E2E_FIREBASE_CONFIG_PATH,
  ]);
  start('app', resolveBin('nx'), ['serve', 'ministry-maps', '--port', String(APP_PORT)]);

  await waitUntilReady();

  log(`ready — app on http://localhost:${APP_PORT}, logs in ${relative(workspaceRoot, LOG_DIR)}`);

  // A server dying mid-run must fail the run instead of leaving Playwright to
  // time out one spec at a time; being orphaned (parent killed) must still
  // trigger the emulator cleanup, since nobody else can do it for us.
  const parentPid = process.ppid;

  watchdog = setInterval(() => {
    const dead = children.find((entry) => entry.exited);

    if (dead) {
      log(`${dead.label} exited unexpectedly with code ${dead.code}:\n${logTail(dead, 20)}`);
      void shutdown(`${dead.label} died`, 1);
      return;
    }

    if (process.ppid !== parentPid) {
      void shutdown('parent process is gone', 1);
    }
  }, 1000);
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => void shutdown(signal, 0));
}

// Synchronous belt-and-braces: `process.exit()` skips the async shutdown above.
process.on('exit', () => {
  removeE2EFirebaseConfig();

  for (const { child } of children) {
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
  }
});

main().catch(async (error) => {
  console.error(`[e2e-servers] ${error.message}`);
  await shutdown('startup failed', 1);
});
