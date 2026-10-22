/**
 * 'End all active sessions': records the server time in
 * /control/sessionsEndedAt, which every open workshop page listens to, and
 * clears the presence list. Sessions that started earlier close, including
 * ones whose page is shut at the moment (they close when the participant
 * returns); their answers so far are kept.
 */
import { MIN_STUDIES_TO_FINISH } from '../lib/config.js';
import { DB_TIMEOUT_MS, withTimeout } from '../lib/db-utils.js';
import { confirmDialog } from '../lib/dialog.js';
import { qs, setText } from '../lib/dom.js';
import { formatDate, t } from '../lib/i18n.js';
import { presenceCounts } from './counts.js';
import { ENDED_AT, endAllSessions } from './data.js';
import { createStatus, reportWriteFailure, whileBusy } from './ui.js';

/**
 * @param {HTMLElement} root the end-sessions section
 * @param {object} options
 * @param {import('firebase/database').Database} options.db
 * @param {ReturnType<import('./store.js').createStore>} options.store
 * @param {() => number} options.serverNow current server time in ms
 */
export function createEndSessions(root, { db, store, serverNow }) {
    const button = qs('[data-end-sessions]', root);
    const status = createStatus(qs('[data-end-status]', root));

    setText(
        qs('[data-end-results]', root),
        t('admin.end.results', { count: MIN_STUDIES_TO_FINISH })
    );

    function confirmationMessage() {
        const message = [t('admin.end.confirmText')];
        if (store.has('active')) {
            const { recent } = presenceCounts(store.get('active'), { now: serverNow() });
            message.push(t('admin.end.confirmActive', { count: recent }));
        }
        return message;
    }

    async function end() {
        status.clear();
        const confirmed = await confirmDialog({
            title: t('admin.end.confirmTitle'),
            message: confirmationMessage(),
            confirmLabel: t('admin.end.confirm'),
            danger: true,
        });
        if (!confirmed) return;
        // A write made offline would wait and apply later, so nothing is sent unless connected.
        if (store.get('connected') !== true) {
            status.show(t('admin.errors.notConnected'), 'error');
            return;
        }
        status.show(t('admin.end.working'));
        try {
            await withTimeout(endAllSessions(db), DB_TIMEOUT_MS, 'Ending sessions');
            status.show(t('admin.end.done'), 'success');
        } catch (error) {
            reportWriteFailure(status, error, {
                pending: () => t('admin.end.pending'),
                failed: (reason) => t('admin.end.failed', { reason }),
            });
        }
    }

    button.addEventListener('click', () => whileBusy(button, end));

    return {
        render() {
            const endedAt = store.get(ENDED_AT);
            setText(
                qs('[data-end-last]', root),
                !store.has(ENDED_AT)
                    ? ''
                    : Number.isFinite(endedAt)
                      ? t('admin.end.lastEnded', { date: formatDate(endedAt) })
                      : t('admin.end.neverEnded')
            );
        },
        reset() {
            status.clear();
        },
    };
}
