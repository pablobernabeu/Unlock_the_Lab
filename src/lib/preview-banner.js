/**
 * Warns visitors of a pull-request preview. Previews are published to
 * Firebase Hosting channels from builds with VITE_DEPLOY_TARGET=preview
 * (.github/workflows/ci.yml) and use the production database, so whatever
 * anyone does there is saved as real data.
 *
 * Each page's entry script imports this module for its side effect: in a
 * preview build it adds the banner once the strings have loaded, and in
 * every other build it does nothing.
 */
import { el } from './dom.js';
import { initI18n, t } from './i18n.js';

/** True in builds for Hosting preview channels. */
export const IS_PREVIEW_BUILD = import.meta.env.VITE_DEPLOY_TARGET === 'preview';

/**
 * Adds the preview banner at the top of the page header (or of the body on a
 * page without one), once. Inside the header landmark, screen readers reach
 * it first; it is plain text, so it takes no place in the tab order.
 * @returns {HTMLElement} the banner
 */
export function renderPreviewBanner() {
    const existing = document.querySelector('[data-preview-banner]');
    if (existing) return existing;
    const banner = el(
        'p',
        { class: 'preview-banner', dataset: { previewBanner: '' } },
        t('common.preview.banner')
    );
    const header = document.querySelector('body > header');
    if (header) header.prepend(banner);
    else document.body.prepend(banner);
    return banner;
}

/**
 * Loads the common strings, then adds the banner.
 * @returns {Promise<HTMLElement|null>} the banner, or null if the strings could not load
 */
export async function showPreviewBanner() {
    try {
        await initI18n();
    } catch (error) {
        // The page reports the failure itself; without strings there is no text to show.
        console.warn('[preview] Could not load the strings for the preview banner', error);
        return null;
    }
    return renderPreviewBanner();
}

if (IS_PREVIEW_BUILD) showPreviewBanner();
