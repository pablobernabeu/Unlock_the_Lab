// The Content Security Policy. Every spec fails on a CSP violation or a
// console error (see test.js); these tests check that the pages are really
// served with the production policy, that the watchers catch what they
// should, and that each page, with its lazily loaded parts, stays within the
// policy.
import { readFileSync } from 'node:fs';
import { ADMIN } from './emulator.js';
import { LEGACY_SESSION } from './fixture.js';
import { rateWithMouse, startWorkshop } from './helpers.js';
import { expect, test } from './test.js';

const hosting = JSON.parse(
    readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8')
).hosting;
const productionHeaders = Object.fromEntries(
    hosting.headers
        .find(({ source }) => source === '**')
        .headers.map(({ key, value }) => [key.toLowerCase(), value])
);

function directives(policy) {
    return Object.fromEntries(
        policy
            .split(';')
            .map((part) => part.trim().split(/\s+/))
            .filter(([name]) => name)
            .map(([name, ...sources]) => [name, sources])
    );
}

test('every page is served with the production security headers', async ({ request }) => {
    const production = directives(productionHeaders['content-security-policy']);
    // '/%E0%A4%A' is a malformed escape: the server must answer it (404) and keep serving.
    const paths = [
        '/',
        '/dashboard.html',
        '/admin.html',
        '/no-such-page',
        '/%E0%A4%A',
        '/robots.txt',
    ];
    for (const path of paths) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(/^\/(no-such-page|%)/.test(path) ? 404 : 200);
        const headers = response.headers();
        for (const name of ['x-content-type-options', 'referrer-policy', 'permissions-policy']) {
            expect(headers[name], `${name} on ${path}`).toBe(productionHeaders[name]);
        }
        // The test server may only add the local emulators to the production policy.
        const served = directives(headers['content-security-policy']);
        expect(Object.keys(served).sort()).toEqual(Object.keys(production).sort());
        for (const [name, sources] of Object.entries(served)) {
            const extra = sources.filter((source) => !production[name].includes(source));
            expect(production[name].every((source) => sources.includes(source))).toBe(true);
            for (const source of extra)
                expect(source).toMatch(/^(https?|wss?):\/\/127\.0\.0\.1:9\d{3}$/);
        }
        expect(served['script-src']).not.toContain("'unsafe-inline'");
    }
});

test('the watchers catch a CSP violation and a console error', async ({ page, problems }) => {
    await page.goto('/');
    await expect(page.locator('#view-welcome')).toBeVisible();
    const ran = await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = 'window.inlineScriptRan = true;';
        document.body.append(script);
        console.error('deliberate test error');
        return window.inlineScriptRan === true;
    });
    expect(ran, 'the policy blocks inline scripts').toBe(false);
    await expect
        .poll(() =>
            problems.some((problem) => problem.includes('securitypolicyviolation: script-src'))
        )
        .toBe(true);
    expect(problems.some((problem) => problem.includes('deliberate test error'))).toBe(true);
    // Both were deliberate: clear them so the test itself passes.
    problems.length = 0;
});

test('each page and its lazily loaded parts stay within the policy', async ({ page }) => {
    // Participant app: sign-in, presence, the help dialog and the results chart chunk.
    await startWorkshop(page);
    await page.getByRole('button', { name: 'Glossary and rubric' }).click();
    await page.keyboard.press('Escape');
    await rateWithMouse(page, { prediction: 4, rating: 4 });

    await page.goto(`/?session=${LEGACY_SESSION}`);
    await expect(page.locator('.chart-box canvas')).toBeVisible();

    // Dashboard: live listeners and the chart.
    await page.goto('/dashboard.html');
    await expect(page.locator('[data-stats-rows] tr')).toHaveCount(48);
    await expect(page.locator('[data-chart-canvas]')).toBeVisible();
    await expect(page.locator('[data-chart-summary]')).not.toBeEmpty();

    // Admin: password sign-in on the second app and the QR code chunk (a data: image).
    await page.goto('/admin.html');
    await page.getByLabel('Email address').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByLabel('Room code').fill('CSP-1');
    await page.getByRole('button', { name: 'Make links' }).click();
    await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
    await page.waitForLoadState('networkidle');
});
