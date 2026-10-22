// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    announce,
    el,
    ensureLiveRegions,
    escapeHtml,
    focusHeading,
    qs,
    qsa,
    setText,
} from '../../../src/lib/dom.js';

afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
});

describe('escapeHtml', () => {
    it('escapes markup characters', () => {
        expect(escapeHtml(`<img src=x onerror="alert('x')"> & more`)).toBe(
            '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; more'
        );
    });

    it('turns null and undefined into an empty string', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(42)).toBe('42');
    });
});

describe('el', () => {
    it('creates elements with attributes, data, listeners and children', () => {
        const onClick = vi.fn();
        const button = el(
            'button',
            {
                class: ['btn', null, 'btn-primary'],
                type: 'button',
                dataset: { id: 'x' },
                disabled: false,
                hidden: true,
                onClick,
            },
            'Start ',
            el('span', null, 7),
            [null, ' later']
        );
        expect(button.outerHTML).toBe(
            '<button class="btn btn-primary" type="button" data-id="x" hidden="">Start <span>7</span> later</button>'
        );
        button.click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('keeps database strings as text, never markup', () => {
        const name = '<img src=x onerror=alert(1)>';
        const item = el('li', null, name);
        expect(item.querySelector('img')).toBeNull();
        expect(item.textContent).toBe(name);
        expect(el('p', { text: name }).innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('never writes inline event handler attributes', () => {
        const onclick = vi.fn();
        const link = el('a', { onclick, onmouseover: 'alert(1)', onFocus: 'alert(2)' });
        expect(link.getAttributeNames()).toEqual([]);
        link.click();
        expect(onclick).toHaveBeenCalledTimes(1);
    });
});

describe('qs, qsa and setText', () => {
    it('find and update elements', () => {
        document.body.innerHTML = '<p class="a">1</p><p class="a">2</p>';
        expect(qs('.a').textContent).toBe('1');
        expect(qsa('.a')).toHaveLength(2);
        expect(setText('.a', '<b>3</b>').innerHTML).toBe('&lt;b&gt;3&lt;/b&gt;');
        expect(setText('.missing', 'x')).toBeNull();
    });
});

describe('focusHeading', () => {
    it('makes the heading focusable without adding it to the tab order', () => {
        document.body.innerHTML = '<h1>Study 3 of 48</h1>';
        const heading = qs('h1');
        focusHeading(heading);
        expect(heading.getAttribute('tabindex')).toBe('-1');
        expect(document.activeElement).toBe(heading);
        expect(() => focusHeading(null)).not.toThrow();
    });
});

describe('announce', () => {
    it('writes to a shared polite or assertive live region', () => {
        vi.useFakeTimers();
        ensureLiveRegions();
        announce('Rating saved');
        announce('Connection lost', 'assertive');
        vi.advanceTimersByTime(100);
        const polite = qs('[data-live-region="polite"]');
        const assertive = qs('[data-live-region="assertive"]');
        expect(polite.getAttribute('aria-live')).toBe('polite');
        expect(polite.textContent).toBe('Rating saved');
        expect(assertive.textContent).toBe('Connection lost');
        expect(polite.classList.contains('visually-hidden')).toBe(true);
        announce('Rating saved');
        expect(polite.textContent).toBe('');
        vi.advanceTimersByTime(100);
        expect(polite.textContent).toBe('Rating saved');
        expect(qsa('[data-live-region]')).toHaveLength(2);
    });

    it('lets a newer message replace one that is still waiting', () => {
        vi.useFakeTimers();
        ensureLiveRegions();
        const polite = qs('[data-live-region="polite"]');
        const writes = [];
        new MutationObserver((records) => {
            for (const record of records)
                for (const node of record.addedNodes) writes.push(node.textContent);
        }).observe(polite, { childList: true });
        announce('Study 3 of 48');
        vi.advanceTimersByTime(10);
        announce('Study 4 of 48');
        vi.advanceTimersByTime(100);
        expect(polite.textContent).toBe('Study 4 of 48');
        return Promise.resolve().then(() => {
            expect(writes).not.toContain('Study 3 of 48');
        });
    });
});
