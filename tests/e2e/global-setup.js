// Checks before any test runs: the app server serves the test build (not a
// production one), both emulators answer, the Auth emulator runs for the test
// build's project, the database rules from firebase.json are in force in the
// namespace the app uses, and the data can be reset to the fixture. Each test
// resets the data again (see test.js).
import { assertTestBuildServed } from './app-server.js';
import {
    assertAuthProject,
    assertRulesEnforced,
    loadRules,
    NAMESPACE,
    resetEmulators,
    waitForEmulators,
} from './emulator.js';
import { fixture } from './fixture.js';

export default async function globalSetup() {
    await assertTestBuildServed();
    await waitForEmulators();
    await assertAuthProject();
    if (process.env.CI) {
        // In CI the emulators were just started from firebase.json (playwright.config.js), so
        // its rules must already cover the namespace the app uses, as they do for `npm run dev`.
        await assertRulesEnforced({
            timeoutMs: 30_000,
            hint: `firebase.json does not give the database rules to ${NAMESPACE}`,
        });
    }
    await loadRules();
    await assertRulesEnforced();
    await resetEmulators(fixture);
}
