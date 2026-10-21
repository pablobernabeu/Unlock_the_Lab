/**
 * Study texts, glossary and rubric. src/content/expert-ratings.json is the
 * single source of the expert ratings; the localisable texts live in
 * src/content/<locale>/{studies,glossary,rubric}.json. A translation can be
 * partial: every missing or empty field falls back to English.
 */
import expertRatings from '../content/expert-ratings.json';
import { STUDY_ID_PATTERN } from './patterns.js';
import { isValidRating } from './scoring.js';
import { DEFAULT_LOCALE, getLocale } from './i18n.js';

/** Expert rating (1-7) per study id. */
export const EXPERT_RATINGS = Object.freeze({ ...expertRatings });

const contentLoaders = import.meta.glob('../content/*/*.json', { import: 'default' });
const cache = new Map();

/**
 * Quality band of an expert rating, used for colours and feedback labels.
 * @param {number} rating 1-7
 * @returns {'low'|'medium'|'high'|null} low 1-2, medium 3-5, high 6-7; null when invalid
 */
export function qualityBand(rating) {
    if (!isValidRating(rating)) return null;
    if (rating <= 2) return 'low';
    if (rating <= 5) return 'medium';
    return 'high';
}

/**
 * Expert rating for a study.
 * @param {string} studyId e.g. 'STUDY-17'
 * @returns {number|null}
 */
export function expertRatingFor(studyId) {
    return Object.hasOwn(EXPERT_RATINGS, studyId) ? EXPERT_RATINGS[studyId] : null;
}

/**
 * The number in a study id, e.g. 17 for 'STUDY-17'.
 * @param {string} studyId
 * @returns {number} NaN for malformed ids
 */
export function studyNumber(studyId) {
    return STUDY_ID_PATTERN.test(studyId) ? Number(studyId.slice('STUDY-'.length)) : NaN;
}

/**
 * Sort comparator that orders STUDY-2 before STUDY-10.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareStudyIds(a, b) {
    const [numberA, numberB] = [studyNumber(a), studyNumber(b)];
    // Malformed ids go last; mixing NaN into a subtraction would make the order inconsistent.
    const malformed = Number.isNaN(numberA) - Number.isNaN(numberB);
    if (malformed !== 0) return malformed;
    return numberA - numberB || String(a).localeCompare(String(b));
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Fields that hold codes rather than text: a translation must never change them
 * (`band` is the expert feedback's 'low' | 'medium' | 'high', used for styling and lookups).
 */
const UNTRANSLATABLE_KEYS = new Set(['id', 'band']);

/**
 * Merges a translation over the English original field by field. Strings are
 * taken from the translation when non-empty; numbers, booleans, ids and bands
 * stay English; arrays (glossary, rubric) merge by position.
 * @param {unknown} english
 * @param {unknown} translated
 * @returns {unknown} a value with the shape of `english`
 */
export function mergeTranslation(english, translated) {
    if (translated === undefined || translated === null) return english;
    if (typeof english === 'string') {
        return typeof translated === 'string' && translated.trim() ? translated : english;
    }
    if (Array.isArray(english)) {
        return english.map((item, index) =>
            mergeTranslation(item, Array.isArray(translated) ? translated[index] : undefined)
        );
    }
    if (isPlainObject(english)) {
        if (!isPlainObject(translated)) return english;
        return Object.fromEntries(
            Object.entries(english).map(([key, value]) =>
                UNTRANSLATABLE_KEYS.has(key)
                    ? [key, value]
                    : [key, mergeTranslation(value, translated[key])]
            )
        );
    }
    return english;
}

/**
 * Merges translated studies (matched by id) over the English ones and adds `expertRating`.
 * @param {object[]} english
 * @param {object[] | undefined} translated
 * @returns {object[]}
 */
export function mergeStudies(english, translated) {
    const byId = new Map(
        (Array.isArray(translated) ? translated : []).map((study) => [study?.id, study])
    );
    return english.map((study) => ({
        ...mergeTranslation(study, byId.get(study.id)),
        expertRating: expertRatingFor(study.id),
    }));
}

async function loadFile(locale, name) {
    const loader = contentLoaders[`../content/${locale}/${name}.json`];
    if (!loader) return undefined;
    const data = await loader();
    return data?.default ?? data;
}

async function loadLocaleFiles(locale) {
    const [studies, glossary, rubric] = await Promise.all(
        ['studies', 'glossary', 'rubric'].map((name) => loadFile(locale, name))
    );
    return { studies, glossary, rubric };
}

async function buildContent(locale) {
    const english = await loadLocaleFiles(DEFAULT_LOCALE);
    let translated = {};
    if (locale !== DEFAULT_LOCALE) {
        // A broken or missing translation must not stop the workshop: English covers it.
        translated = await loadLocaleFiles(locale).catch(() => ({}));
    }
    return {
        studies: mergeStudies(english.studies ?? [], translated.studies),
        glossary: mergeTranslation(english.glossary ?? [], translated.glossary),
        rubric: mergeTranslation(english.rubric ?? [], translated.rubric),
    };
}

/**
 * Loads the content for a locale, with `expertRating` on every study and
 * English for anything the translation lacks. Results are cached per locale.
 * Studies keep their canonical order (STUDY-1 to STUDY-48); shuffle with
 * seededShuffle for a participant's order.
 * @param {string} [locale] defaults to the active UI locale
 * @returns {Promise<{studies: object[], glossary: object[], rubric: object[]}>}
 */
export function loadContent(locale = getLocale()) {
    if (!cache.has(locale)) {
        const promise = buildContent(locale);
        // Do not cache a failure: a later call (after a network blip) may succeed.
        promise.catch(() => cache.delete(locale));
        cache.set(locale, promise);
    }
    return cache.get(locale);
}
