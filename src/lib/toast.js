/**
 * Non-blocking status messages ('Link copied', 'You have rated 12 studies')
 * in a polite live region. Toasts never carry the only copy of important
 * information or require action: use a dialog or inline message for that.
 */
import { el } from './dom.js';
import { t } from './i18n.js';

const DEFAULT_DURATION_MS = 6000;

let region = null;

function toastRegion() {
    if (region?.isConnected) return region;
    region = el('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
    return region;
}

/**
 * Adds the toast live region to the page. Call it at start-up so the first
 * toast is announced reliably.
 * @returns {void}
 */
export function initToasts() {
    toastRegion();
}

/**
 * Shows a toast that disappears after `duration` ms (paused while hovered or
 * focused) or when dismissed.
 * @param {string} message plain text
 * @param {object} [options]
 * @param {'info'|'success'|'warning'|'error'} [options.tone]
 * @param {number} [options.duration] ms; 0 keeps it until dismissed
 * @returns {() => void} dismisses the toast
 */
export function showToast(message, { tone = 'info', duration = DEFAULT_DURATION_MS } = {}) {
    const container = toastRegion();
    let timer = null;
    // The countdown waits while the pointer is over the toast or focus is inside it.
    const holds = { pointer: false, focus: false };

    const toast = el(
        'div',
        { class: `toast toast--${tone}` },
        el('p', { class: 'toast__message' }, message),
        el(
            'button',
            {
                type: 'button',
                class: 'toast__close',
                'aria-label': t('common.toast.dismiss'),
                onClick: () => dismiss(),
            },
            el('span', { 'aria-hidden': 'true' }, '×')
        )
    );

    function dismiss() {
        clearTimeout(timer);
        toast.remove();
    }

    function restartTimer() {
        clearTimeout(timer);
        timer = null;
        if (duration > 0 && !holds.pointer && !holds.focus) timer = setTimeout(dismiss, duration);
    }

    function hold(reason, held) {
        holds[reason] = held;
        restartTimer();
    }

    toast.addEventListener('mouseenter', () => hold('pointer', true));
    toast.addEventListener('mouseleave', () => hold('pointer', false));
    toast.addEventListener('focusin', () => hold('focus', true));
    toast.addEventListener('focusout', (event) =>
        hold('focus', toast.contains(event.relatedTarget))
    );

    container.append(toast);
    restartTimer();
    return dismiss;
}
