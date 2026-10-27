import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

/**
 * Browsers exercised locally. CI runs chromium only: the suite is ~480 tests,
 * and running all six projects serially on a single runner took over six hours
 * and got killed by the GitHub Actions job limit. Run the full matrix locally
 * (or via the `e2e-full` workflow_dispatch) with `npx playwright test`.
 */
const allProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'edge', use: { ...devices['Desktop Edge'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
]

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // GitHub-hosted runners have 4 cores. One worker per test file is plenty and
  // keeps concurrent writes against the single test database manageable.
  workers: isCI ? 2 : undefined,
  // Cap the whole run so a systemic failure surfaces as a red build in minutes
  // instead of burning the job's six-hour ceiling. A healthy chromium run takes
  // roughly 7 minutes; the cap leaves room for one retry of every spec plus
  // slow database-backed workflows.
  globalTimeout: isCI ? 45 * 60 * 1000 : undefined,
  timeout: 45 * 1000,
  expect: { timeout: 10 * 1000 },
  // 'line' keeps CI logs readable; the HTML report is uploaded as an artifact.
  // `open: 'never'` stops the reporter from starting a blocking preview server.
  reporter: isCI ? [['line'], ['html', { open: 'never' }]] : [['html', { open: 'on-failure' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: isCI ? allProjects.filter((p) => p.name === 'chromium') : allProjects,
  webServer: {
    // A dev server recompiles every route on first request, which blew the
    // per-test timeout repeatedly in CI. CI builds first and serves the
    // production output instead.
    command: isCI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
})
