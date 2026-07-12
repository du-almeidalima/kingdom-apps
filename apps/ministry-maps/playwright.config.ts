import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * `retries`/`reporter`/`forbidOnly` are already set by `nxE2EPreset` (CI-aware
 * defaults) — no need to override them here.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './e2e' }),
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
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx firebase emulators:exec "npx nx serve ministry-maps" --project du-ministry-maps',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
    // Emulators + Angular compile might take a moment
    timeout: 120000,
  },
  projects: [
    // Browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
