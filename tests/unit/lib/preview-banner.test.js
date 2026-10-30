// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const MESSAGE = 'Preview build: anything you do here is saved to the live database.';

/** A page shell like index.html, dashboard.html and admin.html. */
function pageShell() {
    document.body.innerHTML = `
        <a class="skip-link" href="#main">Skip to main content</a>
        <header class="site-header"><div class="site-header__inner">Unlock the Lab</div></header>
        <main id="main"><h1>Page</h1></main>`;
}

async function importFresh() {
    vi.resetModules();
    return import('../../../src/lib/preview-banner.js');
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('preview banner', () => {
    it('adds nothing to a build without VITE_DEPLOY_TARGET', async () => {
        pageShell();
        const { IS_PREVIEW_BUILD } = await importFresh();
        await vi.dynamicImportSettled();
        expect(IS_PREVIEW_BUILD).toBe(false);
        expect(document.querySelector('[data-preview-banner]')).toBeNull();
    });

    it('adds nothing for other deploy targets', async () => {
        vi.stubEnv('VITE_DEPLOY_TARGET', 'production');
        pageShell();
        const { IS_PREVIEW_BUILD } = await importFresh();
        await vi.dynamicImportSettled();
        expect(IS_PREVIEW_BUILD).toBe(false);
        expect(document.querySelector('[data-preview-banner]')).toBeNull();
    });

    it('warns at the top of the header of a preview build, on import alone', async () => {
        vi.stubEnv('VITE_DEPLOY_TARGET', 'preview');
        pageShell();
        const { IS_PREVIEW_BUILD } = await importFresh();
        expect(IS_PREVIEW_BUILD).toBe(true);
        await vi.waitFor(() => {
            expect(document.querySelector('[data-preview-banner]')).not.toBeNull();
        });
        const banner = document.querySelector('[data-preview-banner]');
        expect(banner.textContent).toBe(MESSAGE);
        expect(banner.parentElement).toBe(document.querySelector('header'));
        expect(banner.parentElement.firstElementChild).toBe(banner);
        // Plain text: visible to everyone and read first, without a stop in the tab order.
        expect(banner.tagName).toBe('P');
        expect(banner.hidden).toBe(false);
        expect(banner.querySelector('a, button, [tabindex]')).toBeNull();
    });

    it('adds the banner once, and to the body on a page without a header', async () => {
        document.body.innerHTML = '<main><h1>Page</h1></main>';
        const { showPreviewBanner } = await importFresh();
        const first = await showPreviewBanner();
        const second = await showPreviewBanner();
        expect(second).toBe(first);
        expect(document.querySelectorAll('[data-preview-banner]')).toHaveLength(1);
        expect(document.body.firstElementChild).toBe(first);
        expect(first.textContent).toBe(MESSAGE);
    });
});
