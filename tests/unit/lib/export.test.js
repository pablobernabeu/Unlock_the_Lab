import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    LEADERBOARD_COLUMNS,
    RANKING_COLUMNS,
    RATING_COLUMNS,
    SESSION_COLUMNS,
    flattenLeaderboard,
    flattenRankings,
    flattenRatings,
    flattenSessions,
    toCsv,
} from '../../../src/lib/export.js';

describe('toCsv', () => {
    const columns = ['id', 'value'];

    it('writes a header and CRLF-terminated rows', () => {
        expect(
            toCsv(
                [
                    { id: 'a', value: 1 },
                    { id: 'b', value: 2 },
                ],
                columns
            )
        ).toBe('id,value\r\na,1\r\nb,2\r\n');
    });

    it('quotes cells with commas, quotes and line breaks (RFC 4180)', () => {
        const csv = toCsv(
            [
                { id: 'comma', value: 'one, two' },
                { id: 'quote', value: 'say "hi"' },
                { id: 'newline', value: 'line 1\nline 2' },
                { id: 'crlf', value: 'line 1\r\nline 2' },
            ],
            columns
        );
        expect(csv).toBe(
            'id,value\r\n' +
                'comma,"one, two"\r\n' +
                'quote,"say ""hi"""\r\n' +
                'newline,"line 1\nline 2"\r\n' +
                'crlf,"line 1\r\nline 2"\r\n'
        );
    });

    it('neutralises formula injection in strings', () => {
        const rows = ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)', '\tTAB', 'safe=1'].map(
            (value) => ({
                id: 'x',
                value,
            })
        );
        const lines = toCsv(rows, columns).split('\r\n');
        expect(lines.slice(1, 7)).toEqual([
            'x,"\'=HYPERLINK(""http://x"")"',
            "x,'+1+1",
            "x,'-2+3",
            "x,'@SUM(A1)",
            "x,'\tTAB",
            'x,safe=1',
        ]);
    });

    it('leaves numbers alone, including negative ones', () => {
        expect(toCsv([{ id: 'n', value: -3 }], columns)).toBe('id,value\r\nn,-3\r\n');
        expect(toCsv([{ id: 'n', value: 0.5 }], columns)).toBe('id,value\r\nn,0.5\r\n');
    });

    it('writes empty cells for missing values and text for booleans', () => {
        expect(
            toCsv(
                [
                    { id: null, value: undefined },
                    { id: true, value: false },
                ],
                columns
            )
        ).toBe('id,value\r\n,\r\ntrue,false\r\n');
    });

    it('guards usernames that look like formulas', () => {
        expect(toCsv([{ id: '=cmd|"/c calc"!A1', value: 1 }], columns)).toBe(
            'id,value\r\n"\'=cmd|""/c calc""!A1",1\r\n'
        );
    });

    it('handles no rows', () => {
        expect(toCsv([], columns)).toBe('id,value\r\n');
    });
});

describe('flattenRatings', () => {
    it('produces one row per rating with every column, accepting legacy records', () => {
        const rows = flattenRatings({
            'STUDY-1': {
                session_1_a: {
                    rating: 2,
                    prediction: 3,
                    responseTime: 4100,
                    timestamp: 10,
                    uid: 'u1',
                },
                session_2_b: 5,
                session_3_c: {
                    rating: 6,
                    prediction: 6,
                    timestamp: 11,
                    uid: 'u3',
                    contentVersion: 2,
                    feedbackShown: true,
                    target: 5.9,
                    score: 99,
                    trial: 4,
                    locale: 'en',
                    room: 'OX-1',
                },
                junk: 'text',
            },
        });
        expect(rows).toHaveLength(3);
        expect(Object.keys(rows[0])).toEqual(expect.arrayContaining([...RATING_COLUMNS]));
        expect(rows[0]).toMatchObject({
            sessionId: 'session_1_a',
            studyId: 'STUDY-1',
            rating: 2,
            contentVersion: null,
        });
        expect(rows[1]).toMatchObject({ sessionId: 'session_2_b', rating: 5, prediction: null });
        expect(rows[2]).toMatchObject({ feedbackShown: true, room: 'OX-1', trial: 4 });
        expect(toCsv(rows, RATING_COLUMNS).split('\r\n')[0]).toBe(RATING_COLUMNS.join(','));
    });

    it('handles empty nodes', () => {
        expect(flattenRatings(null)).toEqual([]);
        expect(flattenRatings({ 'STUDY-1': null })).toEqual([]);
    });
});

describe('flattening the other nodes', () => {
    it('keys leaderboard, rankings and sessions rows by session id', () => {
        const leaderboard = flattenLeaderboard({
            s1: {
                score: 87,
                papersRated: 1,
                timestamp: 5,
                userName: 'Red Fox 07',
                extra: 'dropped',
            },
            bad: 3,
        });
        expect(leaderboard).toEqual([
            {
                sessionId: 's1',
                userName: 'Red Fox 07',
                score: 87,
                papersRated: 1,
                timestamp: 5,
                uid: null,
                room: null,
            },
        ]);
        expect(Object.keys(leaderboard[0])).toEqual([...LEADERBOARD_COLUMNS]);

        const rankings = flattenRankings({ s1: { title: 20, access: 0, timestamp: 1 } });
        expect(Object.keys(rankings[0])).toEqual([...RANKING_COLUMNS]);
        expect(rankings[0]).toMatchObject({ sessionId: 's1', title: 20, source: null });

        const sessions = flattenSessions({
            s1: { uid: 'u', createdAt: 1, contentVersion: 2, locale: 'en' },
        });
        expect(Object.keys(sessions[0])).toEqual([...SESSION_COLUMNS]);
        expect(sessions[0]).toMatchObject({ sessionId: 's1', feedbackMode: null, room: null });
    });
});

describe('export columns and database.rules.json', () => {
    // The rules refuse unknown children, so a new field must be added to them; this keeps a
    // field added there (and to the writer) from silently missing from every CSV export.
    const { rules } = JSON.parse(
        readFileSync(new URL('../../../database.rules.json', import.meta.url), 'utf8')
    );
    const fields = (node) =>
        Object.keys(node)
            .filter((key) => !key.startsWith('.') && !key.startsWith('$'))
            .sort();
    const without = (columns, keys) => columns.filter((column) => !keys.includes(column)).sort();

    it.each([
        ['ratings', rules.ratings.$studyId.$sessionId, RATING_COLUMNS, ['sessionId', 'studyId']],
        ['leaderboard', rules.leaderboard.$sessionId, LEADERBOARD_COLUMNS, ['sessionId']],
        ['rankings', rules.rankings.$sessionId, RANKING_COLUMNS, ['sessionId']],
        ['sessions', rules.sessions.$sessionId, SESSION_COLUMNS, ['sessionId']],
    ])('exports every field the rules allow on /%s', (_name, node, columns, keys) => {
        expect(fields(node).length).toBeGreaterThan(0);
        expect(without(columns, keys)).toEqual(fields(node));
    });
});
