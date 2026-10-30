// Coming back to a session: reloads during the workshop (also of a session
// the facilitator has closed), two tabs of one session, a session saved in
// the browser by version 1 of the app, and a saved session whose id now
// belongs to another sign-in.
import studies from '../../src/content/en/studies.json' with { type: 'json' };
import expertRatings from '../../src/content/expert-ratings.json' with { type: 'json' };
import {
    AUTH_USER_KEY,
    persistedAnonymousUser,
    readPath,
    SERVER_TIMESTAMP,
    writePath,
} from './emulator.js';
import { LEGACY_NAME, LEGACY_SESSION, participants, v1StudyOrder } from './fixture.js';
import {
    allocateTokens,
    currentStudy,
    expectNoAxeViolations,
    finishEarly,
    rateWithMouse,
    readFeedback,
    savedState,
    scoreFor,
    startWorkshop,
    STUDY_COUNT,
} from './helpers.js';
import { expect, test } from './test.js';

const LEGACY_UID = participants[LEGACY_SESSION].leaderboard.uid;

/** The localStorage that version 1 of the app left for the fixture's legacy session. */
function v1Storage() {
    const { ratings, leaderboard } = participants[LEGACY_SESSION];
    const ids = Object.keys(ratings);
    const pick = (field) => Object.fromEntries(ids.map((id) => [id, ratings[id][field]]));
    const paperScores = Object.fromEntries(
        ids.map((id) => [id, scoreFor(ratings[id].prediction, expertRatings[id])])
    );
    const state = {
        // v1 page indices: 0 welcome, 1 guide, then the studies; this is the 13th study.
        currentPage: 2 + ids.length,
        userRatings: pick('rating'),
        userPredictions: pick('prediction'),
        paperScores,
        totalScore: leaderboard.score,
        sessionId: LEGACY_SESSION,
        hasUsedBackButton: false,
        celebratedPapers: ids.filter((id) => paperScores[id] >= 90),
        pageDisplayTimestamps: Object.fromEntries(ids.map((id) => [id, ratings[id].timestamp])),
        criterionTokens: { title: 0, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 },
    };
    return { workshopState: JSON.stringify(state), userName: LEGACY_NAME };
}

/** Puts values in the app's localStorage before the app first loads. */
async function seedStorage(page, values) {
    await page.goto('/robots.txt');
    await page.evaluate((entries) => {
        for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, values);
}

async function ratingsOf(sessionId) {
    const all = (await readPath('ratings')) ?? {};
    return Object.fromEntries(
        Object.entries(all)
            .filter(([, node]) => node?.[sessionId])
            .map(([studyId, node]) => [studyId, node[sessionId]])
    );
}

test('reloading mid-study and after submitting keeps the study and the score, counted once', async ({
    page,
}) => {
    await startWorkshop(page);
    const { sessionId } = await savedState(page);

    await rateWithMouse(page, { prediction: 4, rating: 5 });
    const first = await readFeedback(page);
    await page.getByRole('button', { name: 'Next study' }).click();
    const second = await currentStudy(page);
    const shownAt = Date.now();

    // Reload before answering: same study, nothing counted twice, the clock keeps running.
    await page.locator('#prediction-3').check();
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(page.locator('#study-title')).toHaveText(second.title);
    await expect(page.locator('.study__progress')).toHaveText(`Study 2 of ${STUDY_COUNT}`);
    await expect(page.locator('.answers')).toBeVisible();
    await expect(page.locator('#banner-rated')).toHaveText(`1 of ${STUDY_COUNT}`);
    await expect(page.locator('#banner-score')).toHaveText(`${first.score}%`);

    await rateWithMouse(page, { prediction: 3, rating: 2 });
    const secondFeedback = await readFeedback(page);
    const answeredAt = Date.now();
    const total = first.score + secondFeedback.score;
    await expect(page.locator('#banner-rated')).toHaveText(`2 of ${STUDY_COUNT}`);
    await expect
        .poll(() => readPath(`leaderboard/${sessionId}`))
        .toMatchObject({ papersRated: 2, score: total });
    const before = await ratingsOf(sessionId);
    expect(Object.keys(before)).toHaveLength(2);
    // Measured from the first display, not reset by the reload.
    const { responseTime } = before[second.id];
    expect(responseTime).toBeGreaterThanOrEqual(1500);
    expect(responseTime).toBeLessThanOrEqual(answeredAt - shownAt + 1000);

    // Reload after submitting: the same feedback, the same score, still two ratings.
    await page.reload();
    await expect(page.locator('#study-title')).toHaveText(second.title);
    await expect(page.locator('#feedback-heading')).toHaveText(
        `Your score: ${secondFeedback.score} out of 100`
    );
    expect((await readFeedback(page)).targetText).toBe(secondFeedback.targetText);
    await expect(page.locator('.answers')).toHaveCount(0);
    await expect(page.locator('#banner-rated')).toHaveText(`2 of ${STUDY_COUNT}`);
    await expect(page.locator('#banner-score')).toHaveText(`${Math.round(total / 2)}%`);
    // The session reconnects after the reload; give a duplicate write the chance to show.
    await expect(page.locator('#banner-nickname')).not.toBeEmpty();
    await page.waitForTimeout(1500);
    expect(await ratingsOf(sessionId)).toEqual(before);
    expect(await readPath(`leaderboard/${sessionId}`)).toMatchObject({
        papersRated: 2,
        score: total,
    });
    expect(await savedState(page)).toMatchObject({ totalScore: total });
});

test('after a reload, a session the facilitator has closed never offers its study form', async ({
    page,
}) => {
    await startWorkshop(page);
    await rateWithMouse(page, { prediction: 4, rating: 4 });
    await page.getByRole('button', { name: 'Next study' }).click();
    await expect(page.locator('.answers')).toBeVisible();
    await writePath('control/sessionsEndedAt', SERVER_TIMESTAMP);
    const closed = page.getByRole('heading', {
        level: 1,
        name: 'The facilitator has closed this session',
    });
    await expect(closed).toBeVisible();

    // Notes whether the study or its answer form is ever on screen while the page reloads.
    await page.addInitScript(() => {
        window.studyShown = false;
        new MutationObserver(() => {
            if (document.querySelector('#view-study:not([hidden]) :is(input, #study-title)')) {
                window.studyShown = true;
            }
        }).observe(document, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['hidden'],
        });
    });
    await page.reload();
    await expect(closed).toBeVisible();
    await expect(
        page.locator('#view-message').getByRole('button', { name: 'Start as a new participant' })
    ).toBeVisible();
    await expect(page.locator('#footer-new-participant')).toBeVisible();
    expect(await page.evaluate(() => window.studyShown)).toBe(false);
    await expect(page.locator('#view-study input')).toHaveCount(0);
});

test("two tabs of one session show each other's progress and never overwrite it", async ({
    context,
    page,
}) => {
    await startWorkshop(page);
    const { sessionId } = await savedState(page);
    const other = await context.newPage();
    await other.goto('/');
    await expect(other.locator('.study__progress')).toHaveText(`Study 1 of ${STUDY_COUNT}`);
    await expect(other.locator('.answers')).toBeVisible();

    // An answer in the first tab shows up in the second.
    await rateWithMouse(page, { prediction: 4, rating: 5 });
    const first = await readFeedback(page);
    await expect(other.locator('#feedback-heading')).toHaveText(
        `Your score: ${first.score} out of 100`
    );
    await expect(other.locator('#banner-rated')).toHaveText(`1 of ${STUDY_COUNT}`);

    // The second tab moves on and answers the next study; the first follows.
    await other.getByRole('button', { name: 'Next study' }).click();
    await expect(page.locator('.study__progress')).toHaveText(`Study 2 of ${STUDY_COUNT}`);
    await rateWithMouse(other, { prediction: 3, rating: 2 });
    const second = await readFeedback(other);
    await expect(page.locator('#feedback-heading')).toHaveText(
        `Your score: ${second.score} out of 100`
    );

    // Whichever tab saves next, both answers stay.
    await page.getByRole('button', { name: 'Next study' }).click();
    await expect(other.locator('.study__progress')).toHaveText(`Study 3 of ${STUDY_COUNT}`);
    const total = first.score + second.score;
    expect(await savedState(page)).toMatchObject({ currentPage: 4, totalScore: total });
    expect(Object.keys((await savedState(page)).userRatings)).toHaveLength(2);
    await expect(page.locator('#banner-rated')).toHaveText(`2 of ${STUDY_COUNT}`);
    await expect
        .poll(() => readPath(`leaderboard/${sessionId}`))
        .toMatchObject({ papersRated: 2, score: total });
    await other.close();
});

test('a session saved by version 1 resumes on the same page with the same score', async ({
    page,
}) => {
    const user = await persistedAnonymousUser(LEGACY_UID);
    await seedStorage(page, { ...v1Storage(), [AUTH_USER_KEY]: JSON.stringify(user) });
    const { leaderboard, ratings } = participants[LEGACY_SESSION];
    const rated = Object.keys(ratings).length;
    const order = v1StudyOrder(studies, LEGACY_SESSION);

    await page.goto('/');
    await expect(page.locator('.study__progress')).toHaveText(
        `Study ${rated + 1} of ${STUDY_COUNT}`
    );
    await expect(page.locator('#study-title')).toHaveText(order[rated].title);
    await expect(page.locator('.answers')).toBeVisible();
    await expect(page.locator('#banner-rated')).toHaveText(`${rated} of ${STUDY_COUNT}`);
    await expect(page.locator('#banner-score')).toHaveText(
        `${Math.round(leaderboard.score / rated)}%`
    );
    await expect(page.locator('#banner-nickname')).toHaveText(LEGACY_NAME);
    await expect(page.locator('[data-notice="resume"]')).toContainText(
        `You are continuing the session saved in this browser (${LEGACY_NAME}, ${rated} rated).`
    );

    // The v1 session gains its v2 session record, owned by the same anonymous user.
    await expect
        .poll(() => readPath(`sessions/${LEGACY_SESSION}`))
        .toMatchObject({
            uid: LEGACY_UID,
            contentVersion: 2,
            locale: 'en',
            feedbackMode: 'each',
        });

    // The next answer counts on top of the v1 score.
    const study = await currentStudy(page);
    const shownAt = Date.now();
    await rateWithMouse(page, { prediction: 5, rating: 4 });
    const { score } = await readFeedback(page);
    await expect(page.locator('#banner-rated')).toHaveText(`${rated + 1} of ${STUDY_COUNT}`);
    const record = await readPath(`ratings/${study.id}/${LEGACY_SESSION}`);
    expect(record).toMatchObject({ uid: LEGACY_UID, trial: rated + 1, score });
    // Timed from this visit: v1's stored display times are not reused.
    expect(record.responseTime).toBeLessThanOrEqual(Date.now() - shownAt + 1000);
    await expect
        .poll(() => readPath(`leaderboard/${LEGACY_SESSION}`))
        .toMatchObject({
            score: leaderboard.score + score,
            papersRated: rated + 1,
            uid: LEGACY_UID,
            userName: LEGACY_NAME,
        });
    // The earlier v1 ratings are untouched.
    for (const [id, record] of Object.entries(ratings)) {
        expect(await readPath(`ratings/${id}/${LEGACY_SESSION}`)).toEqual(record);
    }
    // The order carries on as version 1 would have shown it, in both directions.
    await page.getByRole('button', { name: 'Back to the previous study' }).click();
    await expect(page.locator('#study-title')).toHaveText(order[rated - 1].title);
    await page.getByRole('button', { name: 'Next study' }).click();
    await page.getByRole('button', { name: 'Next study' }).click();
    await expect(page.locator('#study-title')).toHaveText(order[rated + 1].title);
});

test('weights that version 1 saved stay in the data, and the new ones are kept in the browser', async ({
    page,
}) => {
    const v1Weights = {
        title: 4,
        access: 4,
        source: 4,
        theory: 4,
        methods: 2,
        conclusion: 2,
        userName: LEGACY_NAME,
        timestamp: participants[LEGACY_SESSION].leaderboard.timestamp,
    };
    await writePath(`rankings/${LEGACY_SESSION}`, v1Weights);
    const user = await persistedAnonymousUser(LEGACY_UID);
    await seedStorage(page, { ...v1Storage(), [AUTH_USER_KEY]: JSON.stringify(user) });
    await page.goto('/');
    await expect(page.locator('.answers')).toBeVisible();

    await finishEarly(page);
    const plan = await allocateTokens(page);
    await expect(page.locator('[data-notice="weightsNotSaved"]')).toContainText(
        'Your weights could not be saved, because an earlier set of weights for this session is already stored'
    );
    const kept = 'These weights are kept in this browser only.';
    await expect(page.locator('#view-results')).toContainText(kept);
    await expectNoAxeViolations(page, 'results with weights kept in the browser');
    await expect(
        page.locator('.weight-bars__item').filter({ hasText: 'Methods & Data' })
    ).toContainText(`${plan.methods} of 20 tokens`);
    expect(await readPath(`rankings/${LEGACY_SESSION}`)).toEqual(v1Weights);
    expect(await savedState(page)).toMatchObject({
        rankingSubmitted: true,
        rankingKeptLocally: true,
        criterionTokens: plan,
    });

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Your results' })).toBeVisible();
    await expect(page.locator('#view-results')).toContainText(kept);
});

test('a version 1 session missing from the leaderboard is added there study by study', async ({
    page,
}) => {
    const { leaderboard, ratings } = participants[LEGACY_SESSION];
    const rated = Object.keys(ratings).length;
    await writePath(`leaderboard/${LEGACY_SESSION}`, null);
    const user = await persistedAnonymousUser(LEGACY_UID);
    await seedStorage(page, { ...v1Storage(), [AUTH_USER_KEY]: JSON.stringify(user) });

    // The rules let an entry grow by one study and 100 points per write, so it steps up.
    const seen = [];
    await page.goto('/');
    await expect
        .poll(async () => {
            const entry = await readPath(`leaderboard/${LEGACY_SESSION}`);
            if (entry) seen.push(entry.papersRated);
            return entry;
        })
        .toMatchObject({
            score: leaderboard.score,
            papersRated: rated,
            uid: LEGACY_UID,
            userName: LEGACY_NAME,
        });
    expect(seen.every((count, i) => i === 0 || count >= seen[i - 1])).toBe(true);
    await expect(page.locator('#banner-rated')).toHaveText(`${rated} of ${STUDY_COUNT}`);
});

test('a saved session that belongs to another sign-in shows the claimed notice', async ({
    page,
}) => {
    // No persisted user: this browser signs in anonymously with a new uid.
    await seedStorage(page, v1Storage());
    await page.goto('/');

    const notice = page.locator('[data-notice="claimed"]');
    await expect(notice).toBeVisible({ timeout: 20_000 });
    await expect(notice).toHaveAttribute('role', 'alert');
    await expect(notice).toContainText('This session cannot continue');
    await expect(
        notice.getByRole('link', { name: 'See the results of that session' })
    ).toHaveAttribute('href', new RegExp(`/\\?session=${LEGACY_SESSION}$`));
    await expect(notice.getByRole('button', { name: 'Start as a new participant' })).toBeVisible();

    // An answer is refused and nothing is written for the session.
    const study = await currentStudy(page);
    await page.locator('#prediction-4').check();
    await page.locator('#rating-4').check();
    await page.getByRole('button', { name: 'Submit both answers' }).click();
    await expect(page.locator('.answers__error')).toHaveText(
        'This session can no longer save answers.'
    );
    expect(await readPath(`sessions/${LEGACY_SESSION}`)).toBeNull();
    expect(await readPath(`ratings/${study.id}/${LEGACY_SESSION}`)).toBeNull();
    expect(await readPath(`leaderboard/${LEGACY_SESSION}`)).toEqual(
        participants[LEGACY_SESSION].leaderboard
    );
});

test('after the claimed notice, a new participant starts afresh', async ({ page }) => {
    await seedStorage(page, v1Storage());
    await page.goto('/');
    const notice = page.locator('[data-notice="claimed"]');
    await notice.getByRole('button', { name: 'Start as a new participant' }).click();

    await expect(page.locator('#view-welcome')).toBeVisible();
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.locator('#view-guide')).toBeVisible();
    const { sessionId } = await savedState(page);
    expect(sessionId).not.toBe(LEGACY_SESSION);
    await expect.poll(() => readPath(`sessions/${sessionId}`)).not.toBeNull();
    expect(await readPath(`sessions/${LEGACY_SESSION}`)).toBeNull();
});

test('a room link opened during a session offers to start again in that room', async ({ page }) => {
    await startWorkshop(page);
    await rateWithMouse(page, { prediction: 4, rating: 4 });
    const first = await savedState(page);

    await page.goto('/?room=DEMO-9');
    const notice = page.locator('[data-notice="roomMismatch"]');
    await expect(notice).toContainText('This link is for the workshop room DEMO-9');
    // Until then the session carries on as it was.
    await expect(page.locator('#feedback-heading')).toBeVisible();
    await notice.getByRole('button', { name: 'Start as a new participant' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start a new session' }).click();

    await expect(page.locator('#view-welcome')).toBeVisible();
    await expect(page).toHaveURL(/\/\?room=DEMO-9$/);
    await page.getByRole('button', { name: 'Get started' }).click();
    const second = await savedState(page);
    expect(second).toMatchObject({ room: 'DEMO-9' });
    expect(second.sessionId).not.toBe(first.sessionId);
    await expect
        .poll(() => readPath(`sessions/${second.sessionId}`))
        .toMatchObject({ room: 'DEMO-9' });
    await expect.poll(() => readPath(`active/${first.sessionId}`)).toBeNull();
});

test('inactivity: a warning at 25 minutes, a pause at 30, and Continue resumes', async ({
    page,
}) => {
    await page.clock.install();
    await startWorkshop(page);
    const { sessionId } = await savedState(page);
    await expect.poll(() => readPath(`active/${sessionId}`)).not.toBeNull();

    await page.clock.fastForward('25:01');
    const warning = page.getByRole('dialog', { name: 'Are you still there?' });
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Your session will pause in 5 minutes');

    await page.clock.fastForward('05:01');
    const paused = page.getByRole('dialog', { name: 'Session paused' });
    await expect(paused).toBeVisible();
    await expect(warning).toBeHidden();
    await expect.poll(() => readPath(`active/${sessionId}`)).toBeNull();

    await paused.getByRole('button', { name: 'Continue' }).click();
    await expect(paused).toBeHidden();
    await expect(page.locator('#study-title')).toBeVisible();
    await expect.poll(() => readPath(`active/${sessionId}`)).not.toBeNull();
    // The same session saves answers again.
    await rateWithMouse(page, { prediction: 4, rating: 4 });
    expect((await savedState(page)).sessionId).toBe(sessionId);
    await expect.poll(() => readPath(`leaderboard/${sessionId}`)).toMatchObject({ papersRated: 1 });
});
