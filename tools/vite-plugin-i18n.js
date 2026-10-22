/**
 * Vite plugin that prerenders English UI text into every HTML page, so pages
 * are complete before any JavaScript runs (and for search engines and
 * no-JS readers). For each element it fills:
 *
 *   data-i18n="ns.key"                  text content (escaped)
 *   data-i18n-html="ns.key"             trusted HTML from our own locale files
 *   data-i18n-attr="attr:ns.key;..."    attribute values (escaped)
 *
 * Strings come from src/i18n/en/<ns>.json. A missing key fails the build with
 * a list of every missing key; the dev server logs a warning instead and
 * leaves the element as it is. The attributes stay in place for the runtime
 * translator (src/lib/i18n.js), which uses the same key rules. Only those
 * elements change: the rest of the page is kept exactly as written.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { parse } from 'node-html-parser';
import { isPluralForms, lookupMessage, parseAttrSpec } from '../src/lib/i18n-core.js';

/**
 * Reads every `<ns>.json` file in a locale directory.
 * @param {string} directory e.g. '/repo/src/i18n/en'
 * @returns {Record<string, object>} namespace -> messages
 */
export function loadMessages(directory) {
    const namespaces = {};
    for (const file of readdirSync(directory)
        .filter((name) => name.endsWith('.json'))
        .sort()) {
        const path = join(directory, file);
        try {
            namespaces[basename(file, '.json')] = JSON.parse(readFileSync(path, 'utf8'));
        } catch (error) {
            throw new Error(`[i18n] ${path} is not valid JSON: ${error.message}`, { cause: error });
        }
    }
    return namespaces;
}

/** Elements whose content is kept as raw text, so markup-like text inside them survives. */
const RAW_TEXT_ELEMENTS = { script: true, style: true, noscript: true, pre: true, textarea: true };

/** `{name}` placeholders, which only t() can fill (src/lib/i18n-core.js interpolate). */
const PLACEHOLDER = /\{\w+\}/;

function escapeText(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
    return escapeText(value).replace(/"/g, '&quot;');
}

/** Length of the start tag at the beginning of `source`, up to and including its '>'. */
function startTagLength(source) {
    let quote = null;
    for (let index = 1; index < source.length; index++) {
        const char = source[index];
        if (quote) {
            if (char === quote) quote = null;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '>') {
            return index + 1;
        }
    }
    return source.length;
}

/** Attributes in a start tag, with their position: name="value", name='value', name=value or name. */
const ATTRIBUTE = /\s([^\s"'>/=]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;

/**
 * The start tag with each attribute set: an existing attribute is replaced in
 * place, a new one goes straight after the tag name (the end of a tag can be
 * ambiguous, as in <a href=/x/>).
 * @param {string} tag e.g. '<input type="text">'
 * @param {Array<[string, string]>} values attribute and unescaped value
 * @returns {string}
 */
function setAttributes(tag, values) {
    const nameEnd = tag.match(/^<[^\s/>]+/)[0].length;
    let result = tag;
    for (const [name, value] of values) {
        const attribute = ` ${name}="${escapeAttribute(value)}"`;
        const existing = [...result.matchAll(ATTRIBUTE)].find(
            ([, found]) => found.toLowerCase() === name.toLowerCase()
        );
        const [start, end] = existing
            ? [existing.index, existing.index + existing[0].length]
            : [nameEnd, nameEnd];
        result = result.slice(0, start) + attribute + result.slice(end);
    }
    return result;
}

/**
 * Applies text replacements to `html`. Later edits of the same range win, as at
 * run time (data-i18n-html after data-i18n), and edits inside replaced content
 * are dropped, because that content is gone.
 * @param {string} html
 * @param {Array<{start: number, end: number, text: string}>} edits
 * @returns {string}
 */
function applyEdits(html, edits) {
    const ordered = edits
        .map((edit, order) => ({ ...edit, order }))
        .sort((a, b) => a.start - b.start || b.end - a.end || b.order - a.order);
    let output = '';
    let cursor = 0;
    let previous = null;
    for (const edit of ordered) {
        const sameRange = previous && edit.start === previous.start && edit.end === previous.end;
        if (edit.start < cursor || sameRange) continue;
        output += html.slice(cursor, edit.start) + edit.text;
        cursor = edit.end;
        previous = edit;
    }
    return output + html.slice(cursor);
}

/**
 * Fills data-i18n, data-i18n-html and data-i18n-attr elements in an HTML document.
 * The parser only locates the elements: the page is edited in place, so all
 * other markup stays byte for byte as written (node-html-parser does not
 * follow the HTML rules for optional end tags such as </option>, and
 * re-serialising its tree could drop or move content).
 * @param {string} html
 * @param {Record<string, object>} messages namespace -> messages (English)
 * @returns {{html: string, missing: string[]}} `missing` lists unknown keys, keys
 *   that static HTML cannot use (plural forms, placeholders, objects) and
 *   elements without an explicit end tag
 */
export function prerenderHtml(html, messages) {
    const root = parse(html, { comment: true, blockTextElements: RAW_TEXT_ELEMENTS });
    const missing = new Set();
    const edits = [];

    const resolveText = (key) => {
        const value = lookupMessage(messages, key);
        if (typeof value === 'string' && !PLACEHOLDER.test(value)) return value;
        let reason = '';
        if (typeof value === 'string') reason = ' (has placeholders; set it at run time)';
        else if (isPluralForms(value)) reason = ' (plural forms need a count; set it at run time)';
        missing.add(key + reason);
        return null;
    };

    const startTagEnd = (element) => {
        const [start, end] = element.range;
        return start + startTagLength(html.slice(start, end));
    };

    const replaceContent = (element, attribute, content) => {
        const [, end] = element.range;
        const endTag = html
            .slice(startTagEnd(element), end)
            .match(new RegExp(`</${element.rawTagName}\\s*>$`, 'i'));
        if (!endTag) {
            const key = element.getAttribute(attribute);
            missing.add(
                `(<${element.rawTagName} ${attribute}="${key}"> needs an explicit end tag)`
            );
            return;
        }
        edits.push({ start: startTagEnd(element), end: end - endTag[0].length, text: content });
    };

    for (const element of root.querySelectorAll('[data-i18n]')) {
        const text = resolveText(element.getAttribute('data-i18n'));
        if (text !== null) replaceContent(element, 'data-i18n', escapeText(text));
    }
    for (const element of root.querySelectorAll('[data-i18n-html]')) {
        const markup = resolveText(element.getAttribute('data-i18n-html'));
        if (markup !== null) replaceContent(element, 'data-i18n-html', markup);
    }
    for (const element of root.querySelectorAll('[data-i18n-attr]')) {
        const spec = element.getAttribute('data-i18n-attr');
        const pairs = parseAttrSpec(spec);
        if (pairs.length === 0) missing.add(`(malformed data-i18n-attr '${spec}')`);
        const values = pairs
            .map(([attribute, key]) => [attribute, resolveText(key)])
            .filter(([, text]) => text !== null);
        if (values.length === 0) continue;
        const [start] = element.range;
        const end = startTagEnd(element);
        edits.push({ start, end, text: setAttributes(html.slice(start, end), values) });
    }
    return { html: applyEdits(html, edits), missing: [...missing] };
}

/**
 * @param {object} [options]
 * @param {string} [options.localeDir] English strings, relative to the Vite root
 * @returns {import('vite').Plugin}
 */
export default function i18nPrerender({ localeDir = 'src/i18n/en' } = {}) {
    let directory;
    let root;
    let isBuild = false;
    let logger = console;

    return {
        name: 'utl-i18n-prerender',

        configResolved(config) {
            root = config.root;
            directory = resolve(config.root, localeDir);
            isBuild = config.command === 'build';
            logger = config.logger;
        },

        configureServer(server) {
            // Edits to the strings should show up without restarting the dev server.
            server.watcher.add(directory);
            server.watcher.on('change', (file) => {
                if (resolve(file).startsWith(directory)) server.ws.send({ type: 'full-reload' });
            });
        },

        transformIndexHtml: {
            order: 'pre',
            handler(html, context) {
                const page = relative(root, context.filename);
                const { html: rendered, missing } = prerenderHtml(html, loadMessages(directory));
                if (missing.length > 0) {
                    const message = `[i18n] ${page}: missing English strings in ${localeDir}:\n  ${missing.join('\n  ')}`;
                    if (isBuild) throw new Error(message);
                    logger.warn(message);
                }
                return rendered;
            },
        },
    };
}
