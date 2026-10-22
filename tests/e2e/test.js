// The Playwright `test` every spec uses. Each test starts from the fixture
// data (see resetEmulators) and fails if any page in it logs a console error,
// throws an uncaught exception or violates the Content Security Policy.
import { test as base, expect } from '@playwright/test';
import { resetEmulators } from './emulator.js';
import { fixture } from './fixture.js';

export { expect };

const CSP_PREFIX = '[e2e] securitypolicyviolation:';

/** Runs in every page before its own scripts: reports CSP violations to the console. */
function watchViolations(prefix) {
    document.addEventListener('securitypolicyviolation', (event) => {
        console.error(
            `${prefix} ${event.violatedDirective} blocked ${event.blockedURI || '(inline)'} ` +
                `in ${event.sourceFile || event.documentURI}:${event.lineNumber}`
        );
    });
}

export const test = base.extend({
    /** Console errors a test expects, as regular expressions (none by default). */
    allowedConsoleErrors: [[], { option: true }],

    /** Accounts and data reset to the fixture before the test; gives the admin's uid. */
    accounts: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            await use(await resetEmulators(fixture));
        },
        { auto: true },
    ],

    /** Console errors, page errors and CSP violations seen during the test. */
    problems: [
        async ({ context, allowedConsoleErrors }, use) => {
            const problems = [];
            await context.addInitScript(watchViolations, CSP_PREFIX);
            context.on('console', (message) => {
                if (message.type() !== 'error') return;
                const text = message.text();
                const where = message.location()?.url ?? '';
                if (
                    !text.startsWith(CSP_PREFIX) &&
                    allowedConsoleErrors.some((re) => re.test(text))
                )
                    return;
                problems.push(`console error: ${text}${where ? ` (${where})` : ''}`);
            });
            context.on('weberror', (error) => {
                problems.push(`page error: ${error.error().message}`);
            });
            await use(problems);
            expect(problems, 'console errors and CSP violations').toEqual([]);
        },
        { auto: true },
    ],
});
