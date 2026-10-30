/**
 * The dashboard and the facilitator panel call a participant's mean score per
 * study by the participant app's name for it, 'Average score'.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLocale } from '../lib/i18n-keys.js';

const english = loadLocale('en');
const DASHBOARD_PAGE = readFileSync(resolve(process.cwd(), 'dashboard.html'), 'utf8');
const ADMIN_PAGE = readFileSync(resolve(process.cwd(), 'admin.html'), 'utf8');

/** Every string in a namespace, keyed by its dotted path. */
function strings(node, prefix) {
    if (typeof node === 'string') return [[prefix, node]];
    return Object.entries(node).flatMap(([key, value]) => strings(value, `${prefix}.${key}`));
}

describe('score terminology', () => {
    it('heads the leaderboard column with the participant app’s term', () => {
        const term = english.app.results.colScore;
        expect(term).toBe('Average score');
        expect(english.app.header.score).toBe(term);
        expect(english.dashboard.leaderboard.columns.score).toBe(term);
    });

    it('keeps the same term in the prerendered dashboard markup', () => {
        const heading = DASHBOARD_PAGE.match(
            /data-i18n="dashboard\.leaderboard\.columns\.score"\s*>\s*([^<]*?)\s*</
        );
        expect(heading?.[1]).toBe('Average score');
    });

    it('never calls the score accuracy on the dashboard or the facilitator panel', () => {
        const texts = [
            ...strings(english.dashboard, 'dashboard'),
            ...strings(english.admin, 'admin'),
        ];
        const accuracy = texts.filter(([, text]) => /accura/i.test(text)).map(([key]) => key);
        expect(accuracy).toEqual([]);
        for (const page of [DASHBOARD_PAGE, ADMIN_PAGE]) {
            const visible = page.replace(/<[^>]*>/g, ' ');
            expect(visible).not.toMatch(/accura/i);
        }
    });

    it('explains the average score in the leaderboard rules', () => {
        expect(english.dashboard.leaderboard.introRules).toMatch(/^A participant's average score /);
        expect(english.dashboard.leaderboard.dayNote).toContain('Their average score covers');
    });
});
