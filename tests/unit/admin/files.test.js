import { describe, expect, it } from 'vitest';
import {
    FILE_PREFIX,
    SNAPSHOT_NODES,
    buildSnapshot,
    datedFileName,
    fileStamp,
    hasCsvFormat,
    nodeCsv,
    nodeFileName,
    nodeJson,
} from '../../../src/admin/files.js';
import { qrFileName, roomLinks } from '../../../src/admin/links.js';
import {
    LEADERBOARD_COLUMNS,
    RANKING_COLUMNS,
    RATING_COLUMNS,
    SESSION_COLUMNS,
} from '../../../src/lib/export.js';

const exportedAt = new Date(2026, 9, 21, 9, 5);

describe('file names', () => {
    it('stamps exports with the local date and time', () => {
        expect(fileStamp(exportedAt)).toBe('2026-10-21-0905');
        expect(datedFileName('ratings', 'csv', exportedAt)).toBe(
            'unlock-the-lab-ratings-2026-10-21-0905.csv'
        );
        expect(datedFileName('snapshot', 'json', exportedAt)).toMatch(
            new RegExp(`^${FILE_PREFIX}-snapshot-\\d{4}-\\d{2}-\\d{2}-\\d{4}\\.json$`)
        );
    });

    it('names per-node JSON files as analysis/fetch-data.sh expects', () => {
        for (const node of ['ratings', 'leaderboard', 'rankings', 'sessions']) {
            expect(nodeFileName(node)).toBe(`${node}.json`);
        }
    });

    it('names the QR code after the room', () => {
        expect(qrFileName('OXFORD-1')).toBe('unlock-the-lab-room-OXFORD-1-qr.png');
    });
});

describe('room links', () => {
    it('builds the workshop and dashboard links for a room', () => {
        expect(roomLinks('https://unlock-the-lab.web.app', 'OXFORD-1')).toEqual({
            workshop: 'https://unlock-the-lab.web.app/?room=OXFORD-1',
            dashboard: 'https://unlock-the-lab.web.app/dashboard.html?room=OXFORD-1',
        });
    });

    it('works on a local server with a port', () => {
        expect(roomLinks('http://127.0.0.1:3000', 'DEMO-1').workshop).toBe(
            'http://127.0.0.1:3000/?room=DEMO-1'
        );
    });
});

/** Splits simple CSV (no embedded line breaks) into rows of cells. */
function parseCsv(text) {
    return text
        .trimEnd()
        .split('\r\n')
        .map((line) => {
            const cells = [];
            let cell = '';
            let quoted = false;
            for (let index = 0; index < line.length; index++) {
                const char = line[index];
                if (quoted && char === '"' && line[index + 1] === '"') {
                    cell += '"';
                    index++;
                } else if (char === '"') {
                    quoted = !quoted;
                } else if (char === ',' && !quoted) {
                    cells.push(cell);
                    cell = '';
                } else {
                    cell += char;
                }
            }
            cells.push(cell);
            return cells;
        });
}

describe('nodeCsv', () => {
    it('writes one row per rating with the documented columns, legacy records included', () => {
        const rows = parseCsv(
            nodeCsv('ratings', {
                'STUDY-1': {
                    session_a: { rating: 4, prediction: 5, room: 'DEMO-1', feedbackShown: true },
                    session_b: 6,
                },
            })
        );
        expect(rows[0]).toEqual([...RATING_COLUMNS]);
        expect(rows).toHaveLength(3);
        const byColumn = (row) => Object.fromEntries(RATING_COLUMNS.map((c, i) => [c, row[i]]));
        expect(byColumn(rows[1])).toMatchObject({
            sessionId: 'session_a',
            studyId: 'STUDY-1',
            rating: '4',
            prediction: '5',
            feedbackShown: 'true',
            room: 'DEMO-1',
            uid: '',
        });
        expect(byColumn(rows[2])).toMatchObject({ sessionId: 'session_b', rating: '6' });
    });

    it('uses the documented columns of each node', () => {
        expect(parseCsv(nodeCsv('leaderboard', null))[0]).toEqual([...LEADERBOARD_COLUMNS]);
        expect(parseCsv(nodeCsv('rankings', null))[0]).toEqual([...RANKING_COLUMNS]);
        expect(parseCsv(nodeCsv('sessions', null))[0]).toEqual([...SESSION_COLUMNS]);
    });

    it('guards user names against spreadsheet formulas', () => {
        const rows = parseCsv(nodeCsv('leaderboard', { s: { userName: '=HYPERLINK("x")' } }));
        expect(rows[1][LEADERBOARD_COLUMNS.indexOf('userName')]).toBe('\'=HYPERLINK("x")');
    });

    it('refuses nodes without a CSV layout', () => {
        expect(hasCsvFormat('active')).toBe(false);
        expect(() => nodeCsv('active', {})).toThrow(/active/);
    });
});

describe('nodeJson', () => {
    it('keeps the node exactly as stored and writes null for an empty node', () => {
        const node = { 'STUDY-1': { session_a: { rating: 4 }, session_b: 5 } };
        expect(JSON.parse(nodeJson(node))).toEqual(node);
        expect(nodeJson(null)).toBe('null\n');
        expect(nodeJson(undefined)).toBe('null\n');
    });
});

describe('buildSnapshot', () => {
    it('holds every readable node, the export time, the app version and counts', () => {
        const nodes = {
            ratings: { 'STUDY-1': { a: { rating: 4 } } },
            leaderboard: { a: { score: 80, papersRated: 1 } },
            control: { sessionsEndedAt: 5 },
            admins: { someone: true },
        };
        const snapshot = buildSnapshot(nodes, { exportedAt, appVersion: '2.0.0' });
        expect(snapshot.exportedAt).toBe(exportedAt.toISOString());
        expect(snapshot.appVersion).toBe('2.0.0');
        expect(Object.keys(snapshot.nodes)).toEqual([...SNAPSHOT_NODES]);
        expect(snapshot.nodes.ratings).toEqual(nodes.ratings);
        expect(snapshot.nodes.rankings).toBeNull();
        expect(snapshot.nodes).not.toHaveProperty('admins');
        expect(snapshot.counts).toEqual({
            ratings: 1,
            leaderboard: 1,
            rankings: 0,
            sessions: 0,
            active: 0,
        });
        expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    });
});
