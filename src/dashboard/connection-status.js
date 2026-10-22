/**
 * The 'Connected' line under the page heading. Firebase reports 'not
 * connected' before its first connection, so 'Connection lost' is only shown
 * once the page has been connected, or when connecting takes too long.
 */
import { setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

/** How long the page may take to connect before it says it is offline. */
export const CONNECT_GRACE_MS = 10 * 1000;

/**
 * @param {object} options
 * @param {HTMLElement} options.status carries `data-state`: 'live' or 'offline' (none while connecting)
 * @param {HTMLElement} options.text
 * @param {number} [options.graceMs]
 * @param {(callback: () => void, ms: number) => unknown} [options.wait] defaults to setTimeout
 * @returns {{setConnected: (connected: boolean) => void}}
 */
export function createConnectionStatus({
    status,
    text,
    graceMs = CONNECT_GRACE_MS,
    wait = (callback, ms) => setTimeout(callback, ms),
}) {
    let everConnected = false;
    let connected = false;

    function render(state) {
        if (status.dataset.state === state) return;
        status.dataset.state = state;
        setText(
            text,
            state === 'live' ? t('dashboard.connection.live') : t('dashboard.connection.offline')
        );
    }

    wait(() => {
        if (!connected) render('offline');
    }, graceMs);

    return {
        setConnected(next) {
            connected = next;
            if (next) everConnected = true;
            if (next) render('live');
            else if (everConnected) render('offline');
        },
    };
}
