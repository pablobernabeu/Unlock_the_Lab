// The public dashboard: the fixture's figures, the statistics table staying
// sorted through a live update, the study dialog and 'Find your results'.
import studies from '../../src/content/en/studies.json' with { type: 'json' };
import expertRatingHistory from '../../src/content/expert-ratings-history.json' with { type: 'json' };
import expertRatings from '../../src/content/expert-ratings.json' with { type: 'json' };
import { SERVER_TIMESTAMP, updatePath, writePath } from './emulator.js';
import {
    CONTENT_VERSION,
    fixture,
    LEGACY_NAME,
    LEGACY_SESSION,
    SHARED_NAME,
    SHARED_SESSIONS,
} from './fixture.js';
import { expectNoAxeViolations, rateWithMouse, savedState, startWorkshop } from './helpers.js';
import { expect, test } from './test.js';

/** The content version of a stored rating; records without one are version 1. */
const versionOf = (record) => record?.contentVersion ?? 1;

/** The fixture's ratings of each study, of one content version or (null) of all. */
function fixtureRatings(version) {
    return Object.fromEntries(
        studies.map(({ id }) => [
            id,
            Object.values(fixture.ratings[id] ?? {})
                .filter((record) => version === null || versionOf(record) === version)
                .map((record) => (typeof record === 'number' ? record : record.rating)),
        ])
    );
}

/** The table shows the current version by default; the figures at the top cover every version. */
const ratingCounts = Object.fromEntries(
    Object.entries(fixtureRatings(CONTENT_VERSION)).map(([id, ratings]) => [id, ratings.length])
);
const totalRatings = Object.values(fixtureRatings(null)).reduce(
    (sum, ratings) => sum + ratings.length,
    0
);
const sessionsWithRatings = new Set(
    Object.values(fixture.ratings).flatMap((node) => Object.keys(node))
).size;
const rankedEntries = Object.values(fixture.leaderboard).filter((entry) => entry.papersRated >= 10);

async function openDashboard(page) {
    await page.goto('/dashboard.html');
    await expect(page.locator('[data-connection-text]')).toHaveText(
        'Connected. The figures update automatically.'
    );
    await expect(page.locator('[data-stats-rows] tr')).toHaveCount(studies.length);
}

/** The study ids in the table's current order. */
function tableOrder(page) {
    return page
        .locator('[data-stats-rows] tr')
        .evaluateAll((rows) => rows.map((row) => row.dataset.key));
}

test('the dashboard shows the figures from the data', async ({ page }) => {
    await openDashboard(page);
    await expect(page.locator('[data-stat="participants"]')).toHaveText(
        String(sessionsWithRatings)
    );
    await expect(page.locator('[data-stat="ratings"]')).toHaveText(String(totalRatings));
    await expect(page.locator('[data-stat="completed"]')).toHaveText(String(rankedEntries.length));
    await expect(page.locator('[data-stat="active"]')).toHaveText('0');
    await expect(page.locator('[data-leaderboard-rows] tr')).toHaveCount(rankedEntries.length);

    const best = rankedEntries
        .map((entry) => ({ ...entry, percent: Math.round(entry.score / entry.papersRated) }))
        .sort((a, b) => b.percent - a.percent || b.papersRated - a.papersRated)[0];
    const firstRow = page.locator('[data-leaderboard-rows] tr').first();
    await expect(firstRow).toContainText(best.userName);
    await expect(firstRow).toContainText(`${best.percent}%`);

    // Study ids sort as numbers, not as text.
    expect((await tableOrder(page)).slice(0, 11)).toEqual(
        Array.from({ length: 11 }, (_, i) => `STUDY-${i + 1}`)
    );
    await expect(page.getByLabel('Content version')).toHaveValue(String(CONTENT_VERSION));
    await expect(page.locator('[data-version-hint]')).toContainText(
        'Earlier versions showed different texts and expert ratings.'
    );
    for (const id of ['STUDY-1', 'STUDY-2']) {
        const row = page.locator(`[data-stats-rows] tr[data-key="${id}"]`);
        await expect(row.locator('td').nth(2)).toHaveText(String(ratingCounts[id]));
        await expect(row.locator('td').nth(1)).toContainText(String(expertRatings[id]));
    }
});

test('the content-version filter compares each version with its own expert ratings', async ({
    page,
}) => {
    await openDashboard(page);
    // A study whose expert rating changed after version 1 and that has ratings of both.
    const current = fixtureRatings(CONTENT_VERSION);
    const first = fixtureRatings(1);
    const changed = studies
        .map(({ id }) => id)
        .find(
            (id) =>
                expertRatingHistory[1][id] !== expertRatingHistory[CONTENT_VERSION][id] &&
                current[id].length > 0 &&
                first[id].length > 0
        );
    expect(changed, 'the fixture has a study rated under two expert ratings').toBeDefined();
    const row = page.locator(`[data-stats-rows] tr[data-key="${changed}"]`);
    const cells = row.locator('td');
    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const twoDecimals = (value) => value.toFixed(2);
    // An expert rating is shown as a whole number, or with two decimals when it is an average.
    const expertText = (value) => (Number.isInteger(value) ? String(value) : twoDecimals(value));
    await expect(cells.nth(1)).toContainText(String(expertRatingHistory[CONTENT_VERSION][changed]));
    await expect(cells.nth(2)).toHaveText(String(current[changed].length));
    await expect(cells.nth(3)).toHaveText(twoDecimals(mean(current[changed])));

    const select = page.getByLabel('Content version');
    await select.selectOption('1');
    await expect(page).toHaveURL(/\?version=1$/);
    await expect(page.locator('[data-version-hint]')).toContainText(
        "Showing ratings of version 1, compared with that version's expert ratings."
    );
    await expect(cells.nth(1)).toContainText(String(expertRatingHistory[1][changed]));
    await expect(cells.nth(2)).toHaveText(String(first[changed].length));
    await expect(cells.nth(3)).toHaveText(twoDecimals(mean(first[changed])));
    // The figures at the top cover every version whatever the filter.
    await expect(page.locator('[data-stat="ratings"]')).toHaveText(String(totalRatings));

    // With every version, each rating meets the expert rating of its own version.
    await select.selectOption('all');
    await expect(page).toHaveURL(/\?version=all$/);
    const records = Object.values(fixture.ratings[changed]);
    const met = records.map((record) => expertRatingHistory[versionOf(record)][changed]);
    await expect(cells.nth(2)).toHaveText(String(records.length));
    await expect(cells.nth(1)).toContainText(expertText(mean(met)));
    await expect(page.locator('[data-version-hint]')).toContainText(
        'the average of the expert ratings that its participants saw'
    );
    await expectNoAxeViolations(page, 'dashboard, all versions');

    // The study details say which figures they show; the target stays on the current version.
    await row.getByRole('button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.study-dialog__expert')).toContainText(
        'the average of the expert ratings that its participants saw'
    );
    await expect(dialog).toContainText('Figures for ratings of every version.');
    await expect(dialog).toContainText(
        `combined with ${current[changed].length === 1 ? 'the 1 participant rating' : `all ${current[changed].length} participant ratings`} of the current version so far`
    );
    await page.keyboard.press('Escape');

    // A link keeps the version; the current version needs no parameter.
    await page.goto('/dashboard.html?version=1');
    await expect(page.getByLabel('Content version')).toHaveValue('1');
    await page.getByLabel('Content version').selectOption(String(CONTENT_VERSION));
    await expect(page).toHaveURL(/\/dashboard\.html$/);
});

test('a sorted statistics table keeps its sort and focus through a live rating', async ({
    page,
}) => {
    await openDashboard(page);
    const header = page.locator('th[data-sort-column="n"]');
    const sortButton = header.getByRole('button');
    await sortButton.click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await sortButton.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');

    // The study with the fewest ratings is last; give it the most and it should move to the top.
    const order = await tableOrder(page);
    const target = order.at(-1);
    const most = Math.max(...Object.values(ratingCounts));
    const added = most - ratingCounts[target] + 2;
    const button = page.locator(`[data-stats-rows] tr[data-key="${target}"] button`);
    await button.focus();

    const records = Object.fromEntries(
        Array.from({ length: added }, (_, i) => [
            `session_17999999999${String(i).padStart(2, '0')}_live${i}`,
            {
                rating: 1 + (i % 7),
                prediction: 4,
                timestamp: SERVER_TIMESTAMP,
                uid: `live-uid-${i}`,
                contentVersion: CONTENT_VERSION,
                feedbackShown: true,
                target: expertRatings[target],
                score: 88,
                trial: 1,
                locale: 'en',
            },
        ])
    );
    await updatePath(`ratings/${target}`, records);

    const firstRow = page.locator('[data-stats-rows] tr').first();
    await expect(firstRow).toHaveAttribute('data-key', target);
    await expect(firstRow.locator('td').nth(2)).toHaveText(String(ratingCounts[target] + added));
    await expect(page.locator('[data-stat="ratings"]')).toHaveText(String(totalRatings + added));
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect(button).toBeFocused();
    const counts = await page
        .locator('[data-stats-rows] tr td:nth-child(4)')
        .evaluateAll((cells) => cells.map((cell) => Number(cell.textContent)));
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
});

test('a study opens from the table with the expert feedback', async ({ page }) => {
    await openDashboard(page);
    const study = studies.find(({ id }) => id === 'STUDY-12');
    const button = page.locator('[data-stats-rows] tr[data-key="STUDY-12"] button');
    await button.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: study.title });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-study-dialog-id]')).toHaveText('STUDY-12');
    await expect(dialog.locator('.study-dialog__expert')).toContainText(
        `Expert rating: ${expertRatings['STUDY-12']} out of 7`
    );
    const feedback = dialog.getByRole('region', { name: 'Expert feedback' });
    await expect(feedback).toContainText(study.feedback.summary);
    await expect(feedback.locator('li')).toHaveCount(6);
    for (const { note } of Object.values(study.feedback.criteria)) {
        await expect(feedback).toContainText(note);
    }
    await expect(dialog).toContainText('This study is fictional.');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
});

test('find your results by nickname', async ({ page }) => {
    await openDashboard(page);
    const input = page.getByLabel('Your nickname');
    const find = page.getByRole('button', { name: 'Find my results' });

    await input.fill('nobody here 01');
    await find.click();
    await expect(page.locator('[data-find-error]')).toContainText(
        "No results found for 'nobody here 01'"
    );

    // Two participants share this nickname: the reader chooses.
    await input.fill(SHARED_NAME);
    await find.click();
    const choices = page.locator('[data-find-choices-list] a');
    await expect(choices).toHaveCount(2);
    const sessions = await choices.evaluateAll((links) =>
        links.map((link) => new URL(link.href).searchParams.get('session'))
    );
    expect(sessions.sort()).toEqual([...SHARED_SESSIONS].sort());

    // Case and spacing do not matter; a single match opens the results.
    await input.fill(`  ${LEGACY_NAME.toLowerCase()} `);
    await find.click();
    await expect(page).toHaveURL(new RegExp(`/\\?session=${LEGACY_SESSION}$`));
    await expect(
        page.getByRole('heading', { level: 1, name: `Results for ${LEGACY_NAME}` })
    ).toBeVisible();
});

test('the dashboard offers the results of the session saved on this device', async ({ page }) => {
    await startWorkshop(page);
    await rateWithMouse(page, { prediction: 4, rating: 3 });
    const { sessionId, userName } = await savedState(page);

    await openDashboard(page);
    const detected = page.locator('[data-find-detected]');
    await expect(detected).toBeVisible();
    await expect(detected).toContainText(`This device was used to take part as ${userName}.`);
    await detected.getByRole('link', { name: 'View your results' }).click();
    await expect(page).toHaveURL(new RegExp(`/\\?session=${sessionId}$`));
    await expect(
        page.getByRole('heading', { level: 1, name: `Results for ${userName}` })
    ).toBeVisible();
});

test('Active now follows a participant joining and leaving', async ({ page, context }) => {
    await openDashboard(page);
    await expect(page.locator('[data-stat="active"]')).toHaveText('0');
    const participant = await context.newPage();
    await startWorkshop(participant);
    await expect(page.locator('[data-stat="active"]')).toHaveText('1');
    // Closing the page drops the presence entry (onDisconnect) and the figure follows.
    await participant.close();
    await expect(page.locator('[data-stat="active"]')).toHaveText('0', { timeout: 20_000 });
});

test('the past 24 hours tab lists only recent scores', async ({ page }) => {
    await writePath('leaderboard/session_1799999999999_recent1', {
        score: 900,
        papersRated: 10,
        timestamp: SERVER_TIMESTAMP,
        uid: 'recent-uid',
        userName: 'Quick Fox 11',
    });
    await openDashboard(page);
    const rows = page.locator('[data-leaderboard-rows] tr');
    await expect(rows).toHaveCount(rankedEntries.length + 1);

    await page.getByRole('tab', { name: 'Past 24 hours' }).click();
    await expect(page.getByRole('tab', { name: 'Past 24 hours' })).toHaveAttribute(
        'aria-selected',
        'true'
    );
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Quick Fox 11');
    await expect(rows.first()).toContainText('90%');
    // Arrow keys move between the tabs.
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'All time' })).toBeFocused();
});
