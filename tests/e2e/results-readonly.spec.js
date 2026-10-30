// Shared results links (`/?session=`): v1 links keep working, the page only
// reads (no sign-in, no database writes, nothing stored in the browser) and
// a nickname shared by several participants offers a choice.
import { readPath } from './emulator.js';
import {
    LEGACY_NAME,
    LEGACY_SESSION,
    participants,
    SHARED_NAME,
    SHARED_SESSIONS,
} from './fixture.js';
import { watchDatabase } from './helpers.js';
import { expect, test } from './test.js';

/** Database actions that change data or authenticate (see watchDatabase). */
const WRITE_ACTIONS = new Set(['p', 'm', 'o', 'om', 'oc', 'auth', 'gauth', 'unauth']);

/**
 * Intercepts every request to the Auth emulator or Google's sign-in hosts
 * (recorded, then let through) and records the database traffic.
 */
async function watchTraffic(page) {
    const auth = [];
    await page.route(/:9099\/|identitytoolkit\.googleapis|securetoken\.googleapis/, (route) => {
        auth.push(route.request().url());
        return route.continue();
    });
    const longPolls = [];
    page.on('request', (request) => {
        if (/\/\.lp\?/.test(request.url())) longPolls.push(request.url());
    });
    const database = watchDatabase(page);
    return {
        auth,
        get sockets() {
            return database.sockets;
        },
        get writes() {
            return [
                ...database.requests.filter(({ action }) => WRITE_ACTIONS.has(action)),
                ...longPolls,
            ];
        },
    };
}

test('a v1 results link renders read-only without signing in or writing', async ({ page }) => {
    const before = await readPath('');
    const traffic = await watchTraffic(page);
    const { leaderboard, ratings } = participants[LEGACY_SESSION];

    await page.goto(`/?session=${LEGACY_SESSION}`);
    await expect(
        page.getByRole('heading', { level: 1, name: `Results for ${LEGACY_NAME}` })
    ).toBeVisible();
    await expect(page).toHaveTitle(`Results for ${LEGACY_NAME} – Unlock the Lab`);
    await expect(page.locator('#results-readonly-note')).toBeVisible();
    await expect(page.locator('.results-score__value')).toHaveText(
        `${Math.round(leaderboard.score / leaderboard.papersRated)}%`
    );
    await expect(page.locator('.results-score__caption')).toHaveText(
        `${LEGACY_NAME}'s average score per study, over 12 studies`
    );
    await expect(page.locator('.results-rank')).toContainText(`${LEGACY_NAME}'s position:`);
    await expect(page.locator('.review-item')).toHaveCount(Object.keys(ratings).length);
    // Version 1 answers say so, and the page explains once that the title and feedback are current.
    await expect(page.locator('.review-item__note')).toHaveCount(Object.keys(ratings).length);
    await expect(page.locator('.review-item__note').first()).toHaveText(
        'Given to content version 1 of this study.'
    );
    await expect(page.getByText('Some answers were given to an earlier version')).toHaveCount(1);
    // Written for a reader, not the participant.
    await expect(page.locator('#results-thanks')).toBeHidden();
    await expect(page.locator('#results-nickname')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Take part in the workshop' })).toBeVisible();
    await expect(page.locator('#score-banner')).toBeHidden();
    await expect(page.locator('#footer-new-participant')).toBeHidden();

    // Let the leaderboard and the comparison finish loading before judging the traffic.
    await expect(page.locator('.results-board table')).toBeVisible();
    await expect(page.locator('.chart-box canvas, .results-details')).not.toHaveCount(0);
    await page.waitForTimeout(1000);

    expect(traffic.sockets, 'the page reads the database over a websocket').toBeGreaterThan(0);
    expect(traffic.auth, 'sign-in requests').toEqual([]);
    expect(traffic.writes).toEqual([]);
    expect(await readPath('')).toEqual(before);
    expect(
        await page.evaluate(() => Object.keys(localStorage).filter((key) => key !== 'utl.motion'))
    ).toEqual([]);

    // The same watcher does see a participant who starts the workshop sign in and write.
    await page.goto('/');
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect.poll(() => traffic.writes.length).toBeGreaterThan(0);
    expect(traffic.auth.length).toBeGreaterThan(0);
});

test('a results link by nickname opens the results, or a choice when the name is shared', async ({
    page,
}) => {
    const traffic = await watchTraffic(page);

    await page.goto(`/?session=${encodeURIComponent(LEGACY_NAME.toLowerCase())}`);
    await expect(
        page.getByRole('heading', { level: 1, name: `Results for ${LEGACY_NAME}` })
    ).toBeVisible();

    await page.goto(`/?session=${encodeURIComponent(SHARED_NAME)}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Choose the results' })).toBeVisible();
    await expect(page).toHaveTitle('Choose the results – Unlock the Lab');
    const choices = page.locator('.choose-list a');
    await expect(choices).toHaveCount(2);
    // Newest first.
    const hrefs = await choices.evaluateAll((links) => links.map((link) => link.href));
    expect(hrefs.map((href) => new URL(href).searchParams.get('session'))).toEqual([
        SHARED_SESSIONS[1],
        SHARED_SESSIONS[0],
    ]);
    await expect(choices.first()).toContainText(`${SHARED_NAME}, 4 rated`);

    await choices.nth(1).click();
    await expect(
        page.getByRole('heading', { level: 1, name: `Results for ${SHARED_NAME}` })
    ).toBeVisible();
    await expect(page.locator('.results-score__caption')).toContainText('over 10 studies');

    await page.goto('/?session=Nobody%20Here%2001');
    await expect(page.getByRole('heading', { level: 1, name: 'Results not found' })).toBeVisible();

    expect(traffic.auth).toEqual([]);
    expect(traffic.writes).toEqual([]);
});

test('results links for the oldest record shapes still render', async ({ page }) => {
    // A bare-number rating with no leaderboard entry.
    await page.goto('/?session=session_1770063449463_barenum');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Results for Unnamed participant' })
    ).toBeVisible();
    await expect(page.locator('#results-dynamic')).toContainText('No score was recorded.');
    await expect(page.locator('.results-rank')).toHaveText(
        'This session is not on the leaderboard.'
    );
    await expect(page.locator('.review-item')).toHaveCount(1);
    await expect(page.locator('.review-item')).toContainText('not recorded');

    // A leaderboard entry with an empty nickname and a single rating.
    await page.goto('/?session=session_1772371401905_legacyc3');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Results for Unnamed participant' })
    ).toBeVisible();
    await expect(page.locator('.results-rank')).toHaveText(
        'Unnamed participant rated fewer than 10 studies, so is not ranked.'
    );
    await expect(page.locator('.results-score__caption')).toHaveText(
        "Unnamed participant's average score per study, over 1 study"
    );
});
