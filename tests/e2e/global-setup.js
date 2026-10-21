// Resets the emulators to the synthetic fixture before the end-to-end run.
import { fixture } from './fixture.js';
import { resetAccounts, resetDatabase } from './emulator.js';

export default async function globalSetup() {
    const adminUid = await resetAccounts();
    await resetDatabase(fixture, adminUid);
}
