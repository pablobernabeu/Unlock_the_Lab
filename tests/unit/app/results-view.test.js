// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderResultsView } from '../../../src/app/views/results.js';
import { CONTENT_VERSION } from '../../../src/lib/config.js';
import { initI18n } from '../../../src/lib/i18n.js';

const INDEX_HTML = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../index.html'),
    'utf8'
);

const study = (number, title) => ({
    id: `STUDY-${number}`,
    title,
    expertRating: 2,
    feedback: { summary: 'A summary.', criteria: {} },
});

beforeAll(async () => {
    await initI18n({ namespaces: ['app'] });
});

beforeEach(() => {
    const page = new DOMParser().parseFromString(INDEX_HTML, 'text/html');
    document.body.replaceWith(document.importNode(page.body, true));
});

/** A read-only results view of the given rows. */
function readOnlyView(rows) {
    return renderResultsView({
        mode: 'readOnly',
        sessionId: 'session_1800000000000_abc123',
        name: 'Curious Otter 42',
        totals: { score: 176, papersRated: 2 },
        rows,
        room: null,
        entries: Promise.resolve([]),
        others: Promise.resolve({}),
        tokens: null,
    });
}

/** The accessible name that aria-labelledby gives an element. */
function labelledName(element) {
    return element
        .getAttribute('aria-labelledby')
        .split(' ')
        .map((id) => document.getElementById(id).textContent)
        .join(' ');
}

describe('renderResultsView', () => {
    it('names each expert feedback disclosure after its study', () => {
        const rows = [study(3, 'Chocolate and memory'), study(12, 'Screen time and sleep')].map(
            (item, index) => ({
                study: item,
                rating: 3,
                prediction: 4,
                score: 88,
                target: 3,
                crowd: null,
                trial: index + 1,
                expertRating: item.expertRating,
            })
        );
        const view = readOnlyView(rows);
        const names = [...view.querySelectorAll('.review-item summary')].map(labelledName);
        expect(names).toEqual([
            'Expert feedback on this study Chocolate and memory',
            'Expert feedback on this study Screen time and sleep',
        ]);
        // The visible text starts the name (WCAG 2.5.3).
        expect(view.querySelector('.review-item summary').textContent).toBe(
            'Expert feedback on this study'
        );
    });

    it("shows the expert rating of the row's content version and says when it is earlier", () => {
        const row = {
            study: study(13, 'Current text'),
            rating: 5,
            prediction: 5,
            score: 100,
            target: 5,
            crowd: null,
            trial: 1,
            contentVersion: 2,
            expertRating: 5,
        };
        const item = readOnlyView([row]).querySelector('.review-item');
        const expert = [...item.querySelectorAll('.review-item__fact')].at(-1);
        expect(expert.querySelector('dd').textContent).toMatch(/^5 /);
        expect(item.querySelector('.review-item__note').textContent).toContain('content version 2');
        // The feedback is the current text's, with its own expert rating.
        expect(item.querySelector('.expert-feedback__rating').textContent).toContain(
            'Expert rating: 2 out of 7'
        );
    });

    it('adds no version note to a rating of the current content version', () => {
        const row = {
            study: study(13, 'Current text'),
            rating: 2,
            prediction: 2,
            score: 100,
            target: 2,
            crowd: null,
            trial: 1,
            contentVersion: CONTENT_VERSION,
            expertRating: 2,
        };
        const item = readOnlyView([row]).querySelector('.review-item');
        expect(item.querySelector('.review-item__note')).toBeNull();
    });
});
