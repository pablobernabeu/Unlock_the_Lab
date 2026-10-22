/**
 * Runtime translations.
 *
 * UI strings live in src/i18n/<locale>/<namespace>.json. English pages are
 * prerendered at build time (tools/vite-plugin-i18n.js); at run time
 * `initI18n` loads the namespaces a page needs, `t()` looks keys up with
 * English as the fallback per key and `applyTranslations` fills
 * `data-i18n`, `data-i18n-html` and `data-i18n-attr` elements.
 *
 * Locale order: `?lang=` > the stored choice > navigator.languages > English,
 * restricted to locales that have files.
 */
import { STORAGE_KEYS } from './config.js';
import { escapeHtml } from './dom.js';
import { interpolate, isPluralForms, lookupMessage, parseAttrSpec } from './i18n-core.js';
import { safeGet, safeSet } from './storage.js';

export const DEFAULT_LOCALE = 'en';

const RTL_LANGUAGES = new Set(['ar', 'ckb', 'dv', 'fa', 'he', 'ps', 'sd', 'ur', 'yi']);

/** Shown for a missing date, as format.js does for other missing values. */
const MISSING_DATE = '–';

/**
 * Groups `import.meta.glob` results by locale and namespace.
 * @param {Record<string, () => Promise<object>>} modules keys like '../i18n/en/common.json'
 * @returns {Record<string, Record<string, () => Promise<object>>>} locale -> namespace -> loader
 */
export function catalogueFromGlob(modules) {
    const catalogue = {};
    for (const [path, loader] of Object.entries(modules)) {
        const match = path.match(/([^/]+)\/([^/]+)\.json$/);
        if (!match) continue;
        const [, locale, namespace] = match;
        catalogue[locale] ??= {};
        catalogue[locale][namespace] = loader;
    }
    return catalogue;
}

function languageOf(code) {
    return code.split('-')[0].toLowerCase();
}

/**
 * Picks the best available locale.
 * @param {object} sources
 * @param {string|null} [sources.requested] the `?lang=` value
 * @param {string|null} [sources.stored] the saved choice
 * @param {readonly string[]} [sources.languages] navigator.languages
 * @param {readonly string[]} sources.available locales with files
 * @param {string} [sources.fallback]
 * @returns {string}
 */
export function resolveLocale({
    requested,
    stored,
    languages = [],
    available,
    fallback = DEFAULT_LOCALE,
}) {
    const byLowerCase = new Map(available.map((code) => [code.toLowerCase(), code]));
    for (const candidate of [requested, stored, ...languages]) {
        if (typeof candidate !== 'string' || !candidate.trim()) continue;
        const wanted = candidate.trim().replace('_', '-').toLowerCase();
        if (byLowerCase.has(wanted)) return byLowerCase.get(wanted);
        const language = languageOf(wanted);
        if (byLowerCase.has(language)) return byLowerCase.get(language);
        const regional = available.find((code) => languageOf(code) === language);
        if (regional) return regional;
    }
    return fallback;
}

/**
 * Creates an independent translator. The module exports one instance built
 * from src/i18n; tests build their own with fixture catalogues.
 * @param {object} options
 * @param {Record<string, Record<string, () => Promise<object>>>} options.catalogue
 * @param {() => string} [options.getSearch] current `location.search`
 * @param {() => readonly string[]} [options.getLanguages] navigator.languages
 * @param {(url: string) => void} [options.navigate] loads a URL (reloads when unchanged)
 */
export function createI18n({
    catalogue,
    getSearch = () => globalThis.location?.search ?? '',
    getLanguages = () => globalThis.navigator?.languages ?? [],
    navigate = defaultNavigate,
}) {
    /** locale -> namespace -> messages */
    const messages = {};
    const pending = new Map();
    const warned = new Set();
    let locale = DEFAULT_LOCALE;
    let resolved = false;

    function availableLocales() {
        const codes = Object.keys(catalogue)
            .filter((code) => code !== DEFAULT_LOCALE)
            .sort();
        return [DEFAULT_LOCALE, ...codes];
    }

    function loadNamespace(code, namespace) {
        const id = `${code}/${namespace}`;
        if (messages[code]?.[namespace]) return Promise.resolve();
        if (pending.has(id)) return pending.get(id);
        const loader = catalogue[code]?.[namespace];
        if (!loader) return Promise.resolve();
        const promise = Promise.resolve(loader()).then((data) => {
            messages[code] ??= {};
            messages[code][namespace] = data?.default ?? data;
        });
        pending.set(id, promise);
        return promise.finally(() => pending.delete(id));
    }

    /**
     * Resolves the locale (on the first call), loads the namespaces and sets
     * `<html lang dir>`. 'common' is always loaded.
     * @param {object} [options]
     * @param {string[]} [options.namespaces] e.g. ['app']
     * @param {string} [options.locale] force a locale (tests, previews)
     * @returns {Promise<string>} the active locale
     */
    async function initI18n({ namespaces = [], locale: forced } = {}) {
        if (forced || !resolved) {
            locale = resolveLocale({
                requested: forced ?? new URLSearchParams(getSearch()).get('lang'),
                stored: safeGet(STORAGE_KEYS.locale),
                languages: getLanguages(),
                available: availableLocales(),
            });
            resolved = true;
        }
        const wanted = [...new Set(['common', ...namespaces])];
        await Promise.all(wanted.map((namespace) => loadNamespace(DEFAULT_LOCALE, namespace)));
        if (locale !== DEFAULT_LOCALE) {
            // A missing translation file must not break the page: English covers it.
            await Promise.allSettled(wanted.map((namespace) => loadNamespace(locale, namespace)));
        }
        setDocumentLanguage(locale);
        return locale;
    }

    function rawMessage(key) {
        // An empty string in a translation file means 'not translated yet'.
        const own = lookupMessage(messages[locale], key);
        if ((typeof own === 'string' && own !== '') || isPluralForms(own)) return own;
        return lookupMessage(messages[DEFAULT_LOCALE], key);
    }

    function selectForm(value, params) {
        if (!isPluralForms(value)) return typeof value === 'string' ? value : undefined;
        const count = Number(params?.count);
        if (!Number.isFinite(count)) return value.other;
        const category = new Intl.PluralRules(locale).select(count);
        return value[category] ?? value.other;
    }

    function warnMissing(key) {
        if (warned.has(key)) return;
        warned.add(key);
        console.warn(`[i18n] Missing translation key '${key}'`);
    }

    /**
     * True when a key resolves to a string or plural forms in the active locale or English.
     * @param {string} key
     * @returns {boolean}
     */
    function hasTranslation(key) {
        return selectForm(rawMessage(key), {}) !== undefined;
    }

    /**
     * Translates a key. `{name}` placeholders are filled from `params`; plural
     * forms are chosen by `params.count`. Missing keys return the key itself.
     * @param {string} key e.g. 'common.dialog.ok'
     * @param {Record<string, unknown>} [params]
     * @returns {string}
     */
    function t(key, params) {
        const text = selectForm(rawMessage(key), params);
        if (text === undefined) {
            warnMissing(key);
            return key;
        }
        return interpolate(text, params);
    }

    /**
     * Like `t`, for trusted locale HTML: the template may contain markup, and
     * every parameter is escaped. Use the result with innerHTML.
     * @param {string} key
     * @param {Record<string, unknown>} [params]
     * @returns {string}
     */
    function tHtml(key, params) {
        const text = selectForm(rawMessage(key), params);
        if (text === undefined) {
            warnMissing(key);
            return escapeHtml(key);
        }
        return interpolate(text, params, escapeHtml);
    }

    /**
     * Fills `data-i18n` (text), `data-i18n-html` (trusted locale HTML) and
     * `data-i18n-attr="attr:key;attr:key"` within `root`, including `root` itself.
     * Elements whose key is missing keep their current content.
     * @param {ParentNode} [root]
     * @returns {void}
     */
    function applyTranslations(root = globalThis.document) {
        if (!root) return;
        for (const element of withinRoot(root, '[data-i18n]')) {
            const key = element.getAttribute('data-i18n');
            if (hasTranslation(key)) element.textContent = t(key);
        }
        for (const element of withinRoot(root, '[data-i18n-html]')) {
            const key = element.getAttribute('data-i18n-html');
            if (hasTranslation(key)) element.innerHTML = t(key);
        }
        for (const element of withinRoot(root, '[data-i18n-attr]')) {
            for (const [attribute, key] of parseAttrSpec(element.getAttribute('data-i18n-attr'))) {
                if (hasTranslation(key)) element.setAttribute(attribute, t(key));
            }
        }
    }

    /**
     * @returns {string} the active locale code
     */
    function getLocale() {
        return locale;
    }

    /**
     * Saves a locale choice and reloads the page in that language.
     * @param {string} code one of availableLocales()
     * @returns {boolean} false when the locale is not available
     */
    function setLocale(code) {
        if (!availableLocales().includes(code)) return false;
        safeSet(STORAGE_KEYS.locale, code);
        const url = new URL(globalThis.location?.href ?? 'http://localhost/');
        if (url.searchParams.has('lang')) url.searchParams.set('lang', code);
        navigate(url.href);
        return true;
    }

    /**
     * Formats a number for the active locale.
     * @param {number} value
     * @param {Intl.NumberFormatOptions} [options]
     * @returns {string}
     */
    function formatNumber(value, options) {
        return new Intl.NumberFormat(intlLocale(locale), options).format(value);
    }

    /**
     * Formats a date for the active locale.
     * @param {Date | number | null | undefined} value a Date or ms since the epoch
     * @param {Intl.DateTimeFormatOptions} [options] defaults to medium date and short time
     * @returns {string} an en dash for a missing or invalid date
     */
    function formatDate(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
        // Intl would show null as 1 January 1970 and undefined as now; legacy records lack timestamps.
        const time = value instanceof Date ? value.getTime() : value;
        if (!Number.isFinite(time)) return MISSING_DATE;
        return new Intl.DateTimeFormat(intlLocale(locale), options).format(time);
    }

    return {
        initI18n,
        t,
        tHtml,
        hasTranslation,
        applyTranslations,
        getLocale,
        setLocale,
        availableLocales,
        formatNumber,
        formatDate,
    };
}

/** Intl locale for formatting: the interface's English is British, so dates read '22 Oct 2026'. */
function intlLocale(code) {
    return code === DEFAULT_LOCALE ? 'en-GB' : code;
}

function withinRoot(root, selector) {
    const own = typeof root.matches === 'function' && root.matches(selector) ? [root] : [];
    return [...own, ...root.querySelectorAll(selector)];
}

function setDocumentLanguage(code) {
    const html = globalThis.document?.documentElement;
    if (!html) return;
    html.lang = code;
    html.dir = RTL_LANGUAGES.has(languageOf(code)) ? 'rtl' : 'ltr';
}

function defaultNavigate(url) {
    const location = globalThis.location;
    if (!location) return;
    if (url === location.href) location.reload();
    else location.assign(url);
}

const translator = createI18n({
    catalogue: catalogueFromGlob(import.meta.glob('../i18n/*/*.json', { import: 'default' })),
});

/** Loads namespaces and resolves the locale; see createI18n. */
export const initI18n = translator.initI18n;
/** Translates a key; see createI18n. */
export const t = translator.t;
/** Translates trusted locale HTML with escaped parameters; see createI18n. */
export const tHtml = translator.tHtml;
/** True when a key has a translation; see createI18n. */
export const hasTranslation = translator.hasTranslation;
/** Fills data-i18n attributes; see createI18n. */
export const applyTranslations = translator.applyTranslations;
/** The active locale code. */
export const getLocale = translator.getLocale;
/** Saves a locale and reloads; see createI18n. */
export const setLocale = translator.setLocale;
/** Locale codes with translation files, English first. */
export const availableLocales = translator.availableLocales;
/** Locale-aware number formatting. */
export const formatNumber = translator.formatNumber;
/** Locale-aware date formatting. */
export const formatDate = translator.formatDate;
