// Workshop rooms (`?room=CODE`): a participant's records carry the room, the
// results page offers the room's leaderboard and everyone's, and the
// dashboard can show one room only.
import { readPath } from './emulator.js';
import { fixture, ROOM, ROOM_NAME, ROOM_SESSION } from './fixture.js';
import {
    allocateTokens,
    expectedRank,
    finishEarly,
    rateStudies,
    savedState,
    startWorkshop,
} from './helpers.js';
import { expect, test } from './test.js';

function countRatings(node, keep = () => true) {
    return Object.values(node).reduce(
        (total, study) => total + Object.values(study).filter(keep).length,
        0
    );
}

test('a participant in a room records the room and sees both leaderboards', async ({ page }) => {
    await startWorkshop(page, `/?room=${ROOM}`);
    const { sessionId, room } = await savedState(page);
    expect(room).toBe(ROOM);
    await expect.poll(() => readPath(`sessions/${sessionId}`)).toMatchObject({ room: ROOM });
    await expect.poll(() => readPath(`active/${sessionId}`)).toMatchObject({ room: ROOM });

    const scores = await rateStudies(page, 10);
    await finishEarly(page);
    await allocateTokens(page);

    const ratings = await readPath('ratings');
    const own = Object.values(ratings)
        .map((study) => study[sessionId])
        .filter(Boolean);
    expect(own).toHaveLength(10);
    for (const record of own) expect(record.room).toBe(ROOM);
    await expect
        .poll(() => readPath(`leaderboard/${sessionId}`))
        .toMatchObject({ papersRated: 10, room: ROOM });
    expect(await readPath(`rankings/${sessionId}`)).toMatchObject({ room: ROOM });

    // The results page starts on this workshop's leaderboard.
    const scope = page.getByRole('group', { name: 'Leaderboard to show' });
    const roomOption = scope.getByRole('radio', { name: `This workshop (${ROOM})` });
    const everyone = scope.getByRole('radio', { name: 'Everyone' });
    await expect(roomOption).toBeChecked();
    await expect(everyone).not.toBeChecked();

    const leaderboard = await readPath('leaderboard');
    const inRoom = expectedRank(leaderboard, sessionId, { room: ROOM });
    const overall = expectedRank(leaderboard, sessionId);
    expect(inRoom.count).toBe(2);
    expect(overall.count).toBeGreaterThan(inRoom.count);
    const rank = page.locator('.results-rank');
    const rows = page.locator('.results-board tbody tr');
    const caption = page.locator('.results-board caption');

    await expect(rank).toHaveText(
        `Your position: ${inRoom.rank} of ${inRoom.count} ranked participants.`
    );
    await expect(caption).toHaveText(`This workshop (${ROOM})`);
    await expect(rows).toHaveCount(2);
    await expect(page.locator('.results-board tbody')).toContainText(ROOM_NAME);

    await everyone.check();
    await expect(rank).toHaveText(
        `Your position: ${overall.rank} of ${overall.count} ranked participants.`
    );
    await expect(caption).toHaveText('Everyone');
    await expect(rows).toHaveCount(Math.min(5, overall.count));

    await roomOption.check();
    await expect(rows).toHaveCount(2);
    const total = scores.reduce((sum, score) => sum + score, 0);
    await expect(page.locator('.results-score__value')).toHaveText(`${Math.round(total / 10)}%`);
});

test('the dashboard filtered to a room shows only that room', async ({ page }) => {
    const roomRatings = countRatings(fixture.ratings, (record) => record?.room === ROOM);
    const allRatings = countRatings(fixture.ratings);
    expect(roomRatings).toBeGreaterThan(0);

    await page.goto(`/dashboard.html?room=${ROOM.toLowerCase()}`);
    // A lower-case code in the link is corrected.
    await expect(page).toHaveURL(new RegExp(`\\?room=${ROOM}$`));
    const select = page.getByLabel('Room', { exact: true });
    await expect(select).toHaveValue(ROOM);
    await expect(page.locator('[data-stat="ratings"]')).toHaveText(String(roomRatings));
    await expect(page.locator('[data-stat="participants"]')).toHaveText('1');
    await expect(page.locator('[data-leaderboard-rows] tr')).toHaveCount(1);
    await expect(page.locator('[data-leaderboard-rows]')).toContainText(ROOM_NAME);
    await expect(page.locator('[data-criteria-count]')).toHaveText(
        'Based on 1 participant who shared out all their tokens.'
    );
    const tableTotal = await page
        .locator('[data-stats-rows] tr td:nth-child(4)')
        .evaluateAll((cells) =>
            cells.reduce((sum, cell) => sum + (Number(cell.textContent) || 0), 0)
        );
    expect(tableTotal).toBe(roomRatings);

    // All rooms brings everything back.
    await select.selectOption('');
    await expect(page).toHaveURL(/\/dashboard\.html$/);
    await expect(page.locator('[data-stat="ratings"]')).toHaveText(String(allRatings));
    await expect(page.locator('[data-leaderboard-rows] tr')).toHaveCount(
        Object.values(fixture.leaderboard).filter((entry) => entry.papersRated >= 10).length
    );
    expect(fixture.sessions[ROOM_SESSION].room).toBe(ROOM);
});
