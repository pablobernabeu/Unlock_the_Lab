// Shared steps and expectations for the participant journeys.
import AxeBuilder from '@axe-core/playwright';
import expertRatings from '../../src/content/expert-ratings.json' with { type: 'json' };
import studies from '../../src/content/en/studies.json' with { type: 'json' };
import { expect } from './test.js';
import { readPath } from './emulator.js';

/** Studies in the workshop. */
export const STUDY_COUNT = studies.length;
/** The scoring rule as the welcome page states it, kept apart from src/lib on purpose. */
export const SEED_WEIGHT = 100;
export const SCORE_PENALTY = 12;
const studyByTitle = new Map(studies.map((study) => [study.title, study]));

/** The study (with its expert rating) whose title is shown on the page. */
export async function currentStudy(page) {
    const title = (await page.locator('#study-title').textContent()).trim();
    const study = studyByTitle.get(title);
    if (!study) throw new Error(`Unknown study title on the page: ${title}`);
    return { ...study, expertRating: expertRatings[study.id] };
}

/** Score for a prediction against a target, as the welcome page states the rule. */
export function scoreFor(prediction, target) {
    return Math.max(0, 100 - Math.round(SCORE_PENALTY * Math.abs(prediction - target)));
}

/** The target worked out independently from the database, leaving out `sessionId`. */
export async function expectedTarget(studyId, sessionId) {
    const node = (await readPath(`ratings/${studyId}`)) ?? {};
    const others = Object.entries(node)
        .filter(([key]) => key !== sessionId)
        .map(([, value]) => (typeof value === 'number' ? value : value?.rating))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 7);
    const sum = others.reduce((total, value) => total + value, 0);
    const expert = expertRatings[studyId];
    return {
        target: (sum + expert * SEED_WEIGHT) / (others.length + SEED_WEIGHT),
        n: others.length,
    };
}

/** Presses Tab (or Shift+Tab) until the focused element matches. Keyboard only. */
export async function tabTo(page, selector, { text = null, max = 150, back = false } = {}) {
    for (let i = 0; i < max; i += 1) {
        await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
        const found = await page.evaluate(
            ({ selector: wanted, text: label }) => {
                const active = document.activeElement;
                if (!active?.matches(wanted)) return false;
                return label === null || active.textContent.trim().includes(label);
            },
            { selector, text }
        );
        if (found) return;
    }
    throw new Error(`Could not reach ${selector}${text ? ` '${text}'` : ''} with the Tab key`);
}

/** Tabs to a control and presses Enter. */
export async function activate(page, selector, options) {
    await tabTo(page, selector, options);
    await page.keyboard.press('Enter');
}

/**
 * Chooses a value in a 1-7 radio group with the keyboard: Tab into the group,
 * Space selects the focused option, the arrow keys move the selection.
 */
export async function chooseByKeyboard(page, name, value) {
    await tabTo(page, `input[name="${name}"]`);
    await page.keyboard.press('Space');
    let current = Number(await page.evaluate(() => document.activeElement.value));
    while (current < value) {
        await page.keyboard.press('ArrowRight');
        current += 1;
    }
    while (current > value) {
        await page.keyboard.press('ArrowLeft');
        current -= 1;
    }
    await expect(page.locator(`input[name="${name}"]:checked`)).toHaveValue(String(value));
}

/** The feedback panel's score and the target it states. */
export async function readFeedback(page) {
    const heading = await page.locator('#feedback-heading').textContent();
    const facts = await page.locator('.feedback__facts li').allTextContents();
    const score = Number(/Your score: (\d+) out of 100/.exec(heading)?.[1]);
    const match = facts
        .map((line) => /You predicted (\d)\. The target was ([\d.]+)\./.exec(line))
        .find(Boolean);
    return {
        score,
        prediction: Number(match?.[1]),
        targetText: match?.[2],
        target: Number(match?.[2]),
        facts,
    };
}

/** Answers the study on screen with the mouse and waits for the feedback. */
export async function rateWithMouse(page, { prediction, rating }) {
    await page.locator(`#prediction-${prediction}`).check();
    await page.locator(`#rating-${rating}`).check();
    await page.getByRole('button', { name: 'Submit both answers' }).click();
    await expect(page.locator('#feedback-heading')).toBeVisible({ timeout: 20_000 });
}

/** From the welcome page to the first study, with the mouse. */
export async function startWorkshop(page, path = '/') {
    await page.goto(path);
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Before you begin' })).toBeVisible();
    await page.getByRole('button', { name: 'Start rating studies' }).click();
    await expect(page.locator('#study-title')).toBeVisible();
}

/** The participant state the app keeps in localStorage. */
export function savedState(page) {
    return page.evaluate(() => JSON.parse(localStorage.getItem('workshopState')));
}

/**
 * Rates `count` studies in a row with the mouse, starting on an unrated study.
 * @returns {Promise<number[]>} the scores, in order
 */
export async function rateStudies(page, count, answers = defaultAnswers) {
    const scores = [];
    for (let i = 0; i < count; i += 1) {
        await rateWithMouse(page, answers(i));
        scores.push((await readFeedback(page)).score);
        if (i < count - 1) {
            await page.getByRole('button', { name: 'Next study' }).click();
            await expect(page.locator('.answers')).toBeVisible();
        }
    }
    return scores;
}

/** Varied answers for the `i`th study rated in a test. */
export function defaultAnswers(i) {
    return { prediction: [4, 5, 3, 6, 2, 4, 5, 3, 4, 6, 2, 7][i % 12], rating: 1 + ((i * 3) % 7) };
}

/** Finishes early from a study page with the mouse and lands on the weights page. */
export async function finishEarly(page) {
    await page.getByRole('button', { name: 'Finish and see my results' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Finish', exact: true }).click();
    await expect(
        page.getByRole('heading', { level: 1, name: 'What matters most to you?' })
    ).toBeVisible();
}

/** Allocates the tokens with the + buttons and saves them; lands on the results page. */
export async function allocateTokens(
    page,
    plan = { title: 3, access: 3, source: 4, theory: 3, methods: 5, conclusion: 2 }
) {
    const labels = {
        title: 'Title',
        access: 'Access',
        source: 'Source',
        theory: 'Theory',
        methods: 'Methods & Data',
        conclusion: 'Conclusion',
    };
    for (const [key, count] of Object.entries(plan)) {
        const plus = page.getByRole('button', { name: `Add a token to ${labels[key]}` });
        for (let i = 0; i < count; i += 1) await plus.click();
    }
    await expect(page.locator('.weights-total__text')).toHaveText('20 of 20 tokens used');
    await page.getByRole('button', { name: 'Save and see my results' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your results' })).toBeVisible({
        timeout: 20_000,
    });
    return plan;
}

/** Runs axe with the WCAG 2.2 AA rule set and fails on any violation or sideways page scroll. */
export async function expectNoAxeViolations(page, label) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `horizontal page scroll on ${label}`).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
    const summary = results.violations.map(
        (violation) =>
            `${violation.id} (${violation.impact}): ${violation.nodes
                .slice(0, 3)
                .map((node) => node.target.join(' '))
                .join(' | ')}`
    );
    expect(summary, `axe violations on ${label}`).toEqual([]);
}

/**
 * The rank the leaderboard should give `sessionId`, worked out independently:
 * entries with at least 10 studies, ordered by the whole-number accuracy shown,
 * then by studies rated; equal on both means an equal rank.
 */
export function expectedRank(leaderboard, sessionId, { room = null } = {}) {
    const entries = Object.entries(leaderboard)
        .filter(([, entry]) => entry && entry.papersRated >= 10)
        .filter(([, entry]) => !room || entry.room === room)
        .map(([id, entry]) => ({
            id,
            percent: Math.round(entry.score / entry.papersRated),
            papers: entry.papersRated,
        }));
    const own = entries.find((entry) => entry.id === sessionId);
    const ahead = entries.filter(
        (entry) =>
            entry.percent > own.percent ||
            (entry.percent === own.percent && entry.papers > own.papers)
    );
    return { rank: ahead.length + 1, count: entries.length };
}
