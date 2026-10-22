// Checks the emulators before any test runs: both answer, the database rules
// from firebase.json are in force in the namespace the app uses, and the data
// can be reset to the fixture. Each test resets the data again (see test.js).
import { assertRulesEnforced, loadRules, resetEmulators, waitForEmulators } from './emulator.js';
import { fixture } from './fixture.js';

export default async function globalSetup() {
    await waitForEmulators();
    await loadRules();
    await assertRulesEnforced();
    await resetEmulators(fixture);
}
