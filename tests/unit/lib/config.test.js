import { describe, expect, it } from 'vitest';
import * as config from '../../../src/lib/config.js';
import {
    CRITERIA,
    CRITERION_KEYS,
    emptyAllocation,
    isValidAllocation,
} from '../../../src/lib/criteria.js';
import { APP_VERSION_PATTERN } from '../../../src/lib/patterns.js';

describe('config', () => {
    it('holds the agreed constants', () => {
        expect(config).toMatchObject({
            SEED_WEIGHT: 100,
            SCORE_PENALTY: 12,
            MIN_STUDIES_TO_FINISH: 10,
            MIN_STUDIES_TO_RANK: 10,
            MILESTONE_STUDIES: 12,
            TOKEN_BUDGET: 20,
            INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,
            INACTIVITY_WARNING_MS: 5 * 60 * 1000,
            PRESENCE_HEARTBEAT_MS: 60 * 1000,
            ACTIVE_WINDOW_MS: 2 * 60 * 1000,
            CONTENT_VERSION: 2,
            FEEDBACK_MODE: 'each',
            LEADERBOARD_SIZE: 200,
            RESULTS_TOP_N: 5,
        });
    });

    it('keeps the v1 storage keys so v1 participants can resume', () => {
        expect(config.STORAGE_KEYS).toEqual({
            state: 'workshopState',
            userName: 'userName',
            motion: 'utl.motion',
            locale: 'utl.locale',
        });
        expect(Object.isFrozen(config.STORAGE_KEYS)).toBe(true);
    });

    it('takes the app version from package.json', async () => {
        const { readFileSync } = await import('node:fs');
        const { version } = JSON.parse(
            readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
        );
        expect(config.APP_VERSION).toBe(version);
        expect(config.APP_VERSION).toMatch(APP_VERSION_PATTERN);
    });
});

describe('criteria', () => {
    it('lists the six criteria in rubric order with their study fields', () => {
        expect(CRITERIA.map(({ key, field }) => [key, field])).toEqual([
            ['title', 'title'],
            ['access', 'access'],
            ['source', 'source'],
            ['theory', 'overview'],
            ['methods', 'methods'],
            ['conclusion', 'conclusion'],
        ]);
        expect(CRITERION_KEYS).toHaveLength(6);
    });

    it('validates token allocations', () => {
        expect(
            isValidAllocation({
                title: 5,
                access: 3,
                source: 3,
                theory: 3,
                methods: 3,
                conclusion: 3,
            })
        ).toBe(true);
        expect(isValidAllocation({ ...emptyAllocation(), title: 20 })).toBe(true);
        expect(isValidAllocation(emptyAllocation())).toBe(false);
        expect(isValidAllocation({ ...emptyAllocation(), title: 21, access: -1 })).toBe(false);
        expect(isValidAllocation({ title: 20 })).toBe(false);
        expect(isValidAllocation(null)).toBe(false);
    });
});
