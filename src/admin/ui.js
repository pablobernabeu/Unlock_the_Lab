/**
 * Small UI helpers shared by the admin panels.
 */
import { MISSING } from '../lib/format.js';
import { formatNumber, t } from '../lib/i18n.js';
import { TimeoutError, databaseErrorKey } from './errors.js';

/**
 * Writes messages into a status element that is always in the page (a live
 * region must exist before its text changes for screen readers to read it).
 * The tone only changes the styling; the text itself says what happened.
 * @param {HTMLElement} element an element with role="status" or role="alert"
 * @returns {{show: (message: string, tone?: 'info'|'success'|'warning'|'error') => void,
 *   clear: () => void}}
 */
export function createStatus(element) {
    return {
        show(message, tone = 'info') {
            element.dataset.tone = tone;
            element.textContent = message;
        },
        clear() {
            delete element.dataset.tone;
            element.textContent = '';
        },
    };
}

/**
 * Runs `task` while `button` shows that it is busy. The button stays
 * focusable (aria-disabled rather than disabled, so keyboard focus is not
 * lost) and further clicks are ignored until the task settles.
 * @template T
 * @param {HTMLButtonElement} button
 * @param {() => Promise<T>} task
 * @param {string} [busyLabel] text shown on the button meanwhile
 * @returns {Promise<T | undefined>} the task's result, or undefined when already busy
 */
export async function whileBusy(button, task, busyLabel) {
    if (button.dataset.busy === 'true') return undefined;
    const label = button.textContent;
    button.dataset.busy = 'true';
    button.setAttribute('aria-disabled', 'true');
    if (busyLabel) button.textContent = busyLabel;
    try {
        return await task();
    } finally {
        delete button.dataset.busy;
        button.removeAttribute('aria-disabled');
        if (busyLabel) button.textContent = label;
    }
}

/**
 * A sentence explaining why a database request failed.
 * @param {unknown} error
 * @returns {string}
 */
export function errorReason(error) {
    return t(databaseErrorKey(error));
}

/**
 * Reports a write that did not complete. Firebase cannot cancel a write, so a
 * timeout is reported as 'not confirmed yet' rather than as a failure.
 * @param {ReturnType<typeof createStatus>} status
 * @param {unknown} error
 * @param {object} messages
 * @param {() => string} messages.pending text for a write that may still apply
 * @param {(reason: string) => string} messages.failed text for a refused or failed write
 * @returns {void}
 */
export function reportWriteFailure(status, error, { pending, failed }) {
    console.error('[admin] write', error);
    if (error instanceof TimeoutError) status.show(pending(), 'warning');
    else status.show(failed(errorReason(error)), 'error');
}

/**
 * A count for display, or an en dash while it is unknown.
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function displayCount(value) {
    return Number.isFinite(value) ? formatNumber(value) : MISSING;
}
