// The facilitator panel: sign-in for administrators only (without touching a
// participant's anonymous session in the same browser), room links with a
// QR code, the CSV export and ending all sessions.
import { readFile } from 'node:fs/promises';
import { ADMIN, API_KEY, NON_ADMIN, readPath, SERVER_TIMESTAMP, writePath } from './emulator.js';
import { fixture, LEGACY_SESSION, ROOM } from './fixture.js';
import {
    finishEarly,
    rateStudies,
    rateWithMouse,
    readFeedback,
    savedState,
    startWorkshop,
} from './helpers.js';
import { expect, test } from './test.js';

const RATING_COLUMNS = [
    'sessionId',
    'studyId',
    'rating',
    'prediction',
    'responseTime',
    'timestamp',
    'uid',
    'contentVersion',
    'feedbackShown',
    'target',
    'score',
    'trial',
    'locale',
    'room',
];

async function signIn(page, { email, password }) {
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Opens the panel signed in as the admin and waits for the live connection. */
async function openPanel(page) {
    await page.goto('/admin.html');
    await signIn(page, ADMIN);
    await expect(page.locator('[data-account-email]')).toHaveText(`Signed in as ${ADMIN.email}`);
    await expect(page.locator('#overview [data-connection]')).toHaveAttribute('data-state', 'live');
}

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF line ends. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i += 1;
            } else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field.replace(/\r$/, ''));
            rows.push(row);
            row = [];
            field = '';
        } else field += char;
    }
    if (field || row.length) rows.push([...row, field]);
    return rows;
}

test('only administrators get the panel, and the participant in the same browser carries on', async ({
    page,
    context,
    accounts,
}) => {
    // A participant has started in this browser.
    await startWorkshop(page);
    const { sessionId } = await savedState(page);
    await rateWithMouse(page, { prediction: 4, rating: 4 });
    const { uid } = await readPath(`sessions/${sessionId}`);

    const admin = await context.newPage();
    await admin.goto('/admin.html');
    await expect(admin.getByRole('heading', { level: 2, name: 'Sign in' })).toBeVisible();

    // An account that is not under /admins is told so and signed out.
    await signIn(admin, NON_ADMIN);
    const alert = admin.locator('[data-login-alert]');
    await expect(alert).toContainText('This account is not an administrator');
    await expect(alert).toContainText(`User ID: ${accounts.nonAdminUid}`);
    await expect(admin.locator('[data-panel]')).toBeHidden();
    await expect(admin.getByLabel('Email address')).toBeVisible();
    expect(
        await admin.evaluate(
            (key) => sessionStorage.getItem(key),
            `firebase:authUser:${API_KEY}:admin`
        )
    ).toBeNull();

    // The administrator gets the panel with the live figures.
    await signIn(admin, ADMIN);
    await expect(admin.locator('[data-account-email]')).toHaveText(`Signed in as ${ADMIN.email}`);
    await expect(admin.locator('[data-stat="sessions"]')).toHaveText(
        String(Object.keys(fixture.sessions).length + 1)
    );

    // The participant keeps the same session and anonymous user.
    await page.bringToFront();
    await page.reload();
    await expect(page.locator('#feedback-heading')).toBeVisible();
    await page.getByRole('button', { name: 'Next study' }).click();
    await rateWithMouse(page, { prediction: 3, rating: 5 });
    expect((await savedState(page)).sessionId).toBe(sessionId);
    await expect
        .poll(() => readPath(`leaderboard/${sessionId}`))
        .toMatchObject({ papersRated: 2, uid });

    // Signing out of the panel leaves the participant alone too.
    await admin.getByRole('button', { name: 'Sign out' }).click();
    await expect(admin.locator('[data-app-status]')).toHaveText('You have signed out.');
    await expect(admin.getByLabel('Email address')).toBeVisible();
    await page.reload();
    await expect(page.locator('#feedback-heading')).toBeVisible();
    expect((await readFeedback(page)).score).toBeGreaterThanOrEqual(0);
    expect((await readPath(`sessions/${sessionId}`)).uid).toBe(uid);
});

test('room links come with a QR code', async ({ page, baseURL }) => {
    await openPanel(page);
    const code = page.getByLabel('Room code');

    await code.fill('x');
    await code.press('Enter');
    await expect(code).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-room-result]')).toBeHidden();

    await code.fill(' demo-2 ');
    await page.getByRole('button', { name: 'Make links' }).click();
    await expect(page.getByRole('heading', { name: 'Links for room DEMO-2' })).toBeFocused();
    await expect(code).toHaveValue('DEMO-2');
    await expect(page.getByLabel('Workshop link for participants')).toHaveValue(
        `${baseURL}/?room=DEMO-2`
    );
    await expect(page.getByLabel('Dashboard link for this room')).toHaveValue(
        `${baseURL}/dashboard.html?room=DEMO-2`
    );
    await expect(page.locator('[data-room-usage]')).toHaveText(
        'No one has used this room code yet.'
    );
    const qr = page.getByRole('img', { name: 'QR code for the workshop link for room DEMO-2' });
    await expect(qr).toBeVisible();
    expect(await qr.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(await qr.evaluate((image) => image.naturalWidth)).toBe(1024);
    const download = page.getByRole('link', { name: 'Download QR code (PNG)' });
    await expect(download).toHaveAttribute('download', 'unlock-the-lab-room-DEMO-2-qr.png');

    // A code already in use says so.
    await code.fill(ROOM);
    await code.press('Enter');
    await expect(page.locator('[data-room-usage]')).toContainText(
        `1 participant has already used room ${ROOM}.`
    );
    await expect(
        page.getByRole('img', { name: `QR code for the workshop link for room ${ROOM}` })
    ).toBeVisible();
});

test('the ratings CSV export holds every rating', async ({ page }) => {
    await openPanel(page);
    const ratings = await readPath('ratings');
    const expected = Object.values(ratings).reduce(
        (total, node) => total + Object.keys(node).length,
        0
    );

    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download ratings as CSV' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(
        /^unlock-the-lab-ratings-\d{4}-\d{2}-\d{2}-\d{4}\.csv$/
    );
    const rows = parseCsv(await readFile(await download.path(), 'utf8'));
    const [header, ...records] = rows;
    expect(header).toEqual(RATING_COLUMNS);
    expect(records).toHaveLength(expected);
    for (const record of records) expect(record).toHaveLength(RATING_COLUMNS.length);

    const column = (name) => RATING_COLUMNS.indexOf(name);
    const legacy = records.filter((record) => record[column('sessionId')] === LEGACY_SESSION);
    expect(legacy).toHaveLength(fixture.leaderboard[LEGACY_SESSION].papersRated);
    const [studyId, record] = Object.entries(ratings).find(([, node]) => node[LEGACY_SESSION]);
    const row = legacy.find((cells) => cells[column('studyId')] === studyId);
    expect(row[column('rating')]).toBe(String(record[LEGACY_SESSION].rating));
    expect(row[column('room')]).toBe('');
    // The oldest records were bare numbers: only the rating is filled in.
    const bare = records.find((cells) => cells[column('sessionId')].endsWith('_barenum'));
    expect(bare[column('rating')]).toBe('2');
    expect(bare[column('uid')]).toBe('');
    await expect(page.locator('[data-export-status]')).toContainText('.csv');
});

test('ending all sessions closes an open participant page', async ({ page, context }) => {
    await startWorkshop(page);
    const { sessionId } = await savedState(page);
    await rateWithMouse(page, { prediction: 5, rating: 5 });
    await expect.poll(() => readPath(`active/${sessionId}`)).not.toBeNull();

    const admin = await context.newPage();
    await openPanel(admin);
    const before = Date.now();
    await admin.getByRole('button', { name: 'End all active sessions' }).click();
    const dialog = admin.getByRole('dialog', { name: 'End all active sessions?' });
    await expect(dialog).toBeVisible();
    // A destructive question starts on Cancel.
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await dialog.getByRole('button', { name: 'End all sessions' }).click();
    await expect(admin.locator('[data-end-status]')).toContainText('Done.');

    const endedAt = await readPath('control/sessionsEndedAt');
    expect(endedAt).toBeGreaterThanOrEqual(before - 2000);
    expect(endedAt).toBeLessThanOrEqual(Date.now() + 2000);
    await expect.poll(() => readPath('active')).toBeNull();

    const closed = page.getByRole('heading', {
        level: 1,
        name: 'The facilitator has closed this session',
    });
    await expect(closed).toBeVisible();
    await expect(page).toHaveTitle('The facilitator has closed this session – Unlock the Lab');
    await expect(page.locator('#view-message')).toContainText(
        'Results are available after rating at least 10 studies'
    );
    await expect(
        page.locator('#view-message').getByRole('button', { name: 'Start as a new participant' })
    ).toBeVisible();

    // It stays closed after a reload.
    await page.reload();
    await expect(closed).toBeVisible();
    expect(await readPath(`active/${sessionId}`)).toBeNull();
});

test('a participant closed on the weights page with 10 rated can still see the results', async ({
    page,
    context,
}) => {
    await startWorkshop(page);
    const scores = await rateStudies(page, 10);
    await finishEarly(page);

    const admin = await context.newPage();
    await openPanel(admin);
    await admin.getByRole('button', { name: 'End all active sessions' }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'End all sessions' }).click();
    await expect(admin.locator('[data-end-status]')).toContainText('Done.');

    await page.bringToFront();
    await expect(
        page.getByRole('heading', { level: 1, name: 'The facilitator has closed this session' })
    ).toBeVisible();
    await expect(page.locator('#view-message')).toContainText(
        'You have rated enough studies to see your results.'
    );
    await page.getByRole('button', { name: 'See my results' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your results' })).toBeVisible();
    const total = scores.reduce((sum, score) => sum + score, 0);
    await expect(page.locator('.results-score__value')).toHaveText(`${Math.round(total / 10)}%`);
    await expect(page.locator('.results-board table')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Your results' })).toBeVisible();
});

test('deleting participant data removes exactly the participant nodes', async ({
    page,
    accounts,
}) => {
    await writePath('active/session_1799999999999_present', {
        joinedAt: SERVER_TIMESTAMP,
        lastActive: SERVER_TIMESTAMP,
        uid: 'present-uid',
    });
    await writePath('control/sessionsEndedAt', 1_700_000_000_000);
    await openPanel(page);

    await page.getByRole('button', { name: 'Delete participant data…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete all participant data?' });
    await expect(dialog).toBeVisible();
    const field = dialog.getByRole('textbox');
    const label = await dialog.locator('label').textContent();
    const expected = /type the number of participants: (\d+)/.exec(label)?.[1];
    expect(Number(expected)).toBeGreaterThan(0);
    const confirm = dialog.getByRole('button', { name: 'Delete permanently' });
    await field.fill(String(Number(expected) + 1));
    await expect(confirm).toBeDisabled();
    await field.fill(expected);
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.locator('[data-delete-status]')).toContainText('Deleted.');

    for (const node of ['ratings', 'leaderboard', 'rankings', 'sessions', 'active']) {
        expect(await readPath(node), node).toBeNull();
    }
    expect(await readPath('admins')).toEqual({ [accounts.adminUid]: true });
    expect(await readPath('control/sessionsEndedAt')).toBe(1_700_000_000_000);
});
