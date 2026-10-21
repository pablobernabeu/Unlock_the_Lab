/**
 * Entry script for static pages such as 404.html. The English text is already
 * in the HTML (prerendered at build time); this applies another language when
 * one is chosen, the animation preference and the language switcher.
 */
import { applyTranslations, initI18n } from './i18n.js';
import { renderLocaleSwitcher } from './locale-switcher.js';
import { initMotion } from './motion.js';

initMotion();
initI18n()
    .then(() => {
        applyTranslations();
        renderLocaleSwitcher(document.querySelector('[data-locale-switcher]'));
    })
    .catch((error) => {
        // The prerendered English text stays in place.
        console.warn('[i18n] Could not load translations', error);
    });
