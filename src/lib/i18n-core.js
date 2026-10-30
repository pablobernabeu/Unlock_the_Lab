/**
 * Key handling shared by the runtime (src/lib/i18n.js) and the build-time
 * prerender (tools/vite-plugin-i18n.js). Plain JavaScript with no Vite or DOM
 * features, so Node can import it.
 *
 * A key's first segment names the file: 'app.welcome.title' is
 * `{"welcome": {"title": "..."}}` in src/i18n/<locale>/app.json.
 */

/**
 * Splits a key into its namespace and the path inside that file.
 * @param {string} key e.g. 'common.dialog.ok'
 * @returns {{namespace: string, path: string[]} | null} null for malformed keys
 */
export function splitKey(key) {
    if (typeof key !== 'string') return null;
    const parts = key.trim().split('.');
    if (parts.length < 2 || parts.some((part) => part === '')) return null;
    const [namespace, ...path] = parts;
    return { namespace, path };
}

/**
 * Looks a key up in `{namespace: messages}`.
 * @param {Record<string, object>} namespaces
 * @param {string} key
 * @returns {unknown} the string or plural object, or undefined when missing
 */
export function lookupMessage(namespaces, key) {
    const parts = splitKey(key);
    if (!parts || !namespaces) return undefined;
    let node = namespaces[parts.namespace];
    for (const segment of parts.path) {
        if (!node || typeof node !== 'object' || !Object.hasOwn(node, segment)) return undefined;
        node = node[segment];
    }
    return node;
}

/**
 * True for plural forms such as `{"one": "{count} study", "other": "{count} studies"}`.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPluralForms(value) {
    return Boolean(value) && typeof value === 'object' && typeof value.other === 'string';
}

/**
 * Parses a `data-i18n-attr` value.
 * @param {string | null | undefined} spec e.g. 'aria-label:common.close; placeholder:app.name'
 * @returns {Array<[string, string]>} attribute and key pairs
 */
export function parseAttrSpec(spec) {
    if (!spec) return [];
    return spec
        .split(';')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
            const colon = pair.indexOf(':');
            return colon > 0 ? [pair.slice(0, colon).trim(), pair.slice(colon + 1).trim()] : null;
        })
        .filter((pair) => pair && pair[0] && pair[1]);
}

/**
 * Replaces `{name}` placeholders with `params.name`. Unknown placeholders are left as they are.
 * @param {string} text
 * @param {Record<string, unknown>} [params]
 * @param {(value: unknown) => string} [convert] how values become text (escaping, for example)
 * @returns {string}
 */
export function interpolate(text, params, convert = String) {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (placeholder, name) =>
        Object.hasOwn(params, name) ? convert(params[name]) : placeholder
    );
}
