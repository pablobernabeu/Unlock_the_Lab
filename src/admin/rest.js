/**
 * Reads database nodes over the Realtime Database REST API, as the daily
 * backup (scripts/backup.mjs) does. The exports and the delete confirmation
 * read this way rather than through the SDK: @firebase/database calls
 * `obj.hasOwnProperty(key)` on server data, so a child named 'hasOwnProperty'
 * (which the v1 rules let anyone create) makes it give up on the whole node
 * and report it as empty, and a download would then hold nothing. Every node
 * read here is public-read, so no sign-in token is sent.
 * Pure (no Firebase import), so it can be unit-tested in Node.
 */

/**
 * The REST base URL of the database: the configured URL, or the local
 * emulator with the database's namespace as `ns`.
 * @param {object} options
 * @param {string} options.databaseURL e.g. 'https://<namespace>.europe-west1.firebasedatabase.app'
 * @param {string} [options.emulatorOrigin] e.g. 'http://127.0.0.1:9000' when using the emulators
 * @returns {URL}
 */
export function restBaseUrl({ databaseURL, emulatorOrigin }) {
    const configured = new URL(databaseURL);
    if (!emulatorOrigin) return configured;
    const base = new URL(emulatorOrigin);
    // The SDK takes the namespace from `ns` when the URL has one, otherwise from the subdomain.
    const namespace = configured.searchParams.get('ns') ?? configured.hostname.split('.')[0];
    base.searchParams.set('ns', namespace);
    return base;
}

/**
 * The REST URL of one node, keeping the base URL's query (such as `ns`).
 * @param {URL | string} base from restBaseUrl()
 * @param {string} name node name, e.g. 'ratings'
 * @returns {URL}
 */
export function restNodeUrl(base, name) {
    const url = new URL(base);
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${name}.json`;
    return url;
}

/** The `error` field of a REST error body, such as 'Permission denied', or the start of the body. */
function errorText(body) {
    try {
        const { error } = JSON.parse(body);
        if (typeof error === 'string') return error;
    } catch {
        // Not JSON: fall through to the raw text.
    }
    return body.slice(0, 200);
}

/**
 * Reads one node as the server stores it.
 * @param {URL | string} base from restBaseUrl()
 * @param {string} name node name, e.g. 'ratings'
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<unknown>} the node's value (null when empty)
 */
export async function fetchNode(base, name, { fetchImpl = fetch } = {}) {
    const response = await fetchImpl(restNodeUrl(base, name), {
        headers: { accept: 'application/json' },
        cache: 'no-store',
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        // Keeps the server's words, so that 'Permission denied' is recognised as a refusal.
        throw new Error(`Reading /${name} failed (HTTP ${response.status}): ${errorText(body)}`);
    }
    return response.json();
}
