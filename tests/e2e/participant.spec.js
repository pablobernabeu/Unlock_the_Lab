// A new participant's whole journey with the keyboard only: the welcome page,
// the guide, 10 studies, finishing early, the criterion weights and the
// results, checked against what reaches the database.
import guide from '../../src/content/en/guide.json' with { type: 'json' };
import studies from '../../src/content/en/studies.json' with { type: 'json' };
import expertRatings from '../../src/content/expert-ratings.json' with { type: 'json' };
import { readPath, SERVER_TIMESTAMP, writePath } from './emulator.js';
import { CONTENT_VERSION, v1StudyOrder } from './fixture.js';
import {
    activate,
    allocateTokens,
    chooseByKeyboard,
    currentStudy,
    expectedRank,
    expectedTarget,
    finishEarly,
    rateStudies,
    rateWithMouse,
    readFeedback,
    savedState,
    scoreFor,
    SEED_WEIGHT,
    startWorkshop,
    STUDY_COUNT,
    tabTo,
    watchDatabase,
} from './helpers.js';
import { expect, test } from './test.js';

const ANSWERS = [
    { prediction: 4, rating: 5 },
    { prediction: 6, rating: 2 },
    { prediction: 3, rating: 3 },
    { prediction: 5, rating: 6 },
    { prediction: 2, rating: 1 },
    { prediction: 7, rating: 7 },
    { prediction: 1, rating: 4 },
    { prediction: 4, rating: 4 },
    { prediction: 5, rating: 2 },
    { prediction: 3, rating: 6 },
];
const TOKENS = { title: 3, access: 2, source: 4, theory: 3, methods: 6, conclusion: 2 };
const CRITERION_LABELS = {
    title: 'Title',
    access: 'Access',
    source: 'Source',
    theory: 'Theory',
    methods: 'Methods & Data',
    conclusion: 'Conclusion',
};
const RATING_FIELDS = [
    'contentVersion',
    'feedbackShown',
    'locale',
    'prediction',
    'rating',
    'responseTime',
    'score',
    'target',
    'timestamp',
    'trial',
    'uid',
];

test('a new participant takes part from start to results with the keyboard only', async ({
    page,
}) => {
    const database = watchDatabase(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Unlock the Lab' })).toBeVisible();
    await expect(page.locator('#welcome-scoring-target')).toContainText(
        'counts as if 100 people had given it. Only ratings of the current version of the study descriptions count'
    );

    await activate(page, '#welcome-start');
    await expect(page.getByRole('heading', { level: 1, name: 'Before you begin' })).toBeFocused();
    // The guide shows how to reach one rating, with its worked example and the note on Access.
    const guideView = page.locator('#view-guide');
    await expect(
        guideView.getByRole('heading', { level: 2, name: 'From six criteria to one rating' })
    ).toBeVisible();
    await expect(
        guideView.getByRole('heading', { level: 3, name: 'A worked example' })
    ).toBeVisible();
    await expect(
        guideView.getByRole('heading', { level: 3, name: 'About the Access criterion' })
    ).toBeVisible();
    for (const text of Object.values(guide)) await expect(guideView).toContainText(text);
    await activate(page, '#guide-start');
    await expect(page.locator('#study-title')).toBeFocused();

    const { sessionId } = await savedState(page);
    await expect.poll(() => readPath(`sessions/${sessionId}`)).not.toBeNull();
    const sessionRecord = await readPath(`sessions/${sessionId}`);
    const { uid } = sessionRecord;
    expect(sessionRecord).toEqual({
        uid: expect.any(String),
        createdAt: expect.any(Number),
        contentVersion: CONTENT_VERSION,
        appVersion: '2.1.0',
        locale: 'en',
        feedbackMode: 'each',
    });

    // Each session sees the studies in the order seeded by its id, as in v1.
    const order = v1StudyOrder(studies, sessionId);
    const scores = [];
    const targetsShown = [];
    for (const [index, answer] of ANSWERS.entries()) {
        const trial = index + 1;
        await expect(page.locator('.study__progress')).toHaveText(
            `Study ${trial} of ${STUDY_COUNT}`
        );
        const study = await currentStudy(page);
        expect(study.id).toBe(order[index].id);
        const expected = await expectedTarget(study.id, sessionId);

        if (trial === 1) {
            // The glossary and rubric open from the study, follow the tabs pattern and close with Escape.
            await activate(page, '.study-toolbar__help');
            const help = page.getByRole('dialog', { name: 'Glossary and rubric' });
            await expect(help.getByRole('button', { name: 'Close' })).toBeFocused();
            await page.keyboard.press('Tab');
            await expect(help.getByRole('tab', { name: 'Glossary' })).toBeFocused();
            await page.keyboard.press('ArrowRight');
            await expect(help.getByRole('tab', { name: 'Rubric' })).toBeFocused();
            await expect(help.getByRole('tab', { name: 'Rubric' })).toHaveAttribute(
                'aria-selected',
                'true'
            );
            await expect(help.locator('#help-rubric')).toBeVisible();
            await expect(help.locator('#help-rubric')).toContainText(guide.accessNote);
            await page.keyboard.press('ArrowRight');
            await expect(help.getByRole('tab', { name: 'Overall rating' })).toBeFocused();
            const rating = help.getByRole('tabpanel', { name: 'Overall rating' });
            await expect(rating).toContainText(guide.combining);
            await expect(rating).toContainText(guide.example);
            await page.keyboard.press('Escape');
            await expect(help).toBeHidden();
            await expect(page.locator('.study-toolbar__help')).toBeFocused();
        }

        await chooseByKeyboard(page, 'prediction', answer.prediction);
        await chooseByKeyboard(page, 'rating', answer.rating);
        const submittedFrom = Date.now();
        await activate(page, '.answers button[type="submit"]');
        await expect(page.locator('#feedback-heading')).toBeFocused({ timeout: 20_000 });
        const submittedBy = Date.now();

        // The score is the stated rule applied to the target shown.
        const feedback = await readFeedback(page);
        expect(feedback.prediction).toBe(answer.prediction);
        // Two decimals, or more where the score needs them (see the next test).
        expect(feedback.targetText).toMatch(/^\d\.\d{2,6}$/);
        expect(Math.abs(feedback.target - expected.target)).toBeLessThanOrEqual(0.005);
        expect(feedback.score).toBe(scoreFor(answer.prediction, feedback.target));
        expect(feedback.facts).toContain(
            expected.n === 0
                ? `No other participant had rated this study yet, so the target was the expert's rating of ${study.expertRating}.`
                : `How the target was worked out: the expert's rating of ${study.expertRating}, counted as if 100 people had given it, combined with ${expected.n} ${expected.n === 1 ? 'rating from another participant' : 'ratings from other participants'}.`
        );
        expect(feedback.facts).toContain(`Your own rating: ${answer.rating}`);

        // The expert's rating and a note on each of the six criteria.
        const panel = page.locator('.feedback');
        await expect(panel.locator('.expert-feedback__rating')).toContainText(
            `Expert rating: ${study.expertRating} out of 7`
        );
        await expect(panel.locator('.expert-feedback__summary')).not.toBeEmpty();
        const notes = panel.locator('.criterion-notes__item');
        await expect(notes).toHaveCount(6);
        for (const [index, [key, label]] of Object.entries(CRITERION_LABELS).entries()) {
            const note = notes.nth(index);
            await expect(note.locator('dt')).toContainText(label);
            await expect(note.locator('dd')).toHaveText(study.feedback.criteria[key].note);
        }

        // The stored rating has every v2 field.
        const record = await readPath(`ratings/${study.id}/${sessionId}`);
        expect(Object.keys(record).sort()).toEqual(RATING_FIELDS);
        expect(record).toMatchObject({
            rating: answer.rating,
            prediction: answer.prediction,
            uid,
            contentVersion: CONTENT_VERSION,
            feedbackShown: true,
            score: feedback.score,
            trial,
            locale: 'en',
        });
        expect(record.target).toBeCloseTo(expected.target, 10);
        expect(record.responseTime).toBeGreaterThan(0);
        // The timestamp comes from the server: the client sent the placeholder.
        const writes = database.requests.filter(
            ({ action, path }) => action === 'p' && path === `/ratings/${study.id}/${sessionId}`
        );
        expect(writes).toHaveLength(1);
        expect(writes[0].data.timestamp).toEqual(SERVER_TIMESTAMP);
        expect(record.timestamp).toBeGreaterThanOrEqual(submittedFrom - 2000);
        expect(record.timestamp).toBeLessThanOrEqual(submittedBy + 2000);
        scores.push(feedback.score);
        targetsShown.push(feedback.targetText);

        await expect(page.locator('#banner-rated')).toHaveText(`${trial} of ${STUDY_COUNT}`);
        if (trial < ANSWERS.length) {
            await activate(page, '.feedback__actions button', { text: 'Next study' });
            await expect(page.locator('#study-title')).toBeFocused();
            await expect(page.locator('.answers')).toBeVisible();
        }
    }

    // Finishing early asks first; Escape keeps the participant on the study.
    await activate(page, '.study-finish button', { text: 'Finish and see my results' });
    const dialog = page.getByRole('dialog', { name: 'Finish now?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('You have rated 10 of 48 studies.');
    await expect(dialog.getByRole('button', { name: 'Finish', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('.study-finish button')).toBeFocused();
    await expect(page.locator('#view-study')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Finish', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');

    // Criterion weights with the steppers.
    const weightsHeading = page.getByRole('heading', {
        level: 1,
        name: 'What matters most to you?',
    });
    await expect(weightsHeading).toBeFocused();
    for (const [key, count] of Object.entries(TOKENS)) {
        await tabTo(page, `button[aria-label="Add a token to ${CRITERION_LABELS[key]}"]`);
        for (let i = 0; i < count; i += 1) await page.keyboard.press('Enter');
        await expect(page.locator(`#weight-${key}-count`)).toHaveText(`${count} tokens`);
    }
    await expect(page.locator('.weights-total__text')).toHaveText('20 of 20 tokens used');
    await activate(page, '.weights__actions .btn-primary', { text: 'Save and see my results' });

    // Results: mean accuracy, rank and leaderboard.
    await expect(page.getByRole('heading', { level: 1, name: 'Your results' })).toBeFocused({
        timeout: 20_000,
    });
    const total = scores.reduce((sum, score) => sum + score, 0);
    await expect(page.locator('.results-score__value')).toHaveText(
        `${Math.round(total / ANSWERS.length)}%`
    );
    await expect(page.locator('.results-score__caption')).toHaveText(
        'Your average score per study, over 10 studies'
    );

    await expect
        .poll(() => readPath(`leaderboard/${sessionId}`))
        .toMatchObject({ papersRated: 10 });
    const leaderboard = await readPath('leaderboard');
    const entry = leaderboard[sessionId];
    expect(entry).toEqual({
        score: total,
        papersRated: 10,
        timestamp: expect.any(Number),
        uid,
        userName: expect.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+ [0-9]{2}(-[0-9]{1,3})?$/),
    });
    await expect(page.locator('#results-nickname')).toHaveText(`Your nickname: ${entry.userName}`);

    // The fixture has four ranked participants, so the top five always include this one.
    const { rank, count } = expectedRank(leaderboard, sessionId);
    expect(count).toBe(5);
    await expect(page.locator('.results-rank')).toHaveText(
        `Your position: ${rank} of ${count} ranked participants.`
    );
    const rows = page.locator('.results-board tbody tr');
    await expect(rows).toHaveCount(5);
    const own = page.locator('.results-board tr[aria-current="true"]');
    await expect(own).toContainText(entry.userName);
    await expect(own).toContainText('You');
    await expect(own).toContainText(`${Math.round(total / 10)}%`);
    await expect(own.locator('td').first()).toHaveText(String(rank));

    expect(await readPath(`rankings/${sessionId}`)).toEqual({
        ...TOKENS,
        userName: entry.userName,
        timestamp: expect.any(Number),
        uid,
    });
    // The ratings, in the order they were saved, are trials 1 to 10.
    const saved = Object.entries(await readPath('ratings'))
        .filter(([, node]) => node[sessionId])
        .map(([studyId, node]) => ({ studyId, ...node[sessionId] }))
        .sort((a, b) => a.timestamp - b.timestamp);
    expect(saved.map(({ trial }) => trial)).toEqual(ANSWERS.map((_, i) => i + 1));
    expect(saved.map(({ studyId }) => studyId)).toEqual(order.slice(0, 10).map(({ id }) => id));
    // Study by study, the results repeat what was saved, in the order rated.
    const items = page.locator('.review-item');
    await expect(items).toHaveCount(10);
    for (const [index, record] of saved.entries()) {
        const item = items.nth(index);
        await expect(item.locator('.review-item__title')).toHaveText(order[index].title);
        await expect(item.locator('.review-item__facts dd')).toHaveText([
            String(record.rating),
            String(record.prediction),
            targetsShown[index],
            String(record.score),
            new RegExp(`^${expertRatings[record.studyId]} (Low|Medium|High) quality$`),
        ]);
    }
    await expect(page.locator('.weight-bars__value')).toHaveText(
        Object.values(TOKENS).map(
            (count) => `${count} of 20 tokens (${Math.round((count / 20) * 100)}%)`
        )
    );
    // Presence ends on the results page.
    await expect.poll(() => readPath(`active/${sessionId}`)).toBeNull();
    const stored = await savedState(page);
    expect(stored).toMatchObject({
        stateVersion: 2,
        sessionId,
        totalScore: total,
        rankingSubmitted: true,
        criterionTokens: TOKENS,
    });
});

/**
 * Other participants' ratings for a study, and a prediction, for which the
 * score worked out from the target rounded to two decimals differs from the
 * real score: the case where two decimals are not enough to show the target.
 */
function roundingEdge(expertRating) {
    for (let count = 4; count <= 40; count += 1) {
        for (let sum = count; sum <= 7 * count; sum += 1) {
            const target = (sum + expertRating * SEED_WEIGHT) / (count + SEED_WEIGHT);
            for (let prediction = 1; prediction <= 7; prediction += 1) {
                const rounded = Number(target.toFixed(2));
                if (scoreFor(prediction, target) === scoreFor(prediction, rounded)) continue;
                const base = Math.floor(sum / count);
                const ratings = Array.from({ length: count }, (_, i) =>
                    i < sum - base * count ? base + 1 : base
                );
                return { target, prediction, ratings };
            }
        }
    }
    throw new Error(`No rounding edge found for an expert rating of ${expertRating}`);
}

test('the score can be worked out from the target shown, even where two decimals are not enough', async ({
    page,
}) => {
    await startWorkshop(page);
    const { sessionId } = await savedState(page);
    const study = await currentStudy(page);
    const edge = roundingEdge(study.expertRating);
    // The other participants' ratings of the current version, and ratings of earlier
    // versions that do not count: a bare number, as the oldest were, a version 1
    // record (which has no version) and a version 2 record.
    const earlier = {
        session_1700000000100_bare: 7,
        session_1700000000101_v1: { rating: 7, prediction: 7, timestamp: 1_700_000_000_101 },
        session_1700000000102_v2: {
            rating: 7,
            prediction: 7,
            timestamp: 1_700_000_000_102,
            uid: 'uid-v2',
            contentVersion: CONTENT_VERSION - 1,
        },
    };
    await writePath(`ratings/${study.id}`, {
        ...earlier,
        ...Object.fromEntries(
            edge.ratings.map((rating, i) => [
                `session_17000000000${String(i).padStart(2, '0')}_edge${i}`,
                {
                    rating,
                    prediction: 4,
                    timestamp: 1_700_000_000_000 + i,
                    uid: `uid-${i}`,
                    contentVersion: CONTENT_VERSION,
                },
            ])
        ),
    });

    await rateWithMouse(page, { prediction: edge.prediction, rating: 4 });
    const feedback = await readFeedback(page);
    const score = scoreFor(edge.prediction, edge.target);
    expect(feedback.score).toBe(score);
    expect(feedback.score, `the rule applied to ${feedback.targetText}`).toBe(
        scoreFor(edge.prediction, feedback.target)
    );
    const distance = feedback.facts
        .map((line) => /Your prediction was ([\d.]+) points? from the target\./.exec(line)?.[1])
        .find(Boolean);
    expect(Number(distance)).toBeCloseTo(Math.abs(edge.prediction - feedback.target), 9);
    expect(feedback.facts).toContain(
        `How the target was worked out: the expert's rating of ${study.expertRating}, counted as if 100 people had given it, combined with ${edge.ratings.length} ratings from other participants.`
    );
    const record = await readPath(`ratings/${study.id}/${sessionId}`);
    expect(record.score).toBe(score);
    expect(record.target).toBeCloseTo(edge.target, 12);

    // The study-by-study results show the target the same way.
    await page.goto(`/?session=${sessionId}`);
    const facts = page.locator('.review-item').first().locator('.review-item__facts dd');
    await expect(facts).toHaveText([
        '4',
        String(edge.prediction),
        feedback.targetText,
        String(score),
        /./,
    ]);
});

test('the results link can be copied, and a new participant gets a new session and user', async ({
    page,
    context,
}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await startWorkshop(page);
    await rateStudies(page, 10);
    await finishEarly(page);
    await allocateTokens(page);
    const first = await savedState(page);
    const firstUid = (await readPath(`sessions/${first.sessionId}`)).uid;

    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.locator('.results-save__status')).toHaveText('Link copied.');
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(link).searchParams.get('session')).toBe(first.sessionId);
    await expect(page.getByLabel('Link to your results')).toHaveValue(link);

    await page
        .locator('#results-own-actions')
        .getByRole('button', { name: 'Start as a new participant' })
        .click();
    const dialog = page.getByRole('dialog', { name: 'Start as a new participant?' });
    await expect(dialog).toContainText(`(${first.userName}, 10 rated)`);
    await dialog.getByRole('button', { name: 'Start a new session' }).click();

    await expect(page.locator('#view-welcome')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('workshopState'))).toBeNull();
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.locator('#view-guide')).toBeVisible();
    const second = await savedState(page);
    expect(second.sessionId).not.toBe(first.sessionId);
    await expect.poll(() => readPath(`sessions/${second.sessionId}`)).not.toBeNull();
    expect((await readPath(`sessions/${second.sessionId}`)).uid).not.toBe(firstUid);

    // The first participant's results stay as they were, at the copied link.
    expect(await readPath(`leaderboard/${first.sessionId}`)).toMatchObject({
        papersRated: 10,
        uid: firstUid,
    });
    await page.goto(link);
    await expect(
        page.getByRole('heading', { level: 1, name: `Results for ${first.userName}` })
    ).toBeVisible();
});

test('one step back, back to rating after finishing early, and the milestone at 12', async ({
    page,
}) => {
    await startWorkshop(page);
    await rateWithMouse(page, { prediction: 4, rating: 4 });
    const first = await readFeedback(page);
    await page.getByRole('button', { name: 'Next study' }).click();

    // Back once: the rated study shows its feedback; the button then goes.
    await page.getByRole('button', { name: 'Back to the previous study' }).click();
    await expect(page.locator('.study__progress')).toHaveText(`Study 1 of ${STUDY_COUNT}`);
    await expect(page.locator('#feedback-heading')).toHaveText(
        `Your score: ${first.score} out of 100`
    );
    await page.getByRole('button', { name: 'Next study' }).click();
    await expect(page.getByRole('button', { name: 'Back to the previous study' })).toHaveCount(0);

    await rateStudies(page, 9);
    await finishEarly(page);
    await page.getByRole('button', { name: 'Go back to rating studies' }).click();
    await expect(page.locator('.study__progress')).toHaveText(`Study 10 of ${STUDY_COUNT}`);
    await page.getByRole('button', { name: 'Next study' }).click();
    await rateWithMouse(page, { prediction: 5, rating: 3 });
    await page.getByRole('button', { name: 'Next study' }).click();
    await rateWithMouse(page, { prediction: 3, rating: 5 });
    await expect(
        page.locator('.toast').filter({ hasText: 'You have rated 12 studies.' })
    ).toBeVisible();

    const state = await savedState(page);
    await expect
        .poll(() => readPath(`leaderboard/${state.sessionId}`))
        .toMatchObject({ papersRated: 12, score: state.totalScore });
    await finishEarly(page);
    await allocateTokens(page);
    await expect(page.locator('.results-score__caption')).toHaveText(
        'Your average score per study, over 12 studies'
    );
    await expect(page.locator('.review-item')).toHaveCount(12);
});

test('the criterion weights work by pointer and survive a reload', async ({ page }) => {
    await startWorkshop(page);
    await rateStudies(page, 10);
    await finishEarly(page);
    const { sessionId } = await savedState(page);
    const row = (key) =>
        page.getByRole('group', { name: CRITERION_LABELS[key], exact: true }).locator('.token-bar');
    const count = (key) => page.locator(`#weight-${key}-count`);
    const submit = page.getByRole('button', { name: 'Save and see my results' });

    // A box sets the count to its position, within what the other criteria leave.
    await row('methods').locator('.token-box').nth(7).click();
    await expect(count('methods')).toHaveText('8 tokens');
    await row('title').locator('.token-box').nth(14).click();
    await expect(count('title')).toHaveText('12 tokens');
    await expect(row('title').locator('.token-box--filled')).toHaveCount(12);
    await expect(row('access').locator('.token-box--blocked')).toHaveCount(20);
    await expect(page.locator('.weights-total__text')).toHaveText('20 of 20 tokens used');
    await row('methods').locator('.token-box').nth(3).click();
    await expect(count('methods')).toHaveText('4 tokens');
    await expect(page.locator('.weights-total__text')).toHaveText('16 of 20 tokens used');

    // Saving needs every token; trying early says why and writes nothing.
    await expect(submit).toHaveAttribute('aria-disabled', 'true');
    await submit.click({ force: true });
    await expect(page.locator('.weights__actions .field-error')).toHaveText(
        'Use all 20 tokens to continue: 4 tokens left.'
    );
    expect(await readPath(`rankings/${sessionId}`)).toBeNull();

    // The allocation so far is kept across a reload, and focus stays out of the hidden bar.
    await page.reload();
    await expect(count('title')).toHaveText('12 tokens');
    await expect(count('methods')).toHaveText('4 tokens');
    await row('conclusion').locator('.token-box').nth(3).click();
    expect(await page.evaluate(() => document.activeElement.closest('.token-bar'))).toBeNull();
    await page.getByRole('button', { name: 'Remove a token from Title' }).click();
    await expect(count('title')).toHaveText('11 tokens');
    await page.getByRole('button', { name: 'Add a token to Source' }).click();
    await expect(page.locator('.weights-total__text')).toHaveText('20 of 20 tokens used');
    await submit.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your results' })).toBeVisible();
    expect(await readPath(`rankings/${sessionId}`)).toMatchObject({
        title: 11,
        access: 0,
        source: 1,
        theory: 0,
        methods: 4,
        conclusion: 4,
    });
});

test('a double click on submit saves the answers once', async ({ page }) => {
    await startWorkshop(page);
    const { sessionId } = await savedState(page);
    await page.locator('#prediction-4').check();
    await page.locator('#rating-4').check();
    await page.getByRole('button', { name: 'Submit both answers' }).dblclick();
    await expect(page.locator('#feedback-heading')).toBeVisible();
    await page.getByRole('button', { name: 'Next study' }).click();
    await rateWithMouse(page, { prediction: 3, rating: 3 });

    const ratings = await readPath('ratings');
    const own = Object.values(ratings)
        .map((node) => node[sessionId])
        .filter(Boolean);
    expect(own.map(({ trial }) => trial).sort()).toEqual([1, 2]);
    await expect.poll(() => readPath(`leaderboard/${sessionId}`)).toMatchObject({ papersRated: 2 });
    await expect(page.locator('#banner-rated')).toHaveText(`2 of ${STUDY_COUNT}`);
});
