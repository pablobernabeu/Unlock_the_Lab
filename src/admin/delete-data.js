/**
 * 'Delete participant data': removes ratings, leaderboard, rankings, sessions
 * and the presence list together, after a typed confirmation that states
 * exactly what goes and offers a full snapshot first. Copies already made by
 * the daily GitHub backup (data branch) are not touched.
 */
import { DB_TIMEOUT_MS, withTimeout } from '../lib/db-utils.js';
import { promptDialog } from '../lib/dialog.js';
import { el, qs } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import {
    DELETED_NODES,
    deleteConfirmationText,
    deletionCounts,
    hasDeletableData,
    sessionsWithData,
} from './counts.js';
import { deleteParticipantData, readNodes } from './data.js';
import { downloadSnapshot } from './downloads.js';
import { runDownload } from './export-panel.js';
import { createStatus, errorReason, reportWriteFailure, whileBusy } from './ui.js';

const COUNT_TEXT = Object.freeze({
    ratings: (count) => t('admin.delete.counts.ratings', { count }),
    leaderboard: (count) => t('admin.delete.counts.leaderboard', { count }),
    rankings: (count) => t('admin.delete.counts.rankings', { count }),
    sessions: (count) => t('admin.delete.counts.sessions', { count }),
    active: (count) => t('admin.delete.counts.active', { count }),
});

function total(counts) {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/** The snapshot offer inside the confirmation dialog, with its own status line. */
function snapshotOffer(isConnected) {
    const status = el('p', { class: 'admin-status', role: 'status' });
    const button = el(
        'button',
        { type: 'button', class: 'btn btn-secondary btn-small' },
        t('admin.delete.snapshotFirst')
    );
    const report = createStatus(status);
    button.addEventListener('click', () =>
        runDownload(button, report, downloadSnapshot, isConnected)
    );
    return el('div', { class: 'admin-dialog-offer' }, button, status);
}

function confirmationMessage({ isConnected, counts, participants }) {
    return [
        t('admin.delete.confirmIntro'),
        el(
            'ul',
            { class: 'admin-dialog-list' },
            DELETED_NODES.map((name) => el('li', null, COUNT_TEXT[name](counts[name])))
        ),
        participants > 0 ? t('admin.delete.participants', { count: participants }) : null,
        t('admin.delete.race'),
        t('admin.delete.githubShort'),
        snapshotOffer(isConnected),
    ].filter(Boolean);
}

/**
 * @param {HTMLElement} root the delete section
 * @param {object} options
 * @param {import('firebase/database').Database} options.db
 * @param {ReturnType<import('./store.js').createStore>} options.store
 */
export function createDeleteData(root, { db, store }) {
    const button = qs('[data-delete]', root);
    const status = createStatus(qs('[data-delete-status]', root));
    const snapshotButton = qs('[data-delete-snapshot]', root);
    const isConnected = () => store.get('connected') === true;

    async function confirmDeletion() {
        const nodes = await readNodes(DELETED_NODES);
        if (!hasDeletableData(nodes)) {
            status.show(t('admin.delete.nothing'));
            return false;
        }
        const counts = deletionCounts(nodes);
        const participants = sessionsWithData(nodes);
        return promptDialog({
            title: t('admin.delete.confirmTitle'),
            message: confirmationMessage({ isConnected, counts, participants }),
            expected: deleteConfirmationText(participants),
            label:
                participants > 0 ? t('admin.delete.typeCount', { count: participants }) : undefined,
            confirmLabel: t('admin.delete.confirm'),
        });
    }

    async function reportOutcome() {
        // Anything written after the deletion (an open workshop page, say) is reported, not hidden.
        const after = await readNodes(DELETED_NODES).catch(() => null);
        const added = after ? total(deletionCounts(after)) : 0;
        if (added > 0) status.show(t('admin.delete.doneButNew', { count: added }), 'warning');
        else status.show(t('admin.delete.done'), 'success');
    }

    async function remove() {
        status.clear();
        // Offline, the deletion could not run, so there is no point in counting first.
        if (!isConnected()) {
            status.show(t('admin.errors.notConnected'), 'error');
            return;
        }
        let confirmed;
        try {
            confirmed = await confirmDeletion();
        } catch (error) {
            status.show(t('admin.delete.readFailed', { reason: errorReason(error) }), 'error');
            return;
        }
        if (!confirmed) return;
        // A write made offline would wait and apply later, so nothing is sent unless connected.
        if (!isConnected()) {
            status.show(t('admin.errors.notConnected'), 'error');
            return;
        }
        status.show(t('admin.delete.working'));
        try {
            await withTimeout(deleteParticipantData(db), DB_TIMEOUT_MS, 'Deleting data');
        } catch (error) {
            reportWriteFailure(status, error, {
                pending: () => t('admin.delete.pending'),
                failed: (reason) => t('admin.delete.failed', { reason }),
            });
            return;
        }
        await reportOutcome();
    }

    button.addEventListener('click', () => whileBusy(button, remove));
    snapshotButton.addEventListener('click', () =>
        runDownload(snapshotButton, status, downloadSnapshot, isConnected)
    );

    return {
        render() {},
        reset() {
            status.clear();
        },
    };
}
