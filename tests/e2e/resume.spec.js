// Coming back to a session: reloads during the workshop, a session saved in
// the browser by version 1 of the app, and a saved session whose id now
// belongs to another sign-in.
import studies from '../../src/content/en/studies.json' with { type: 'json' };
import expertRatings from '../../src/content/expert-ratings.json' with { type: 'json' };
import { seededShuffle } from '../../src/lib/shuffle.js';
import { AUTH_USER_KEY, persistedAnonymousUser, readPath } from './emulator.js';
import { LEGACY_NAME, LEGACY_SESSION, participants } from './fixture.js';
import {
    currentStudy,
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

test('a session saved by version 1 resumes on the same page with the same score', async ({
    page,
}) => {
    const user = await persistedAnonymousUser(LEGACY_UID);
    await seedStorage(page, { ...v1Storage(), [AUTH_USER_KEY]: JSON.stringify(user) });
    const { leaderboard, ratings } = participants[LEGACY_SESSION];
    const rated = Object.keys(ratings).length;
    const order = seededShuffle(studies, LEGACY_SESSION);

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
    await rateWithMouse(page, { prediction: 5, rating: 4 });
    const { score } = await readFeedback(page);
    await expect(page.locator('#banner-rated')).toHaveText(`${rated + 1} of ${STUDY_COUNT}`);
    expect(await readPath(`ratings/${study.id}/${LEGACY_SESSION}`)).toMatchObject({
        uid: LEGACY_UID,
        trial: rated + 1,
        score,
    });
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
