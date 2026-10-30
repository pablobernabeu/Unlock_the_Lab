// @vitest-environment jsdom
/**
 * The dashboard sections against the real dashboard.html markup: live updates
 * must keep the chosen sort and keyboard focus, and lookups must be exact.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { qs, qsa } from '../../../src/lib/dom.js';
import { initI18n } from '../../../src/lib/i18n.js';
import { normaliseEntries } from '../../../src/lib/leaderboard.js';
import { createFindResults } from '../../../src/dashboard/find-results.js';
import { createLeaderboard } from '../../../src/dashboard/leaderboard.js';
import { createRoomFilter, urlWithRoom } from '../../../src/dashboard/room-filter.js';
import {
    createVersionFilter,
    urlWithVersion,
    versionFromParam,
} from '../../../src/dashboard/version-filter.js';
import { CONTENT_VERSION } from '../../../src/lib/config.js';
import { createStatsTable } from '../../../src/dashboard/stats-table.js';
import { preserveFocus, syncChildren } from '../../../src/dashboard/focus.js';
import { createConnectionStatus } from '../../../src/dashboard/connection-status.js';

// A path rather than a file URL: under jsdom, import.meta.url is not a file URL.
const PAGE = readFileSync(resolve(process.cwd(), 'dashboard.html'), 'utf8');
const BODY = PAGE.slice(PAGE.indexOf('<body>') + '<body>'.length, PAGE.indexOf('</body>'));

beforeAll(async () => {
    await initI18n({ namespaces: ['dashboard'] });
});

beforeEach(() => {
    document.body.innerHTML = BODY;
    history.replaceState(null, '', '/dashboard.html');
});

afterEach(() => {
    document.body.innerHTML = '';
});

const section = (headingId) => qs(`#${headingId}`).closest('section');

function studyRow(id, mean, n = 3) {
    return {
        id,
        number: Number(id.slice(6)),
        title: `Title of ${id}`,
        shortTitle: `Title of ${id}`,
        expertRating: 4,
        band: 'medium',
        n,
        mean,
        sd: n > 1 ? 1 : null,
        lower: n > 1 ? mean - 1 : null,
        upper: n > 1 ? mean + 1 : null,
        meanPrediction: 4,
        predictions: n,
    };
}

describe('statistics table', () => {
    const rowIds = () => qsa('[data-stats-rows] tr').map((tr) => tr.dataset.key);

    it('sorts with header buttons, shown in aria-sort', () => {
        const table = createStatsTable(qs('[data-stats-table]'), { onOpenStudy: vi.fn() });
        table.update([studyRow('STUDY-10', 2), studyRow('STUDY-2', 5), studyRow('STUDY-1', 3)]);
        expect(rowIds()).toEqual(['STUDY-1', 'STUDY-2', 'STUDY-10']);

        const meanButton = qs('button[data-sort="mean"]');
        meanButton.click();
        expect(rowIds()).toEqual(['STUDY-10', 'STUDY-1', 'STUDY-2']);
        meanButton.click();
        expect(rowIds()).toEqual(['STUDY-2', 'STUDY-1', 'STUDY-10']);
        expect(meanButton.closest('th').getAttribute('aria-sort')).toBe('descending');
        expect(qs('th[data-sort-column="study"]').hasAttribute('aria-sort')).toBe(false);
        expect(table.getSort()).toEqual({ key: 'mean', direction: 'descending' });
    });

    it('keeps the sort and the focused study through a live update that reorders rows', () => {
        const table = createStatsTable(qs('[data-stats-table]'), { onOpenStudy: vi.fn() });
        table.update([studyRow('STUDY-1', 3), studyRow('STUDY-2', 5), studyRow('STUDY-10', 2)]);
        qs('button[data-sort="mean"]').click();
        qs('button[data-sort="mean"]').click();
        const focused = qs('tr[data-key="STUDY-10"] button');
        focused.focus();

        table.update([studyRow('STUDY-1', 3), studyRow('STUDY-2', 5), studyRow('STUDY-10', 6, 4)]);

        expect(rowIds()).toEqual(['STUDY-10', 'STUDY-2', 'STUDY-1']);
        expect(document.activeElement).toBe(focused);
        expect(qs('tr[data-key="STUDY-10"]').cells[3].textContent).toBe('4');
        expect(qs('th[data-sort-column="mean"]').getAttribute('aria-sort')).toBe('descending');
    });

    it('opens a study from its row button with the button as opener', () => {
        const onOpenStudy = vi.fn();
        const table = createStatsTable(qs('[data-stats-table]'), { onOpenStudy });
        table.update([studyRow('STUDY-1', 3)]);
        const button = qs('tr[data-key="STUDY-1"] button');
        button.click();
        expect(onOpenStudy).toHaveBeenCalledWith('STUDY-1', button);
    });

    it('shows dashes for values that cannot be estimated', () => {
        const table = createStatsTable(qs('[data-stats-table]'), { onOpenStudy: vi.fn() });
        table.update([{ ...studyRow('STUDY-1', 3, 1), meanPrediction: null }]);
        const cells = [...qs('tr[data-key="STUDY-1"]').cells].map((cell) => cell.textContent);
        expect(cells.slice(3)).toEqual(['1', '3.00', '–', '–', '–']);
    });
});

describe('leaderboard', () => {
    const now = 1_800_000_000_000;
    const SESSION = (n) => `session_${1700000000000 + n}_abc${n}`;
    const raw = {
        [SESSION(1)]: {
            score: 950,
            papersRated: 10,
            timestamp: now - 5000,
            userName: 'Red Fox 01',
        },
        [SESSION(2)]: {
            score: 900,
            papersRated: 10,
            timestamp: now - 4000,
            userName: 'Blue Owl 02',
        },
        [SESSION(3)]: {
            score: 400,
            papersRated: 4,
            timestamp: now - 3000,
            userName: 'Tall Elk 03',
        },
        [SESSION(4)]: {
            score: 800,
            papersRated: 10,
            timestamp: now - 2 * 86_400_000,
            userName: '<img src=x onerror=alert(1)>',
        },
    };
    const rows = () => qsa('[data-leaderboard-rows] tr');

    it('lists ranked entries with text-only names and results links, and counts the rest', () => {
        const board = createLeaderboard(section('leaderboard-heading'), {
            localSessionId: SESSION(2),
        });
        board.update({ entries: normaliseEntries(raw), now, room: null });
        expect(rows().map((tr) => tr.cells[0].textContent)).toEqual(['1', '2', '3']);
        expect(rows()[1].cells[1].textContent).toContain('Blue Owl 02');
        expect(rows()[1].cells[1].textContent).toContain('This device');
        expect(qs('a', rows()[0]).getAttribute('href')).toBe(`/?session=${SESSION(1)}`);
        // A name that is not a generated nickname is never rendered, let alone as markup.
        expect(rows()[2].cells[1].textContent).toBe('Unnamed participant');
        expect(qs('[data-leaderboard-rows] img')).toBeNull();
        const unranked = qs('[data-leaderboard-unranked]');
        expect(unranked.hidden).toBe(false);
        expect(unranked.textContent).toContain('1 more participant');
    });

    it('keeps focus on a nickname link when an update moves its row', () => {
        const board = createLeaderboard(section('leaderboard-heading'));
        board.update({ entries: normaliseEntries(raw), now, room: null });
        const link = qs('a', rows()[1]);
        link.focus();
        const improved = { ...raw, [SESSION(2)]: { ...raw[SESSION(2)], score: 1000 } };
        board.update({ entries: normaliseEntries(improved), now, room: null });
        expect(qs('a', rows()[0])).toBe(link);
        expect(document.activeElement).toBe(link);
    });

    it('moves focus to the table when the focused row leaves the list', () => {
        const board = createLeaderboard(section('leaderboard-heading'));
        board.update({ entries: normaliseEntries(raw), now, room: null });
        qs('a', rows()[1]).focus();
        const dropped = { ...raw, [SESSION(2)]: { ...raw[SESSION(2)], papersRated: 9 } };
        board.update({ entries: normaliseEntries(dropped), now, room: null });
        expect(rows().map((tr) => tr.dataset.key)).not.toContain(SESSION(2));
        expect(document.activeElement).toBe(qs('[data-leaderboard-wrap]'));
    });

    it('moves focus to the selected tab when the whole table goes', () => {
        const board = createLeaderboard(section('leaderboard-heading'));
        board.update({ entries: normaliseEntries(raw), now, room: null });
        qs('a', rows()[0]).focus();
        board.update({ entries: normaliseEntries(raw), now, room: 'DEMO-1' });
        expect(qs('[data-leaderboard-wrap]').hidden).toBe(true);
        expect(document.activeElement).toBe(qs('#leaderboard-tab-all'));
    });

    it('counts listed participants, not places, on the show-all button', () => {
        const many = {};
        for (let i = 0; i < 30; i++) {
            many[SESSION(100 + i)] = {
                score: 900,
                papersRated: 10,
                timestamp: now - i,
                userName: 'Many Ties 01',
            };
        }
        const board = createLeaderboard(section('leaderboard-heading'));
        board.update({ entries: normaliseEntries(many), now, room: null });
        expect(rows()).toHaveLength(25);
        expect(rows().every((tr) => tr.cells[0].textContent === '1')).toBe(true);
        const more = qs('[data-leaderboard-more]');
        expect(more.textContent).toBe('Show all 30 listed participants');
        more.click();
        expect(rows()).toHaveLength(30);
        expect(more.getAttribute('aria-expanded')).toBe('true');
    });

    it('switches to the past 24 hours with the arrow keys', () => {
        const board = createLeaderboard(section('leaderboard-heading'));
        board.update({ entries: normaliseEntries(raw), now, room: null });
        const [allTab, dayTab] = qsa('[role="tab"]');
        allTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(dayTab.getAttribute('aria-selected')).toBe('true');
        expect(document.activeElement).toBe(dayTab);
        expect(allTab.tabIndex).toBe(-1);
        expect(rows()).toHaveLength(2);
        expect(qs('[data-day-note]').hidden).toBe(false);
        expect(qs('[data-leaderboard-panel]').getAttribute('aria-labelledby')).toBe(dayTab.id);
    });

    it('names the scrolling table after its caption, not the section heading', () => {
        const board = createLeaderboard(section('leaderboard-heading'));
        board.update({ entries: normaliseEntries(raw), now, room: null });
        const wrap = qs('[data-leaderboard-wrap]');
        const label = () => document.getElementById(wrap.getAttribute('aria-labelledby'));
        // Two region landmarks both called 'Leaderboard' would be indistinguishable.
        expect(wrap.getAttribute('aria-labelledby')).not.toBe(
            section('leaderboard-heading').getAttribute('aria-labelledby')
        );
        expect(label()).toBe(qs('[data-leaderboard-caption]'));
        expect(label().textContent).toBe('Leaderboard, all time');
        qsa('[role="tab"]')[1].click();
        expect(label().textContent).toBe('Leaderboard, past 24 hours');
    });

    it('says when no one is ranked, and names the room', () => {
        const board = createLeaderboard(section('leaderboard-heading'));
        board.update({ entries: normaliseEntries(raw), now, room: 'DEMO-1' });
        expect(qs('[data-leaderboard-wrap]').hidden).toBe(true);
        expect(qs('[data-leaderboard-empty]').textContent).toContain('No one is ranked yet');
        expect(qs('[data-leaderboard-room]').textContent).toContain('DEMO-1');
    });
});

describe('find your results', () => {
    const entries = normaliseEntries({
        session_1771630835301_gj69lmk1o: {
            score: 1044,
            papersRated: 12,
            timestamp: 1771632076449,
            userName: 'Red Bear 76',
        },
        session_1771634502453_iienlw3th: {
            score: 1152,
            papersRated: 12,
            timestamp: 1771635019328,
            userName: 'Green Dolphin 30',
        },
        session_1771677565473_cl1qc7d4c: {
            score: 100,
            papersRated: 1,
            timestamp: 1771683192348,
            userName: 'Green Dolphin 30',
        },
    });

    function setUp({ localSessionId = null, loaded = true } = {}) {
        const navigate = vi.fn();
        const finder = createFindResults(section('find-heading'), {
            localSessionId,
            getEntries: () => (loaded ? entries : null),
            navigate,
        });
        const submit = (value) => {
            qs('#find-input').value = value;
            qs('[data-find-form]').dispatchEvent(new Event('submit', { cancelable: true }));
        };
        return { finder, navigate, submit };
    }

    it('opens the only exact match, ignoring case and spaces', () => {
        const { navigate, submit } = setUp();
        submit('  red   BEAR 76 ');
        expect(navigate).toHaveBeenCalledWith('/?session=session_1771630835301_gj69lmk1o');
    });

    it('never matches part of a nickname', () => {
        const { navigate, submit } = setUp();
        submit('Red Bear');
        expect(navigate).not.toHaveBeenCalled();
        expect(qs('[data-find-error]').hidden).toBe(false);
        expect(qs('#find-input').getAttribute('aria-invalid')).toBe('true');
    });

    it('lets people choose when several sessions share a nickname', () => {
        const { navigate, submit } = setUp();
        submit('Green Dolphin 30');
        expect(navigate).not.toHaveBeenCalled();
        const links = qsa('[data-find-choices-list] a');
        expect(links).toHaveLength(2);
        expect(links[0].textContent).toContain('1 study');
        expect(links[1].textContent).toContain('12 studies');
        expect(qs('[data-find-choices]').hidden).toBe(false);
    });

    it('accepts a pasted results link and rejects a broken one', () => {
        const { navigate, submit } = setUp();
        submit('https://unlock-the-lab.web.app/?session=nonsense');
        expect(navigate).not.toHaveBeenCalled();
        submit('https://unlock-the-lab.web.app/?session=session_1771630835301_gj69lmk1o');
        expect(navigate).toHaveBeenCalledWith('/?session=session_1771630835301_gj69lmk1o');
    });

    it('asks people to wait while the nicknames load', () => {
        const { navigate, submit } = setUp({ loaded: false });
        submit('Red Bear 76');
        expect(navigate).not.toHaveBeenCalled();
        expect(qs('[data-find-error]').textContent).toContain('still loading');
    });

    it('offers this device’s results once the data show the session took part', () => {
        const localSessionId = 'session_1771630835301_gj69lmk1o';
        const { finder } = setUp({ localSessionId });
        const panel = qs('[data-find-detected]');
        expect(panel.hidden).toBe(true);
        finder.update({ entries: [], localHasRatings: false });
        expect(panel.hidden).toBe(true);
        finder.update({ entries, localHasRatings: false });
        expect(panel.hidden).toBe(false);
        expect(panel.textContent).toContain('Red Bear 76');
        expect(qs('[data-find-detected-link]').getAttribute('href')).toBe(
            `/?session=${localSessionId}`
        );
    });
});

describe('room filter', () => {
    it('sets and removes the room parameter, keeping the others', () => {
        expect(urlWithRoom('https://x.test/dashboard.html?lang=en', 'DEMO-1')).toBe(
            'https://x.test/dashboard.html?lang=en&room=DEMO-1'
        );
        expect(urlWithRoom('https://x.test/dashboard.html?room=DEMO-1&lang=en', null)).toBe(
            'https://x.test/dashboard.html?lang=en'
        );
    });

    it('lists rooms, keeps the URL in step and reports changes', () => {
        history.replaceState(null, '', '/dashboard.html?room=demo-1');
        const onChange = vi.fn();
        const select = qs('#room-select');
        const filter = createRoomFilter({
            select,
            hint: qs('[data-room-hint]'),
            initialRoom: 'DEMO-1',
            onChange,
        });
        // The code from the link is shown in its normal form.
        expect(location.search).toBe('?room=DEMO-1');
        filter.setRooms(['ROOM-10', 'ROOM-2']);
        expect(qsa('option', select).map((option) => option.value)).toEqual([
            '',
            'DEMO-1',
            'ROOM-2',
            'ROOM-10',
        ]);
        expect(select.value).toBe('DEMO-1');

        select.value = 'ROOM-2';
        select.dispatchEvent(new Event('change'));
        expect(onChange).toHaveBeenLastCalledWith('ROOM-2');
        expect(location.search).toBe('?room=ROOM-2');
        expect(qs('[data-room-hint]').textContent).toContain('ROOM-2');

        select.value = '';
        select.dispatchEvent(new Event('change'));
        expect(onChange).toHaveBeenLastCalledWith(null);
        expect(location.search).toBe('');
    });

    it('drops an invalid room code from the URL', () => {
        history.replaceState(null, '', '/dashboard.html?room=%3Cb%3E&lang=en');
        createRoomFilter({
            select: qs('#room-select'),
            hint: qs('[data-room-hint]'),
            initialRoom: null,
            onChange: vi.fn(),
        });
        expect(location.search).toBe('?lang=en');
    });
});

describe('version filter', () => {
    it('reads the version parameter, falling back to the current version', () => {
        const options = { versions: [1, 2, 3], current: 3 };
        expect(versionFromParam('2', options)).toBe(2);
        expect(versionFromParam('all', options)).toBeNull();
        expect(versionFromParam(null, options)).toBe(3);
        for (const value of ['4', '0', '02', '2.0', ' 2', 'ALL', '']) {
            expect(versionFromParam(value, options)).toBe(3);
        }
    });

    it('sets the version parameter and removes it for the current version', () => {
        expect(urlWithVersion('https://x.test/dashboard.html?room=DEMO-1', 1, 3)).toBe(
            'https://x.test/dashboard.html?room=DEMO-1&version=1'
        );
        expect(urlWithVersion('https://x.test/dashboard.html', null, 3)).toBe(
            'https://x.test/dashboard.html?version=all'
        );
        expect(urlWithVersion('https://x.test/dashboard.html?version=all&lang=en', 3, 3)).toBe(
            'https://x.test/dashboard.html?lang=en'
        );
    });

    it('defaults to the current version, lists every version and reports changes', () => {
        const onChange = vi.fn();
        const select = qs('#version-select');
        createVersionFilter({
            select,
            hint: qs('[data-version-hint]'),
            initialVersion: CONTENT_VERSION,
            onChange,
        });
        const options = qsa('option', select);
        expect(options[0].textContent).toBe(`Version ${CONTENT_VERSION} (current)`);
        expect(options.map((option) => option.value)).toEqual([
            ...Array.from({ length: CONTENT_VERSION }, (_, i) => String(CONTENT_VERSION - i)),
            'all',
        ]);
        expect(select.value).toBe(String(CONTENT_VERSION));
        const hint = qs('[data-version-hint]');
        expect(hint.textContent).toContain(
            'Earlier versions showed different texts and expert ratings.'
        );
        expect(select.getAttribute('aria-describedby')).toBe(hint.id);

        select.value = 'all';
        select.dispatchEvent(new Event('change'));
        expect(onChange).toHaveBeenLastCalledWith(null);
        expect(location.search).toBe('?version=all');
        expect(hint.textContent).toContain('the average of the expert ratings');

        select.value = '1';
        select.dispatchEvent(new Event('change'));
        expect(onChange).toHaveBeenLastCalledWith(1);
        expect(location.search).toBe('?version=1');
        expect(hint.textContent).toContain("compared with that version's expert ratings");

        select.value = String(CONTENT_VERSION);
        select.dispatchEvent(new Event('change'));
        expect(onChange).toHaveBeenLastCalledWith(CONTENT_VERSION);
        expect(location.search).toBe('');
    });

    it('keeps a version from the link and drops an unknown one', () => {
        history.replaceState(null, '', '/dashboard.html?version=1&room=DEMO-1');
        createVersionFilter({
            select: qs('#version-select'),
            hint: qs('[data-version-hint]'),
            initialVersion: versionFromParam('1'),
            onChange: vi.fn(),
        });
        expect(qs('#version-select').value).toBe('1');
        expect(location.search).toBe('?version=1&room=DEMO-1');

        history.replaceState(null, '', '/dashboard.html?version=9&room=DEMO-1');
        createVersionFilter({
            select: qs('#version-select'),
            hint: qs('[data-version-hint]'),
            initialVersion: versionFromParam('9'),
            onChange: vi.fn(),
        });
        expect(qs('#version-select').value).toBe(String(CONTENT_VERSION));
        expect(location.search).toBe('?room=DEMO-1');
    });
});

describe('focus helpers', () => {
    it('restores focus to the element with the same key after a rebuild', () => {
        const list = document.createElement('div');
        document.body.append(list);
        const make = (key) => {
            const button = document.createElement('button');
            button.dataset.focusKey = key;
            return button;
        };
        const first = make('a');
        list.append(first);
        first.focus();
        preserveFocus(list, () => first.replaceWith(make('a')));
        expect(document.activeElement.dataset.focusKey).toBe('a');
        expect(document.activeElement).not.toBe(first);
    });

    it('moves children only when the order changes', () => {
        const parent = document.createElement('ul');
        const items = ['a', 'b', 'c'].map((text) =>
            Object.assign(document.createElement('li'), { textContent: text })
        );
        parent.append(...items);
        const append = vi.spyOn(parent, 'append');
        syncChildren(parent, items);
        expect(append).not.toHaveBeenCalled();
        syncChildren(parent, [items[2], items[0]]);
        expect([...parent.children].map((li) => li.textContent)).toEqual(['c', 'a']);
    });
});

describe('connection status', () => {
    function setUp() {
        let timeUp = null;
        const status = qs('[data-connection]');
        const text = qs('[data-connection-text]');
        const connection = createConnectionStatus({
            status,
            text,
            wait: (callback) => {
                timeUp = callback;
            },
        });
        return { status, text, connection, timeUp: () => timeUp() };
    }

    it('keeps saying it is connecting while Firebase reports its first "not connected"', () => {
        const { status, text, connection } = setUp();
        connection.setConnected(false);
        expect(status.dataset.state).toBeUndefined();
        expect(text.textContent).toContain('Connecting');
        connection.setConnected(true);
        expect(status.dataset.state).toBe('live');
        connection.setConnected(false);
        expect(status.dataset.state).toBe('offline');
        expect(text.textContent).toContain('Connection lost');
    });

    it('says it is offline when the first connection takes too long', () => {
        const { status, connection, timeUp } = setUp();
        connection.setConnected(false);
        timeUp();
        expect(status.dataset.state).toBe('offline');
        connection.setConnected(true);
        expect(status.dataset.state).toBe('live');
    });

    it('does nothing when the page connected in time', () => {
        const { status, connection, timeUp } = setUp();
        connection.setConnected(true);
        timeUp();
        expect(status.dataset.state).toBe('live');
    });
});
