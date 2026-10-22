import { describe, expect, it } from 'vitest';
import { ACTIVE_WINDOW_MS, MIN_STUDIES_TO_FINISH } from '../../../src/lib/config.js';
import { normaliseEntries } from '../../../src/lib/leaderboard.js';
import { tCritical95 } from '../../../src/lib/stats.js';
import {
    CLOCK_TOLERANCE_MS,
    DAY_MS,
    chartSummary,
    collectRooms,
    countActive,
    criterionShares,
    errorBarSegment,
    groupRatings,
    inRoom,
    leaderboardView,
    localSessionId,
    overviewCounts,
    parseLookup,
    plainText,
    recordRoom,
    resultsHref,
    sessionHasRatings,
    shareScaleMax,
    shortTitle,
    sortStudyRows,
    studyRows,
} from '../../../src/dashboard/data.js';

const S1 = 'session_1771630835301_gj69lmk1o';
const S2 = 'session_1771634502453_iienlw3th';
const S3 = 'session_1790362780158_vajs8e9ta';
const S4 = 'session_1800000000000_room1';

/** Every shape /ratings holds: v1 objects, bare numbers, v2 records with rooms, and junk. */
const RATINGS = {
    'STUDY-1': {
        [S1]: { rating: 2, prediction: 3, timestamp: 1, uid: 'a' },
        [S2]: 4,
        [S3]: { rating: 6, prediction: 5, room: 'DEMO-1' },
        session_bad_value: { rating: 8, prediction: 2 },
        session_zero: { rating: 0 },
        session_string: { rating: '5' },
        session_null: null,
    },
    'STUDY-2': {
        [S1]: { rating: 5, prediction: 9 },
        [S4]: { rating: 3, prediction: 4, room: 'DEMO-1' },
    },
    'STUDY-10': { [S1]: { rating: 7, prediction: 6, room: 'not a room' } },
    'STUDY-99': { [S1]: { rating: 4 } },
    'paper-1': { [S1]: { rating: 4 } },
    'STUDY-3': 'not an object',
};

const STUDIES = [
    { id: 'STUDY-1', title: 'Effects in <i>N</i> = 12   pupils', expertRating: 1 },
    { id: 'STUDY-2', title: 'A study', expertRating: 6 },
    { id: 'STUDY-3', title: 'Unrated', expertRating: 4 },
    { id: 'STUDY-10', title: 'Tenth', expertRating: 5 },
];
const STUDY_IDS = STUDIES.map((study) => study.id);

describe('recordRoom and inRoom', () => {
    it('reads valid room codes only', () => {
        expect(recordRoom({ room: 'DEMO-1' })).toBe('DEMO-1');
        expect(recordRoom({ room: 'demo-1' })).toBeNull();
        expect(recordRoom({ room: '<b>' })).toBeNull();
        expect(recordRoom({ rating: 4 })).toBeNull();
        expect(recordRoom(4)).toBeNull();
        expect(recordRoom(null)).toBeNull();
        expect(recordRoom([{ room: 'DEMO-1' }])).toBeNull();
    });

    it('keeps everything when no room is selected and v1 records only then', () => {
        expect(inRoom({ rating: 4 }, null)).toBe(true);
        expect(inRoom(4, null)).toBe(true);
        expect(inRoom({ rating: 4 }, 'DEMO-1')).toBe(false);
        expect(inRoom({ room: 'DEMO-1' }, 'DEMO-1')).toBe(true);
        expect(inRoom({ room: 'OTHER' }, 'DEMO-1')).toBe(false);
    });
});

describe('groupRatings', () => {
    it('keeps valid ratings from every shape, with predictions from the same records', () => {
        const groups = groupRatings(RATINGS);
        expect(groups.get('STUDY-1')).toEqual({
            ratings: [2, 4, 6],
            predictions: [3, 5],
            sessionIds: [S1, S2, S3],
        });
        // An out-of-range prediction is dropped but its rating still counts.
        expect(groups.get('STUDY-2')).toEqual({
            ratings: [5, 3],
            predictions: [4],
            sessionIds: [S1, S4],
        });
    });

    it('ignores malformed study ids and non-object study nodes', () => {
        const groups = groupRatings(RATINGS);
        expect(groups.has('paper-1')).toBe(false);
        expect(groups.has('STUDY-3')).toBe(false);
        expect(groups.has('STUDY-99')).toBe(true);
    });

    it('keeps only the listed studies', () => {
        const groups = groupRatings(RATINGS, { studyIds: STUDY_IDS });
        expect([...groups.keys()].sort()).toEqual(['STUDY-1', 'STUDY-10', 'STUDY-2']);
    });

    it('filters by each rating’s own room, treating v1 records and invalid codes as no room', () => {
        const groups = groupRatings(RATINGS, { room: 'DEMO-1' });
        expect(groups.get('STUDY-1').ratings).toEqual([6]);
        expect(groups.get('STUDY-2').sessionIds).toEqual([S4]);
        expect(groups.get('STUDY-10').ratings).toEqual([]);
    });

    it('returns an empty map for a missing node', () => {
        expect(groupRatings(null).size).toBe(0);
        expect(groupRatings(undefined).size).toBe(0);
        expect(groupRatings(5).size).toBe(0);
    });
});

describe('overviewCounts', () => {
    it('counts sessions with a rating, ratings and sessions with enough ratings', () => {
        const groups = groupRatings(RATINGS, { studyIds: STUDY_IDS });
        expect(overviewCounts(groups, { minStudies: 2 })).toEqual({
            participants: 4,
            ratings: 6,
            completed: 1,
        });
    });

    it('uses the finishing threshold by default', () => {
        const node = {};
        for (let index = 1; index <= MIN_STUDIES_TO_FINISH; index++) {
            node[`STUDY-${index}`] = { [S1]: { rating: 4 }, ...(index < 3 ? { [S2]: 5 } : {}) };
        }
        expect(overviewCounts(groupRatings(node))).toEqual({
            participants: 2,
            ratings: MIN_STUDIES_TO_FINISH + 2,
            completed: 1,
        });
    });

    it('is all zeros without data', () => {
        expect(overviewCounts(new Map())).toEqual({ participants: 0, ratings: 0, completed: 0 });
    });
});

describe('plainText and shortTitle', () => {
    it('strips trusted markup and collapses spaces', () => {
        expect(plainText('Effects in <i>N</i> = 12   pupils ')).toBe('Effects in N = 12 pupils');
        expect(plainText(null)).toBe('');
    });

    it('keeps short titles and cuts long ones at a word boundary', () => {
        expect(shortTitle('A short title')).toBe('A short title');
        const long = 'The impact of chocolate-based breakfasts on mathematical performance';
        expect(shortTitle(long, 30)).toBe('The impact of chocolate-based…');
        expect(shortTitle(long, 25)).toBe('The impact of…');
        expect(shortTitle(long).length).toBeLessThanOrEqual(48);
        expect(shortTitle('Supercalifragilisticexpialidocious and more', 12)).toBe('Supercalifr…');
    });

    it('does not leave punctuation before the ellipsis', () => {
        expect(shortTitle('Sleep, screens, and teenagers in schools', 16)).toBe('Sleep, screens…');
    });
});

describe('studyRows', () => {
    const rows = studyRows(STUDIES, groupRatings(RATINGS, { studyIds: STUDY_IDS }));
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    it('gives one row per study in content order', () => {
        expect(rows.map((row) => row.id)).toEqual(STUDY_IDS);
        expect(byId['STUDY-10'].number).toBe(10);
    });

    it('computes the participant mean, SD and 95% t interval from ratings only', () => {
        const row = byId['STUDY-1'];
        expect(row.n).toBe(3);
        expect(row.mean).toBe(4);
        expect(row.sd).toBe(2);
        const half = (tCritical95(2) * 2) / Math.sqrt(3);
        expect(row.lower).toBeCloseTo(4 - half, 10);
        expect(row.upper).toBeCloseTo(4 + half, 10);
        // The expert rating (1) is not mixed in.
        expect(row.expertRating).toBe(1);
        expect(row.band).toBe('low');
    });

    it('gives the mean prediction and how many predictions it rests on', () => {
        expect(byId['STUDY-1'].meanPrediction).toBe(4);
        expect(byId['STUDY-1'].predictions).toBe(2);
        expect(byId['STUDY-2'].meanPrediction).toBe(4);
        expect(byId['STUDY-2'].predictions).toBe(1);
    });

    it('leaves spread and interval empty below two ratings and everything empty at zero', () => {
        expect(byId['STUDY-10']).toMatchObject({ n: 1, mean: 7, sd: null, lower: null });
        expect(byId['STUDY-3']).toMatchObject({
            n: 0,
            mean: null,
            sd: null,
            lower: null,
            upper: null,
            meanPrediction: null,
            band: 'medium',
        });
    });

    it('uses plain and shortened titles', () => {
        expect(byId['STUDY-1'].title).toBe('Effects in N = 12 pupils');
        expect(byId['STUDY-1'].shortTitle).toBe('Effects in N = 12 pupils');
    });

    it('treats a missing or invalid expert rating as none', () => {
        const [row] = studyRows([{ id: 'STUDY-5', title: 'x', expertRating: 9 }], new Map());
        expect(row).toMatchObject({ expertRating: null, band: null, n: 0 });
    });
});

describe('chartSummary', () => {
    it('counts rated studies and those within one point of the expert', () => {
        const rows = studyRows(STUDIES, groupRatings(RATINGS, { studyIds: STUDY_IDS }));
        // STUDY-1 mean 4 vs 1 (no), STUDY-2 mean 4 vs 6 (no), STUDY-10 mean 7 vs 5 (no).
        expect(chartSummary(rows)).toEqual({ total: 4, rated: 3, close: 0 });
        const close = rows.map((row) => ({ ...row, expertRating: row.mean === null ? 4 : 5 }));
        // |4 − 5| = 1 counts as within one point; |7 − 5| = 2 does not.
        expect(chartSummary(close)).toEqual({ total: 4, rated: 3, close: 2 });
    });
});

describe('sortStudyRows', () => {
    const row = (id, overrides = {}) => ({
        id,
        title: id,
        expertRating: null,
        n: 0,
        mean: null,
        sd: null,
        lower: null,
        meanPrediction: null,
        ...overrides,
    });
    const rows = [
        row('STUDY-10', { mean: 3, n: 2, title: 'beta', lower: 1 }),
        row('STUDY-2', { mean: null, n: 0, title: 'Alpha' }),
        row('STUDY-1', { mean: 5, n: 2, title: 'gamma', lower: 0.5 }),
        row('STUDY-9', { mean: 3, n: 1, title: 'delta', lower: null }),
    ];
    const ids = (sorted) => sorted.map((item) => item.id);

    it('sorts study ids by number in both directions', () => {
        expect(ids(sortStudyRows(rows))).toEqual(['STUDY-1', 'STUDY-2', 'STUDY-9', 'STUDY-10']);
        expect(ids(sortStudyRows(rows, { key: 'study', direction: 'descending' }))).toEqual([
            'STUDY-10',
            'STUDY-9',
            'STUDY-2',
            'STUDY-1',
        ]);
    });

    it('puts missing values last in both directions and breaks ties by study number', () => {
        expect(ids(sortStudyRows(rows, { key: 'mean' }))).toEqual([
            'STUDY-9',
            'STUDY-10',
            'STUDY-1',
            'STUDY-2',
        ]);
        expect(ids(sortStudyRows(rows, { key: 'mean', direction: 'descending' }))).toEqual([
            'STUDY-1',
            'STUDY-9',
            'STUDY-10',
            'STUDY-2',
        ]);
    });

    it('sorts the interval column by its lower limit', () => {
        expect(ids(sortStudyRows(rows, { key: 'ci' }))).toEqual([
            'STUDY-1',
            'STUDY-10',
            'STUDY-2',
            'STUDY-9',
        ]);
    });

    it('sorts titles with the locale, ignoring case', () => {
        expect(ids(sortStudyRows(rows, { key: 'title' }))).toEqual([
            'STUDY-2',
            'STUDY-10',
            'STUDY-9',
            'STUDY-1',
        ]);
    });

    it('does not change the input', () => {
        const copy = [...rows];
        sortStudyRows(rows, { key: 'n', direction: 'descending' });
        expect(rows).toEqual(copy);
    });

    it('falls back to study order for an unknown key', () => {
        expect(ids(sortStudyRows(rows, { key: 'nonsense' }))).toEqual([
            'STUDY-1',
            'STUDY-2',
            'STUDY-9',
            'STUDY-10',
        ]);
    });
});

describe('countActive', () => {
    const now = 1_800_000_000_000;
    const node = {
        a: { lastActive: now - 1000, joinedAt: now - 5000 },
        b: { lastActive: now - ACTIVE_WINDOW_MS },
        c: { lastActive: now - ACTIVE_WINDOW_MS - 1 },
        d: { lastActive: now + ACTIVE_WINDOW_MS + 1 },
        e: { joinedAt: now },
        f: 'junk',
        g: { lastActive: now, room: 'DEMO-1' },
        h: { lastActive: '1800000000000' },
    };

    it('counts heartbeats inside the window and ignores impossible ones', () => {
        expect(countActive(node, { now })).toBe(3);
    });

    it('filters by room', () => {
        expect(countActive(node, { now, room: 'DEMO-1' })).toBe(1);
        expect(countActive(node, { now, room: 'OTHER' })).toBe(0);
    });

    it('takes the window as an option and copes with a missing node', () => {
        expect(countActive(node, { now, windowMs: 500 })).toBe(1);
        expect(countActive(null, { now })).toBe(0);
    });
});

describe('collectRooms', () => {
    it('gathers valid codes from several nodes, without duplicates, in natural order', () => {
        const sessions = { s1: { room: 'ROOM-10' }, s2: { room: 'ROOM-2' }, s3: { uid: 'x' } };
        const leaderboard = { s4: { room: 'DEMO-1' }, s5: { room: 'bad room' }, s6: 4 };
        const rankings = { s7: { room: 'ROOM-2' } };
        expect(collectRooms(sessions, leaderboard, rankings, null)).toEqual([
            'DEMO-1',
            'ROOM-2',
            'ROOM-10',
        ]);
    });

    it('returns nothing without data', () => {
        expect(collectRooms()).toEqual([]);
        expect(collectRooms(null, undefined)).toEqual([]);
    });
});

describe('criterionShares and shareScaleMax', () => {
    const allocation = (values, extra = {}) => ({
        title: values[0],
        access: values[1],
        source: values[2],
        theory: values[3],
        methods: values[4],
        conclusion: values[5],
        userName: 'Red Fox 01',
        ...extra,
    });
    const node = {
        a: allocation([4, 4, 4, 4, 4, 0]),
        b: allocation([0, 0, 0, 0, 20, 0], { room: 'DEMO-1' }),
        c: allocation([2, 3, 4, 3, 6, 2], { room: 'DEMO-1' }),
        bad: allocation([30, -10, 0, 0, 0, 0]),
        short: allocation([1, 1, 1, 1, 1, 1]),
        junk: 'x',
    };

    it('uses valid allocations only and averages shares per participant', () => {
        const result = criterionShares(node);
        expect(result.n).toBe(3);
        const methods = result.criteria.find((item) => item.key === 'methods');
        expect(methods.mean).toBeCloseTo((0.2 + 1 + 0.3) / 3, 10);
        // Bounds are clamped to 0-1 because shares are compositional.
        expect(methods.lower).toBe(0);
        expect(methods.upper).toBe(1);
        expect(result.scaleMax).toBe(1);
        expect(result.criteria.map((item) => item.key)).toEqual([
            'title',
            'access',
            'source',
            'theory',
            'methods',
            'conclusion',
        ]);
    });

    it('filters by room', () => {
        const result = criterionShares(node, { room: 'DEMO-1' });
        expect(result.n).toBe(2);
        expect(result.criteria.find((item) => item.key === 'title').mean).toBeCloseTo(0.05, 10);
    });

    it('has no means or intervals without data and none below two participants', () => {
        expect(criterionShares(null)).toMatchObject({ n: 0, scaleMax: 0.4 });
        expect(criterionShares(null).criteria.every((item) => item.mean === null)).toBe(true);
        const single = criterionShares({ a: node.a });
        expect(single.n).toBe(1);
        expect(single.criteria[0]).toMatchObject({ mean: 0.2, lower: null, upper: null });
        expect(single.scaleMax).toBe(0.4);
    });

    it('rounds the scale up to a whole 10%, between 40% and 100%', () => {
        expect(shareScaleMax(0)).toBe(0.4);
        expect(shareScaleMax(0.35)).toBe(0.4);
        expect(shareScaleMax(0.41)).toBe(0.5);
        expect(shareScaleMax(0.5)).toBe(0.5);
        expect(shareScaleMax(0.1 + 0.2 + 0.2)).toBe(0.5);
        expect(shareScaleMax(0.7000000000000001)).toBe(0.7);
        expect(shareScaleMax(1.3)).toBe(1);
    });
});

describe('leaderboardView', () => {
    const now = 1_800_000_000_000;
    let counter = 0;
    const raw = (score, papersRated, extra = {}) => ({
        [`session_${1700000000000 + ++counter}_x${counter}`]: {
            score,
            papersRated,
            timestamp: now - 1000 * counter,
            userName: `Red Fox ${String(counter).padStart(2, '0')}`,
            ...extra,
        },
    });
    const entries = normaliseEntries({
        ...raw(950, 10),
        ...raw(1900, 20),
        ...raw(940, 10, { timestamp: now - DAY_MS - 1 }),
        ...raw(940, 10, { room: 'DEMO-1' }),
        ...raw(500, 5),
        ...raw(0, 0, { userName: '' }),
        ...raw(9999, 1),
    });

    it('ranks by displayed accuracy, then studies rated, with shared places', () => {
        const view = leaderboardView(entries, { now });
        expect(
            view.rows.map((entry) => [entry.displayedAccuracy, entry.papersRated, entry.rank])
        ).toEqual([
            [95, 20, 1],
            [95, 10, 2],
            [94, 10, 3],
            [94, 10, 3],
        ]);
        expect(view.rankedCount).toBe(4);
        // Fewer than 10 studies: listed nowhere, only counted. The impossible entry is dropped.
        expect(view.unrankedCount).toBe(2);
        expect(view.truncated).toBe(false);
    });

    it('keeps entries updated in the past 24 hours on the day tab', () => {
        const view = leaderboardView(entries, { now, period: 'day' });
        expect(view.rows.map((entry) => entry.rank)).toEqual([1, 2, 3]);
        expect(view.rows.every((entry) => entry.timestamp >= now - DAY_MS)).toBe(true);
    });

    it('leaves entries dated in the future off the day tab, which they would never leave', () => {
        const dated = normaliseEntries({
            ...raw(990, 10, { timestamp: 9e15, userName: 'Future Time 99' }),
            ...raw(980, 10, { timestamp: now + CLOCK_TOLERANCE_MS }),
        });
        const day = leaderboardView([...entries, ...dated], { now, period: 'day' });
        expect(day.rows.map((entry) => entry.userName)).not.toContain('Future Time 99');
        expect(day.rows.map((entry) => entry.displayedAccuracy)).toContain(98);
        // All time still lists it: its accuracy is genuine as far as anyone can tell.
        const all = leaderboardView([...entries, ...dated], { now });
        expect(all.rows[0].userName).toBe('Future Time 99');
    });

    it('ranks within a room', () => {
        const view = leaderboardView(entries, { now, room: 'DEMO-1' });
        expect(view.rows).toHaveLength(1);
        expect(view.rows[0]).toMatchObject({ rank: 1, room: 'DEMO-1' });
        expect(view.unrankedCount).toBe(0);
    });

    it('lists the top places only, keeping everyone tied at the last place', () => {
        const view = leaderboardView(entries, { now, limit: 3 });
        expect(view.rows.map((entry) => entry.rank)).toEqual([1, 2, 3, 3]);
        expect(view.truncated).toBe(false);
        const shorter = leaderboardView(entries, { now, limit: 2 });
        expect(shorter.rows.map((entry) => entry.rank)).toEqual([1, 2]);
        expect(shorter.truncated).toBe(true);
        expect(shorter.rankedCount).toBe(4);
    });

    it('takes the ranking threshold as an option', () => {
        const view = leaderboardView(entries, { now, minStudies: 5 });
        expect(view.rankedCount).toBe(5);
    });
});

describe('localSessionId and sessionHasRatings', () => {
    it('reads the session id from the saved workshop state', () => {
        expect(localSessionId({ sessionId: S1, currentPage: 3 })).toBe(S1);
        expect(localSessionId({ sessionId: 'session_1_<img>' })).toBeNull();
        expect(localSessionId({ sessionId: 42 })).toBeNull();
        expect(localSessionId(null)).toBeNull();
        expect(localSessionId('session_1771630835301_gj69lmk1o')).toBeNull();
    });

    it('finds a valid rating by the session in any study and room', () => {
        expect(sessionHasRatings(RATINGS, S3)).toBe(true);
        expect(sessionHasRatings(RATINGS, S2)).toBe(true);
        expect(sessionHasRatings(RATINGS, 'session_bad_value')).toBe(false);
        expect(sessionHasRatings(RATINGS, 'session_1999999999999_none')).toBe(false);
        expect(sessionHasRatings(RATINGS, 'constructor')).toBe(false);
        expect(sessionHasRatings(null, S1)).toBe(false);
        expect(sessionHasRatings(RATINGS, null)).toBe(false);
    });
});

describe('parseLookup and resultsHref', () => {
    it('recognises empty input, session ids, results links and nicknames', () => {
        expect(parseLookup('   ')).toEqual({ kind: 'empty' });
        expect(parseLookup(undefined)).toEqual({ kind: 'empty' });
        expect(parseLookup(` ${S1} `)).toEqual({ kind: 'session', sessionId: S1 });
        expect(parseLookup(`https://unlock-the-lab.web.app/?session=${S1}`)).toEqual({
            kind: 'session',
            sessionId: S1,
        });
        expect(parseLookup(`/?room=DEMO-1&session=${S1}`)).toEqual({
            kind: 'session',
            sessionId: S1,
        });
        expect(parseLookup('https://example.com/?session=nope')).toEqual({ kind: 'badLink' });
        expect(parseLookup(' red fox 07 ')).toEqual({ kind: 'name', name: 'red fox 07' });
    });

    it('links only genuine session ids, encoded', () => {
        expect(resultsHref(S1)).toBe(`/?session=${S1}`);
        expect(resultsHref("session_1'); alert(1); //")).toBeNull();
        expect(resultsHref('javascript:alert(1)')).toBeNull();
        expect(resultsHref(null)).toBeNull();
    });
});

describe('errorBarSegment', () => {
    // A vertical chart: values grow upwards, so the area runs from bottom 300 px to top 20 px.
    const [bottom, top] = [300, 20];

    it('draws both caps when the interval is inside the plot area', () => {
        expect(errorBarSegment(250, 100, bottom, top)).toEqual({
            from: 250,
            to: 100,
            capFrom: true,
            capTo: true,
        });
    });

    it('stops at the edge without a cap where a limit runs past the axis', () => {
        expect(errorBarSegment(400, 100, bottom, top)).toEqual({
            from: 300,
            to: 100,
            capFrom: false,
            capTo: true,
        });
        expect(errorBarSegment(350, -50, bottom, top)).toEqual({
            from: 300,
            to: 20,
            capFrom: false,
            capTo: false,
        });
    });

    it('keeps the cap for a limit on the edge, allowing for rounding', () => {
        expect(errorBarSegment(300.4, 19.6, bottom, top)).toMatchObject({
            capFrom: true,
            capTo: true,
        });
    });

    it('works for horizontal charts, where values grow to the right', () => {
        expect(errorBarSegment(-10, 120, 40, 600)).toEqual({
            from: 40,
            to: 120,
            capFrom: false,
            capTo: true,
        });
    });

    it('draws nothing for an interval wholly outside the area or with missing values', () => {
        expect(errorBarSegment(400, 350, bottom, top)).toBeNull();
        expect(errorBarSegment(NaN, 100, bottom, top)).toBeNull();
    });
});
