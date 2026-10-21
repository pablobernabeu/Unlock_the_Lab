// End-to-end tests: a test-mode build served with the production headers
// (scripts/serve-dist.mjs) against the Firebase emulators. Locally, already
// running emulators and servers are reused.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: false,
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    globalSetup: './tests/e2e/global-setup.js',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
        },
    ],
    webServer: [
        {
            command:
                'npx firebase emulators:start --only database,auth --project unlock-the-lab-workshop',
            url: 'http://127.0.0.1:9099',
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
        },
        {
            command: `npm run build:test && node scripts/serve-dist.mjs --emulators --port ${PORT}`,
            url: `http://127.0.0.1:${PORT}/404.html`,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
        },
    ],
});
