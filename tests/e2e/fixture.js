// Deterministic synthetic data for the end-to-end tests. It mixes the record
// shapes the live database holds: version 1 sessions (no /sessions record,
// some ratings without uid, one bare-number rating, an empty username) and
// version 2 sessions with every field, one of them in a workshop room.
import expertRatings from '../../src/content/expert-ratings.json' with { type: 'json' };

export const ROOM = 'DEMO-1';
const DAY = 24 * 60 * 60 * 1000;
const BASE_TIME = Date.UTC(2026, 8, 1);

export const LEGACY_SESSION = 'session_1771630835301_legacya1';
export const LEGACY_NAME = 'Red Bear 76';
export const ROOM_SESSION = 'session_1790000000000_roomb2';
export const ROOM_NAME = 'Curious Hawk 71';

function random(seed) {
    let state = seed;
    return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

function clampRating(value) {
    return Math.min(7, Math.max(1, Math.round(value)));
}

function participant({ sessionId, userName, uid, count, seed, time, version, room }) {
    const rng = random(seed);
    const ratings = {};
    let score = 0;
    for (let i = 1; i <= count; i += 1) {
        const studyId = `STUDY-${((seed + i * 7) % 48) + 1}`;
        const expert = expertRatings[studyId];
        const rating = clampRating(expert + (rng() - 0.5) * 3);
        const prediction = clampRating(expert + (rng() - 0.5) * 2);
        const studyScore = Math.max(0, 100 - Math.round(12 * Math.abs(prediction - expert)));
        score += studyScore;
        const record = {
            rating,
            prediction,
            responseTime: Math.round(20000 + rng() * 90000),
            timestamp: time + i * 60000,
        };
        if (uid) record.uid = uid;
        if (version === 2) {
            Object.assign(record, {
                contentVersion: 2,
                feedbackShown: true,
                target: expert,
                score: studyScore,
                trial: i,
                locale: 'en',
            });
            if (room) record.room = room;
        }
        ratings[studyId] = record;
    }
    const leaderboard = { score, papersRated: count, timestamp: time + count * 60000, userName };
    if (uid) leaderboard.uid = uid;
    if (room) leaderboard.room = room;
    return { sessionId, ratings, leaderboard };
}

const people = [
    participant({
        sessionId: LEGACY_SESSION,
        userName: LEGACY_NAME,
        uid: 'legacy-uid-a',
        count: 12,
        seed: 3,
        time: BASE_TIME,
        version: 1,
    }),
    participant({
        sessionId: 'session_1771677565473_legacyb2',
        userName: 'Tall Rabbit 07',
        count: 10,
        seed: 11,
        time: BASE_TIME + DAY,
        version: 1,
    }),
    participant({
        sessionId: 'session_1772371401905_legacyc3',
        userName: '',
        uid: 'legacy-uid-c',
        count: 1,
        seed: 5,
        time: BASE_TIME + 2 * DAY,
        version: 1,
    }),
    participant({
        sessionId: ROOM_SESSION,
        userName: ROOM_NAME,
        uid: 'v2-uid-b',
        count: 14,
        seed: 17,
        time: BASE_TIME + 3 * DAY,
        version: 2,
        room: ROOM,
    }),
    participant({
        sessionId: 'session_1790000100000_v2plain',
        userName: 'Brave Otter 12',
        uid: 'v2-uid-d',
        count: 10,
        seed: 23,
        time: BASE_TIME + 4 * DAY,
        version: 2,
    }),
];

function buildFixture() {
    const ratings = {};
    const leaderboard = {};
    const sessions = {};
    const rankings = {};
    people.forEach((person, index) => {
        for (const [studyId, record] of Object.entries(person.ratings)) {
            ratings[studyId] ??= {};
            ratings[studyId][person.sessionId] = record;
        }
        leaderboard[person.sessionId] = person.leaderboard;
        if (person.leaderboard.uid?.startsWith('v2-')) {
            sessions[person.sessionId] = {
                uid: person.leaderboard.uid,
                createdAt: person.leaderboard.timestamp - 3_600_000,
                contentVersion: 2,
                appVersion: '2.0.0',
                locale: 'en',
                feedbackMode: 'each',
                ...(person.leaderboard.room ? { room: person.leaderboard.room } : {}),
            };
            const tokens = [
                [2, 3, 4, 3, 6, 2],
                [4, 2, 5, 2, 5, 2],
            ][index % 2];
            rankings[person.sessionId] = {
                title: tokens[0],
                access: tokens[1],
                source: tokens[2],
                theory: tokens[3],
                methods: tokens[4],
                conclusion: tokens[5],
                userName: person.leaderboard.userName,
                timestamp: person.leaderboard.timestamp,
                uid: person.leaderboard.uid,
                ...(person.leaderboard.room ? { room: person.leaderboard.room } : {}),
            };
        }
    });
    // The earliest v1 records stored a bare number instead of an object.
    ratings['STUDY-1'] ??= {};
    ratings['STUDY-1'].session_1770063449463_barenum = 2;
    return { ratings, leaderboard, sessions, rankings };
}

export const fixture = buildFixture();
