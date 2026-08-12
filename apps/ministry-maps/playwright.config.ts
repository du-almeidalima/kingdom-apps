import { defineConfig, devices, ReporterDescription } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * `openHtmlReport: 'never'` is load-bearing for unattended runs: the default
 * (`'on-failure'`) makes Playwright serve the report and block until the
 * browser tab is closed, so a failing run never returns to the shell — fatal
 * for CI and for agents, which then wait forever. Read the report afterwards
 * with `nx run ministry-maps:e2e-report`.
 *
 * Everything else the preset gives us (retries/forbidOnly on CI, blob reports
 * on CI, report + artifact paths under `dist/.playwright/…` instead of the repo
 * root) is kept as-is.
 */
const nxPreset = nxE2EPreset(__filename, { testDir: './e2e', openHtmlReport: 'never' });

/**
 * Set `E2E_REUSE_SERVERS=1` to run the specs against a stack you already
 * started yourself (`nx run ministry-maps:e2e-servers`) instead of booting a
 * throwaway one per run — the fast local edit/re-run loop. Off by default so
 * unattended runs always get a known-clean stack.
 */
const reuseExistingServer = process.env['E2E_REUSE_SERVERS'] === '1';

/**
 * `list` streams per-test progress to the terminal; without it the html
 * reporter alone leaves a run completely silent until it ends.
 */
const reporter: ReporterDescription[] = [['list'], ...(nxPreset.reporter as ReporterDescription[])];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxPreset,
  reporter,
  /*
   * Run tests sequentially against the single shared emulator instance so
   * reset+seed stays deterministic. `fullyParallel` is explicit because the nx
   * preset defaults it to `true`, which would otherwise let Playwright run
   * multiple tests within a worker concurrently.
   *
   * Future parallelism path: namespace the emulator `projectId` per worker
   * (`EMULATOR_CONFIG.projectId` + `test.info().workerIndex`) — no fixture
   * rewrite needed, since reset/seed only flows through the database fixture.
   */
  workers: 1,
  fullyParallel: false,
  /*
   * Playwright only waits for the `webServer` `url` (the Angular dev server).
   * This gate additionally proves every emulator is answering before the first
   * spec runs, so a slow/failed emulator boot fails once, loudly, instead of
   * as a wall of confusing fixture errors.
   */
  globalSetup: './e2e/global-setup.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  /*
   * Backs the web-first assertions (`expect(locator).toBeVisible()`, etc.)
   * that replaced the page object's old per-call 15s/10s waits. The 5s
   * default is too tight for dev-server Angular compiles + emulator
   * round-trips.
   */
  expect: { timeout: 10_000 },
  /*
   * One supervisor owns the whole stack (emulators + dev server) — see
   * `e2e/scripts/e2e-servers.mjs` for why Playwright cannot be trusted to stop
   * the emulators itself. It also frees the ports before starting, so a run
   * that was killed outright can never block the next one.
   *
   * `gracefulShutdown` is what lets the supervisor do its ordered teardown:
   * without it Playwright SIGKILLs the group immediately and the Firebase CLI
   * never gets to stop its detached emulator JARs.
   */
  webServer: {
    command: 'node apps/ministry-maps/e2e/scripts/e2e-servers.mjs',
    url: baseURL,
    reuseExistingServer,
    cwd: workspaceRoot,
    // Emulator boot + a cold Angular compile.
    timeout: 180_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 30_000 },
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    // Browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
