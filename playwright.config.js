// End-to-end tests: a test-mode build (in dist-e2e/, never the dist/ that
// Hosting publishes) served with the production headers (scripts/serve-dist.mjs)
// against the Firebase emulators, which run under a demo- project id so they
// need no credentials or network. Locally, emulators that are already running
// are reused, and so is a server already on APP_PORT, which global setup checks
// is serving the test build; otherwise the build is made afresh.
import { defineConfig, devices } from '@playwright/test';
import { APP_PORT } from './tests/e2e/app-server.js';
import { PROJECT_ID } from './tests/e2e/emulator.js';

const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: false,
    // One worker: the tests share the emulators and each one resets their data.
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
    globalSetup: './tests/e2e/global-setup.js',
    timeout: 90_000,
    expect: { timeout: 10_000 },
    use: {
        baseURL: `http://127.0.0.1:${APP_PORT}`,
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
            command: `npx firebase emulators:start --only database,auth --project ${PROJECT_ID}`,
            // The Auth emulator starts after the database one; global setup waits for both
            // and checks that the rules from firebase.json cover the app's namespace.
            url: 'http://127.0.0.1:9099',
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
            // firebase-tools reports start-up problems (no Java, a busy port) on stdout.
            stdout: process.env.CI ? 'pipe' : 'ignore',
            stderr: 'pipe',
        },
        {
            command: `npm run build:test && node scripts/serve-dist.mjs --emulators --dir dist-e2e --port ${APP_PORT}`,
            url: `http://127.0.0.1:${APP_PORT}/404.html`,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
        },
    ],
});
