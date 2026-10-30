// The browser's Back and Forward buttons inside the workshop: they move
// between the views by the app's own rules, and where a move is not allowed
// the view stays and a polite status message says why.
import { SERVER_TIMESTAMP, writePath } from './emulator.js';
import {
    allocateTokens,
    expectNoAxeViolations,
    finishEarly,
    rateStudies,
    rateWithMouse,
    readFeedback,
    savedState,
    startWorkshop,
    STUDY_COUNT,
} from './helpers.js';
import { expect, test } from './test.js';

const historyLength = (page) => page.evaluate(() => history.length);

/** The status message that explains a refused Back or Forward. */
async function expectRefusal(page, text) {
    const toast = page.locator('.toast').filter({ hasText: text });
    await expect(toast).toBeVisible();
    await expect(page.locator('.toast-region')).toHaveAttribute('aria-live', 'polite');
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('Back and Forward move between the welcome page and the guide, and a reload adds no entry', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Before you begin' })).toBeVisible();
    const length = await historyLength(page);

    await page.goBack();
    await expect(page.locator('#view-welcome')).toBeVisible();
    await expect(page.locator('#view-welcome h1')).toBeFocused();
    await expect(page).toHaveTitle('Welcome – Unlock the Lab');

    await page.goForward();
    const guideHeading = page.getByRole('heading', { level: 1, name: 'Before you begin' });
    await expect(guideHeading).toBeFocused();
    await expect(page).toHaveTitle('Before you begin – Unlock the Lab');

    await page.reload();
    await expect(guideHeading).toBeVisible();
    expect(await historyLength(page)).toBe(length);
    await page.goBack();
    await expect(page.locator('#view-welcome')).toBeVisible();
    expect((await savedState(page)).currentPage).toBe(0);
});

test('on a study page, Back takes the one-time step back once and never leaves the studies', async ({
    page,
}) => {
    await startWorkshop(page);
    const firstTitle = await page.locator('#study-title').textContent();

    // There is no study before the first one, and the guide is not a study.
    await page.goBack();
    await expectRefusal(page, 'There is no study before this one.');
    await expect(page.locator('#study-title')).toHaveText(firstTitle);
    await expect(page.locator('#view-guide')).toBeHidden();

    await rateWithMouse(page, { prediction: 4, rating: 4 });
    const first = await readFeedback(page);
    await page.getByRole('button', { name: 'Next study' }).click();
    await expect(page.locator('.study__progress')).toHaveText(`Study 2 of ${STUDY_COUNT}`);
    const secondTitle = await page.locator('#study-title').textContent();

    // Back is the in-app 'Back to the previous study': once only.
    await page.goBack();
    await expect(page.locator('.study__progress')).toHaveText(`Study 1 of ${STUDY_COUNT}`);
    await expect(page.locator('#feedback-heading')).toHaveText(
        `Your score: ${first.score} out of 100`
    );
    await expect(page.locator('#study-title')).toBeFocused();
    await expect(page).toHaveTitle(`Study 1 of ${STUDY_COUNT} – Unlock the Lab`);
    expect((await savedState(page)).hasUsedBackButton).toBe(true);

    // Forward passes only answered studies: study 1 is answered.
    await page.goForward();
    await expect(page.locator('#study-title')).toHaveText(secondTitle);
    await expect(page.locator('.answers')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to the previous study' })).toHaveCount(0);

    await page.goBack();
    await expectRefusal(page, 'You have already gone back once');
    await expect(page.locator('#study-title')).toHaveText(secondTitle);
    await expectNoAxeViolations(page, 'a study with a message about Back');

    // Several entries at once (the long-press menu): the browser goes there and comes back.
    await page.evaluate(() => {
        window.moves = [];
        window.addEventListener('popstate', (event) => window.moves.push(event.state.page));
        history.go(-3);
    });
    await expect.poll(() => page.evaluate(() => window.moves)).toEqual([0, 3]);
    await expect(page.locator('#view-welcome')).toBeHidden();
    await expect(page.locator('#study-title')).toHaveText(secondTitle);
    const state = await savedState(page);
    expect(state.currentPage).toBe(3);
    expect(Object.keys(state.userRatings)).toHaveLength(1);
});

test('from the weights page Back returns to rating, and the results page stays put', async ({
    page,
}) => {
    await startWorkshop(page);
    await rateStudies(page, 10);
    await page.getByRole('button', { name: 'Next study' }).click();
    await expect(page.locator('.study__progress')).toHaveText(`Study 11 of ${STUDY_COUNT}`);
    await finishEarly(page);

    await page.goBack();
    await expect(page.locator('.study__progress')).toHaveText(`Study 11 of ${STUDY_COUNT}`);
    await expect(page.locator('.answers')).toBeVisible();
    // Back to rating is not the one-time step back between studies.
    expect((await savedState(page)).hasUsedBackButton).toBe(false);

    // Forward again: the participant has already chosen to finish.
    await page.goForward();
    await expect(
        page.getByRole('heading', { level: 1, name: 'What matters most to you?' })
    ).toBeVisible();
    await allocateTokens(page);

    await page.goBack();
    await expectRefusal(page, 'You have finished the workshop, so your results stay on this page.');
    await expect(page.getByRole('heading', { level: 1, name: 'Your results' })).toBeVisible();
    expect((await savedState(page)).rankingSubmitted).toBe(true);
});

test('a closed session stays on its closed view', async ({ page }) => {
    await startWorkshop(page);
    await rateWithMouse(page, { prediction: 4, rating: 4 });
    await page.getByRole('button', { name: 'Next study' }).click();
    await writePath('control/sessionsEndedAt', SERVER_TIMESTAMP);
    const closed = page.getByRole('heading', {
        level: 1,
        name: 'The facilitator has closed this session',
    });
    await expect(closed).toBeVisible();

    await page.goBack();
    await expectRefusal(page, 'The facilitator has closed this session, so this page stays');
    await expect(closed).toBeVisible();
    expect((await savedState(page)).hasUsedBackButton).toBe(false);
});
