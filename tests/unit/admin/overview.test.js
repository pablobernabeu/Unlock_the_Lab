// @vitest-environment jsdom
/**
 * The admin overview against the real admin.html markup.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createOverview } from '../../../src/admin/overview.js';
import { createStore } from '../../../src/admin/store.js';
import { qs } from '../../../src/lib/dom.js';
import { initI18n } from '../../../src/lib/i18n.js';

// A path rather than a file URL: under jsdom, import.meta.url is not a file URL.
const PAGE = readFileSync(resolve(process.cwd(), 'admin.html'), 'utf8');
const BODY = PAGE.slice(PAGE.indexOf('<body>') + '<body>'.length, PAGE.indexOf('</body>'));

beforeAll(async () => {
    await initI18n({ namespaces: ['admin'] });
});

beforeEach(() => {
    document.body.innerHTML = BODY;
});

afterEach(() => {
    document.body.innerHTML = '';
});

function rating(value) {
    return { rating: value, prediction: 4, timestamp: 1, uid: 'u' };
}

describe('admin overview', () => {
    it('labels the completed count with the threshold, as the dashboard does', () => {
        const root = qs('#overview');
        createOverview(root, createStore({ schedule: () => {} }), () => 0);
        expect(qs('[data-stat-label="completed"]', root).textContent).toBe('Rated 10 or more');
        expect(qs('[data-stat-note="completed"]', root).textContent).toBe(
            'Sessions with at least 10 rated studies.'
        );
    });

    it('counts sessions that rated at least 10 studies as completed', () => {
        const root = qs('#overview');
        const store = createStore({ schedule: () => {} });
        const overview = createOverview(root, store, () => 0);
        const ratings = {};
        for (let study = 1; study <= 10; study += 1) {
            ratings[`STUDY-${study}`] = { session_1700000000000_a: rating(4) };
        }
        ratings['STUDY-1'].session_1700000000000_b = rating(6);
        store.set('ratings', ratings);
        overview.render();

        expect(qs('[data-stat="participants"]', root).textContent).toBe('2');
        expect(qs('[data-stat="ratings"]', root).textContent).toBe('11');
        expect(qs('[data-stat="completed"]', root).textContent).toBe('1');
    });
});
