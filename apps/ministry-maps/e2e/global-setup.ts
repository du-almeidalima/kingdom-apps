import { AUTH_EMULATOR_HOST, EMULATOR_CONFIG, FIRESTORE_EMULATOR_HOST } from './config/emulator.config';

/**
 * Gate the suite on the emulators actually being reachable.
 *
 * Playwright only knows how to wait for the `webServer` `url` (the Angular dev
 * server). The emulators boot in parallel with it, so without this gate the
 * first spec can start against a half-booted stack and fail deep inside a
 * fixture with an opaque Admin SDK error. Failing here instead turns that class
 * of flake into one actionable message, before a single test runs.
 *
 * It also covers the `E2E_REUSE_SERVERS=1` path, where the stack was started by
 * hand and may simply not include every emulator the suite needs.
 */

/** Emulators the fixtures talk to, as `host:port` pairs. Derived from the suite's single source of truth. */
const REQUIRED_EMULATORS = [
  { name: 'Firestore', hostPort: FIRESTORE_EMULATOR_HOST },
  { name: 'Auth', hostPort: AUTH_EMULATOR_HOST },
  {
    name: 'Functions',
    hostPort: `${EMULATOR_CONFIG.functions.host}:${EMULATOR_CONFIG.functions.port}`,
  },
];

const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves as soon as the emulator answers *anything* over HTTP — the status
 * code is irrelevant, a response at all proves the port is serving rather than
 * merely bound.
 */
async function waitForEmulator(name: string, hostPort: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = 'no response';

  while (Date.now() < deadline) {
    try {
      await fetch(`http://${hostPort}/`, { signal: AbortSignal.timeout(2_000) });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await delay(POLL_INTERVAL_MS);
    }
  }

  throw new Error(
    `The ${name} emulator never answered on http://${hostPort} within ${READY_TIMEOUT_MS}ms (last error: ${lastError}).\n` +
      `Confirm the port matches firebase.json and e2e/config/emulator.config.ts, and check ` +
      `dist/.playwright/apps/ministry-maps/logs/emulators.log for why it failed to boot.`,
  );
}

export default async function globalSetup(): Promise<void> {
  await Promise.all(REQUIRED_EMULATORS.map(({ name, hostPort }) => waitForEmulator(name, hostPort)));
}
