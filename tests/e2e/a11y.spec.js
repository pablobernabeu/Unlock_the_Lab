// axe (WCAG 2.0, 2.1 and 2.2 A and AA rules) on every view of the three
// pages and the 404 page, on a desktop and a phone-sized screen.
import { ADMIN, readPath, SERVER_TIMESTAMP, writePath } from './emulator.js';
import { LEGACY_NAME, LEGACY_SESSION, SHARED_NAME } from './fixture.js';
import {
    allocateTokens,
    expectNoAxeViolations,
    rateStudies,
    rateWithMouse,
    savedState,
    startWorkshop,
} from './helpers.js';
import { expect, test } from './test.js';

test('the axe check reports a violation it is shown', async ({ page }) => {
    await page.goto('/robots.txt');
    await page.setContent(
        '<!doctype html><html lang="en"><title>Canary</title><main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></html>'
    );
    await expect(expectNoAxeViolations(page, 'canary')).rejects.toThrow(/image-alt/);
});

for (const width of [1280, 360]) {
    test.describe(`at ${width} px`, () => {
        test.use({ viewport: { width, height: 800 } });

        test('the participant app has no axe violations', async ({ page }) => {
            await page.goto('/');
            await expect(page.locator('#view-welcome')).toBeVisible();
            await expectNoAxeViolations(page, 'welcome');

            await page.getByRole('button', { name: 'Get started' }).click();
            await expect(page.locator('#view-guide')).toBeVisible();
            await expect(page.locator('#guide-rubric')).not.toBeEmpty();
            await expectNoAxeViolations(page, 'guide');

            await page.getByRole('button', { name: 'Start rating studies' }).click();
            await expect(page.locator('.answers')).toBeVisible();
            await expectNoAxeViolations(page, 'study');

            await page.getByRole('button', { name: 'Glossary and rubric' }).click();
            const help = page.getByRole('dialog', { name: 'Glossary and rubric' });
            await expect(help).toBeVisible();
            await expectNoAxeViolations(page, 'help dialog, glossary');
            await help.getByRole('tab', { name: 'Rubric' }).click();
            await expect(help.getByRole('tabpanel')).toBeVisible();
            await expectNoAxeViolations(page, 'help dialog, rubric');
            await page.keyboard.press('Escape');
            await expect(help).toBeHidden();

            await rateWithMouse(page, { prediction: 4, rating: 4 });
            await expectNoAxeViolations(page, 'feedback');
            await page.getByRole('button', { name: 'Next study' }).click();
            await rateStudies(page, 9);

            await page.getByRole('button', { name: 'Finish and see my results' }).click();
            await expect(page.getByRole('dialog', { name: 'Finish now?' })).toBeVisible();
            await expectNoAxeViolations(page, 'finish dialog');
            await page
                .getByRole('dialog')
                .getByRole('button', { name: 'Finish', exact: true })
                .click();
            await expect(page.locator('#view-weights')).toBeVisible();
            await expectNoAxeViolations(page, 'weights');

            await allocateTokens(page);
            await expect(page.locator('.results-board table')).toBeVisible();
            await expect(page.locator('.chart-box canvas')).toBeVisible();
            await expectNoAxeViolations(page, 'results');
            // The data table behind the chart and one study's feedback, opened.
            for (const summary of await page
                .locator('.results-details > summary')
                .all()
                .then((all) => all.slice(0, 2))) {
                await summary.click();
            }
            await expectNoAxeViolations(page, 'results, details open');
        });

        test('the read-only results have no axe violations', async ({ page }) => {
            await page.goto(`/?session=${LEGACY_SESSION}`);
            await expect(
                page.getByRole('heading', { level: 1, name: `Results for ${LEGACY_NAME}` })
            ).toBeVisible();
            await expect(page.locator('.results-board table')).toBeVisible();
            await expect(page.locator('.chart-box canvas')).toBeVisible();
            await expectNoAxeViolations(page, 'read-only results');
        });

        test('the nickname chooser and a closed session have no axe violations', async ({
            page,
        }) => {
            await page.goto(`/?session=${encodeURIComponent(SHARED_NAME)}`);
            await expect(
                page.getByRole('heading', { level: 1, name: 'Choose the results' })
            ).toBeVisible();
            await expectNoAxeViolations(page, 'nickname chooser');

            await startWorkshop(page);
            const { sessionId } = await savedState(page);
            await expect.poll(() => readPath(`active/${sessionId}`)).not.toBeNull();
            await writePath('control/sessionsEndedAt', SERVER_TIMESTAMP);
            await expect(
                page.getByRole('heading', {
                    level: 1,
                    name: 'The facilitator has closed this session',
                })
            ).toBeVisible();
            await expectNoAxeViolations(page, 'closed session');
        });

        test.describe('404', () => {
            // The browser logs the page's own 404 status as a console error.
            test.use({ allowedConsoleErrors: [/the server responded with a status of 404/] });

            test('the 404 page has no axe violations', async ({ page }) => {
                const response = await page.goto('/no-such-page');
                expect(response.status()).toBe(404);
                await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
                await expect(page.getByRole('link', { name: /workshop/i }).first()).toBeVisible();
                await expectNoAxeViolations(page, '404');
            });
        });

        test('the dashboard has no axe violations', async ({ page }) => {
            await page.goto('/dashboard.html');
            await expect(page.locator('[data-stats-rows] tr')).toHaveCount(48);
            await expect(page.locator('[data-leaderboard-rows] tr').first()).toBeVisible();
            await expectNoAxeViolations(page, 'dashboard');

            const button = page.locator('[data-stats-rows] tr[data-key="STUDY-3"] button');
            await button.click();
            await expect(page.locator('dialog[data-study-dialog]')).toBeVisible();
            await expectNoAxeViolations(page, 'dashboard study dialog');
        });

        test('the facilitator panel has no axe violations', async ({ page }) => {
            await page.goto('/admin.html');
            await expect(page.getByLabel('Email address')).toBeVisible();
            await expectNoAxeViolations(page, 'admin sign-in');

            await page.getByLabel('Email address').fill(ADMIN.email);
            await page.getByLabel('Password').fill(ADMIN.password);
            await page.getByRole('button', { name: 'Sign in' }).click();
            await expect(page.locator('[data-panel]')).toBeVisible();
            await expect(page.locator('[data-stat="ratings"]')).not.toHaveText('–');
            await expectNoAxeViolations(page, 'admin panel');

            await page.getByLabel('Room code').fill('AXE-1');
            await page.getByRole('button', { name: 'Make links' }).click();
            await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
            await expectNoAxeViolations(page, 'admin panel with room links');
            expect(await readPath('control')).toBeNull();
        });
    });
}
