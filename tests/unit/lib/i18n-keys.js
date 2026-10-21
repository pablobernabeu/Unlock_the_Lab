/**
 * Helpers for i18n-coverage.test.js: find every translation key the code and
 * pages use and check it against the English files in src/i18n/en.
 *
 * ENFORCED_NAMESPACES lists the namespaces whose keys must all exist. Each
 * track adds its namespace here when it creates src/i18n/en/<namespace>.json
 * ('app', 'dashboard', 'admin').
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookupMessage, parseAttrSpec, splitKey } from '../../../src/lib/i18n-core.js';

export const ENFORCED_NAMESPACES = ['common'];

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

/** t('key') and tHtml('key') calls with a literal key. */
const T_CALL = /\bt(?:Html)?\(\s*(['"`])([A-Za-z][\w-]*(?:\.[\w-]+)+)\1/g;
/** data-i18n="key" and data-i18n-html="key" in HTML, or 'data-i18n': 'key' in JavaScript. */
const DATA_I18N = /data-i18n(?:-html)?['"]?\s*[=:]\s*(['"])([^'"]+)\1/g;
/** data-i18n-attr="attr:key;attr:key". */
const DATA_I18N_ATTR = /data-i18n-attr['"]?\s*[=:]\s*(['"])([^'"]+)\1/g;

function walk(directory, extensions, found = []) {
    for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) walk(path, extensions, found);
        else if (extensions.some((extension) => name.endsWith(extension))) found.push(path);
    }
    return found;
}

/**
 * Drops comments (documentation examples are not real keys); good enough for key scanning.
 * Only comments that start a line are removed: a '/*' inside a string, as in
 * import.meta.glob('../i18n/*\/*.json'), would otherwise hide the code up to the next '*\/'.
 */
export function withoutComments(text, file) {
    if (file.endsWith('.html')) return text.replace(/<!--[\s\S]*?-->/g, '');
    return text.replace(/^\s*\/\*[\s\S]*?\*\//gm, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Source files that may reference translation keys: src/**\/*.{js,html} and the root pages. */
export function sourceFiles(root = ROOT) {
    const pages = readdirSync(root)
        .filter((name) => name.endsWith('.html'))
        .map((name) => join(root, name));
    return [...pages, ...walk(join(root, 'src'), ['.js', '.html'])];
}

/**
 * Every key used in the given files.
 * @returns {Map<string, Set<string>>} key -> files (relative to the repository)
 */
export function collectUsedKeys(files = sourceFiles(), root = ROOT) {
    const used = new Map();
    const add = (key, file) => {
        if (!used.has(key)) used.set(key, new Set());
        used.get(key).add(relative(root, file));
    };
    for (const file of files) {
        const text = withoutComments(readFileSync(file, 'utf8'), file);
        for (const [, , key] of text.matchAll(T_CALL)) add(key, file);
        for (const [, , key] of text.matchAll(DATA_I18N)) add(key, file);
        for (const [, , spec] of text.matchAll(DATA_I18N_ATTR)) {
            for (const [, key] of parseAttrSpec(spec)) add(key, file);
        }
    }
    return used;
}

/** All JSON files of one locale, as {namespace: messages}. */
export function loadLocale(locale, root = ROOT) {
    const directory = join(root, 'src', 'i18n', locale);
    return Object.fromEntries(
        readdirSync(directory)
            .filter((name) => name.endsWith('.json'))
            .map((name) => [
                name.slice(0, -'.json'.length),
                JSON.parse(readFileSync(join(directory, name), 'utf8')),
            ])
    );
}

/** Locale directories under src/i18n. */
export function localeCodes(root = ROOT) {
    return readdirSync(join(root, 'src', 'i18n')).filter((name) =>
        statSync(join(root, 'src', 'i18n', name)).isDirectory()
    );
}

/** True for a usable message: a string, or plural forms with 'other'. */
export function isMessage(value) {
    if (typeof value === 'string') return true;
    return (
        Boolean(value) &&
        typeof value === 'object' &&
        typeof value.other === 'string' &&
        Object.entries(value).every(
            ([category, text]) => PLURAL_CATEGORIES.has(category) && typeof text === 'string'
        )
    );
}

/** Every leaf key in a locale ({namespace: messages}), treating plural forms as leaves. */
export function leafKeys(namespaces) {
    const keys = [];
    const visit = (prefix, node) => {
        if (isMessage(node) || !node || typeof node !== 'object') {
            keys.push(prefix);
            return;
        }
        for (const [name, child] of Object.entries(node)) visit(`${prefix}.${name}`, child);
    };
    for (const [namespace, messages] of Object.entries(namespaces)) visit(namespace, messages);
    return keys;
}

/**
 * Keys in the enforced namespaces that have no English message.
 * @returns {Array<{key: string, files: string[]}>}
 */
export function missingKeys({
    used = collectUsedKeys(),
    english = loadLocale('en'),
    namespaces = ENFORCED_NAMESPACES,
} = {}) {
    return [...used]
        .filter(([key]) => namespaces.includes(splitKey(key)?.namespace))
        .filter(([key]) => !isMessage(lookupMessage(english, key)))
        .map(([key, files]) => ({ key, files: [...files] }));
}
