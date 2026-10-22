import { describe, expect, it } from 'vitest';
import {
    DELETED_NODES,
    DELETE_WORD,
    PARTICIPANT_NODES,
    deleteConfirmationText,
    deletionCounts,
    hasDeletableData,
    presenceCounts,
    recordCount,
    roomParticipants,
    sessionsWithData,
} from '../../../src/admin/counts.js';
import { ACTIVE_WINDOW_MS } from '../../../src/lib/config.js';
import { countActive } from '../../../src/lib/counts.js';

describe('recordCount', () => {
    it('counts ratings per study and session, and other nodes per key', () => {
        const ratings = {
            'STUDY-1': { session_a: { rating: 3 }, session_b: 5 },
            'STUDY-2': { session_a: { rating: 9 } },
        };
        expect(recordCount('ratings', ratings)).toBe(3);
        expect(recordCount('leaderboard', { session_a: {}, session_b: {} })).toBe(2);
    });

    it('treats empty and malformed nodes as holding no records', () => {
        for (const value of [null, undefined, 7, 'text', []]) {
            expect(recordCount('ratings', value)).toBe(0);
            expect(recordCount('sessions', value)).toBe(0);
        }
        expect(recordCount('ratings', { 'STUDY-1': 4 })).toBe(0);
    });

    it('counts legacy nodes that Firebase returns as arrays, without their empty slots', () => {
        // A node whose keys are all small integers arrives from val() as a (sparse) array.
        const rankings = [{ title: 20 }, undefined, { title: 20 }, null];
        expect(recordCount('rankings', rankings)).toBe(2);
        expect(deletionCounts({ rankings }).rankings).toBe(2);
        expect(sessionsWithData({ rankings })).toBe(2);
    });
});

describe('presenceCounts', () => {
    const now = 1_800_000_000_000;

    it('counts every entry and those with a heartbeat inside the active window', () => {
        const active = {
            fresh: { lastActive: now - 1000 },
            edge: { lastActive: now - ACTIVE_WINDOW_MS },
            stale: { lastActive: now - ACTIVE_WINDOW_MS - 1 },
            future: { lastActive: now + ACTIVE_WINDOW_MS + 1 },
            broken: { joinedAt: now },
            junk: 'x',
        };
        expect(presenceCounts(active, { now })).toEqual({ total: 6, recent: 2 });
        // 'Active now' is the dashboard's figure, from the shared count.
        expect(presenceCounts(active, { now }).recent).toBe(countActive(active, { now }));
    });

    it('accepts a custom window and an empty node', () => {
        expect(presenceCounts({ a: { lastActive: now - 5000 } }, { now, windowMs: 1000 })).toEqual({
            total: 1,
            recent: 0,
        });
        expect(presenceCounts(null, { now })).toEqual({ total: 0, recent: 0 });
    });
});

describe('sessionsWithData and roomParticipants', () => {
    const nodes = {
        ratings: {
            'STUDY-1': { s1: { rating: 4, room: 'DEMO-1' }, s2: 3 },
            'STUDY-2': { s1: { rating: 5, room: 'DEMO-1' } },
        },
        leaderboard: { s1: { room: 'DEMO-1' }, s3: { userName: '' } },
        rankings: { s4: { room: 'OTHER' } },
        sessions: { s5: { room: 'DEMO-1' } },
        active: { s6: { lastActive: 1 } },
    };

    it('counts distinct sessions across the participant data nodes, not presence', () => {
        expect(sessionsWithData(nodes)).toBe(5);
        expect(sessionsWithData({})).toBe(0);
    });

    it('counts the distinct sessions that used a room', () => {
        expect(roomParticipants(nodes, 'DEMO-1')).toBe(2);
        expect(roomParticipants(nodes, 'OTHER')).toBe(1);
        expect(roomParticipants(nodes, 'NONE')).toBe(0);
    });
});

describe('deletion', () => {
    it('lists the participant data nodes plus presence, and nothing else', () => {
        expect(PARTICIPANT_NODES).toEqual(['ratings', 'leaderboard', 'rankings', 'sessions']);
        expect(DELETED_NODES).toEqual([...PARTICIPANT_NODES, 'active']);
        expect(DELETED_NODES).not.toContain('admins');
        expect(DELETED_NODES).not.toContain('control');
    });

    it('counts the records of every deleted node', () => {
        expect(
            deletionCounts({
                ratings: { 'STUDY-1': { a: 4, b: 5 } },
                leaderboard: { a: {} },
                active: { c: {} },
                control: { sessionsEndedAt: 1 },
            })
        ).toEqual({ ratings: 2, leaderboard: 1, rankings: 0, sessions: 0, active: 1 });
    });

    it('sees data in any deleted node, whatever its shape, but not in other nodes', () => {
        expect(hasDeletableData({})).toBe(false);
        expect(hasDeletableData({ ratings: null, admins: { a: true }, control: { x: 1 } })).toBe(
            false
        );
        expect(hasDeletableData({ rankings: [{ title: 20 }] })).toBe(true);
        expect(hasDeletableData({ ratings: 'junk' })).toBe(true);
        expect(hasDeletableData({ active: { s: {} } })).toBe(true);
    });

    it('asks for the participant count, or DELETE when only presence data is left', () => {
        expect(deleteConfirmationText(27)).toBe('27');
        expect(deleteConfirmationText(0)).toBe(DELETE_WORD);
        expect(DELETE_WORD).toBe('DELETE');
    });
});
