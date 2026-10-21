import { describe, expect, it } from 'vitest';
import { seededShuffle } from '../../../src/lib/shuffle.js';

const STUDY_IDS = Array.from({ length: 48 }, (_, index) => `STUDY-${index + 1}`);

/**
 * v1 reference: `shufflePapers` copied verbatim from the v1 app.js (the
 * version with the `Math.abs(seed) % 233280` fix). It shuffles the module-level
 * `papers` array in place using `sessionId`, so it runs inside this wrapper.
 */
function v1Order(sessionIdForRun, items) {
    const papers = [...items];
    const sessionId = sessionIdForRun;

    // ----- begin verbatim copy of v1 app.js -----
    // prettier-ignore
    // Shuffle papers array using Fisher-Yates algorithm with seeded randomization
    function shufflePapers() {
        // Safety check
        if (!papers || !papers.length || !sessionId) {
            console.warn('Cannot shuffle papers: papers or sessionId not initialized');
            return;
        }

        // Use session ID as seed for consistent randomization per participant
        let seed = 0;
        for (let i = 0; i < sessionId.length; i++) {
            seed = ((seed << 5) - seed) + sessionId.charCodeAt(i);
            seed = seed & seed; // Convert to 32-bit integer
        }

        // The hash is negative for about half of all session IDs, and % keeps the
        // sign, so a negative seed gave negative indices that swapped undefined
        // entries into papers. Non-negative seeds keep the same sequence.
        seed = Math.abs(seed) % 233280;

        // Seeded random number generator
        function seededRandom() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        }

        // Fisher-Yates shuffle with seeded random
        for (let i = papers.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1));
            [papers[i], papers[j]] = [papers[j], papers[i]];
        }
    }
    // ----- end verbatim copy -----

    shufflePapers();
    return papers;
}

/** Deterministic PRNG so the generated ids are the same on every run. */
function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Ids in the real format: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9). */
function generateSessionIds(count, seed) {
    const random = mulberry32(seed);
    const start = Date.UTC(2026, 0, 1);
    const span = Date.UTC(2028, 0, 1) - start;
    return Array.from({ length: count }, () => {
        const timestamp = start + Math.floor(random() * span);
        const suffix = random().toString(36).slice(2, 11);
        return `session_${timestamp}_${suffix}`;
    });
}

/** Real session ids from the public backups, plus edge cases. */
const FIXED_IDS = [
    'session_1771087449152_jfavlz5gj',
    'session_1771628092807_b59wcojpe',
    'session_1771630835301_gj69lmk1o',
    'session_1771634502453_iienlw3th',
    'session_1771670136413_h3jd5dj15',
    'session_1771670153418_uv1hngsbl',
    'session_1771670275087_oxteoczuc',
    'session_1771677565473_cl1qc7d4c',
    'session_1771677960149_8763zw081',
    'session_1771677966762_syb8fwunt',
    'session_1771678000668_8kd9iax4p',
    'session_1771678089778_d1cevkgmo',
    'session_1771678384738_qmprz24pf',
    'session_1771678509801_j8rmoqv1x',
    'session_1771679075012_vxq4lmwdt',
    'session_1771679419866_57dliacdk',
    'session_1771679566131_uu796vg6b',
    'session_1772060368750_0upfebldh',
    'session_1772371401905_tajc9odyd',
    'session_1773145726553_855bwmncg',
    'session_1773148204715_4vcf7o9jh',
    'session_1773294386728_0045d90rw',
    'session_1773719349696_hl7q0l4vk',
    'session_1778672326172_twf0yg0um',
    'session_1790362780158_vajs8e9ta',
    'session_1770063449463_7fjle4lxb',
    'session_1770063485549_0p5g12xqt',
    'session_0000000000_a',
    'session_9999999999999_zzzzzzzzz',
    'session_1771630835301_',
    'x',
];

function hashIsNegative(sessionId) {
    let seed = 0;
    for (let i = 0; i < sessionId.length; i++) {
        seed = (seed << 5) - seed + sessionId.charCodeAt(i);
        seed = seed & seed;
    }
    return seed < 0;
}

describe('seededShuffle', () => {
    it('matches the v1 order for the fixed list of session ids', () => {
        for (const sessionId of FIXED_IDS) {
            expect(seededShuffle(STUDY_IDS, sessionId), sessionId).toEqual(
                v1Order(sessionId, STUDY_IDS)
            );
        }
    });

    it('matches the v1 order for 5,000 generated session ids', () => {
        const ids = generateSessionIds(5000, 20261021);
        // Both signs of the hash must be covered: v1's fix only changed negative ones.
        expect(ids.some(hashIsNegative)).toBe(true);
        expect(ids.some((id) => !hashIsNegative(id))).toBe(true);
        for (const sessionId of ids) {
            expect(seededShuffle(STUDY_IDS, sessionId), sessionId).toEqual(
                v1Order(sessionId, STUDY_IDS)
            );
        }
    });

    it('keeps a known participant order (Red Bear 76 in the backups)', () => {
        // prettier-ignore
        const expected = [
            10, 19, 41, 24, 43, 26, 38, 42, 27, 47, 2, 44, 31, 30, 5, 20, 46, 14, 11, 12, 1, 32, 39, 18,
            22, 8, 13, 36, 35, 23, 29, 9, 7, 25, 40, 45, 48, 4, 37, 28, 33, 16, 3, 21, 15, 6, 34, 17,
        ].map((number) => `STUDY-${number}`);
        expect(seededShuffle(STUDY_IDS, 'session_1771630835301_gj69lmk1o')).toEqual(expected);
    });

    it('returns a permutation without gaps and leaves the input unchanged', () => {
        const input = [...STUDY_IDS];
        for (const sessionId of generateSessionIds(200, 7)) {
            const order = seededShuffle(input, sessionId);
            expect(order).toHaveLength(48);
            expect(new Set(order).size).toBe(48);
            expect(order.every((id) => typeof id === 'string')).toBe(true);
        }
        expect(input).toEqual(STUDY_IDS);
    });

    it('works on objects and keeps their identity', () => {
        const studies = STUDY_IDS.map((id) => ({ id }));
        const order = seededShuffle(studies, 'session_1771630835301_gj69lmk1o');
        expect(order.map(({ id }) => id)).toEqual(
            v1Order('session_1771630835301_gj69lmk1o', STUDY_IDS)
        );
        expect(order[0]).toBe(studies.find(({ id }) => id === order[0].id));
    });

    it('leaves the order unchanged without a session id or items, as v1 did', () => {
        expect(seededShuffle(STUDY_IDS, '')).toEqual(STUDY_IDS);
        expect(seededShuffle(STUDY_IDS, null)).toEqual(STUDY_IDS);
        expect(seededShuffle([], 'session_1_a')).toEqual([]);
        expect(seededShuffle(undefined, 'session_1_a')).toEqual([]);
    });
});
