import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a running stack (API on :4000 with DEMO_MODE=true, web on :3000).
 * Locally run `pnpm dev` first; the webServer entries reuse already-running servers.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    extraHTTPHeaders: { 'x-e2e-key': process.env.E2E_BYPASS_KEY ?? 'local-e2e' },
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @mersal/api start',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: true,
      cwd: '../..',
    },
    { command: 'pnpm start', url: 'http://localhost:3000/en', reuseExistingServer: true },
  ],
});
