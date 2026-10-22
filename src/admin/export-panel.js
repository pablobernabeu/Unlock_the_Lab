/**
 * Export: CSV and JSON per node, and a full JSON snapshot. Record counts in
 * the table come from the live data; each download reads the data afresh.
 */
import { qs, qsa, setText } from '../lib/dom.js';
import { formatNumber, t } from '../lib/i18n.js';
import { recordCount } from './counts.js';
import { downloadNodeCsv, downloadNodeJson, downloadSnapshot } from './downloads.js';
import { createStatus, errorReason, whileBusy } from './ui.js';

/**
 * Runs a download and reports the outcome in `status`.
 * @param {HTMLButtonElement} button the button that started it
 * @param {ReturnType<typeof createStatus>} status
 * @param {() => Promise<string>} download resolves to the file name
 * @param {() => boolean} isConnected
 * @returns {Promise<boolean | undefined>} true when the file was offered
 */
export function runDownload(button, status, download, isConnected) {
    return whileBusy(button, async () => {
        // Offline, Firebase answers from the last copy it received, which may be out of date.
        if (!isConnected()) {
            status.show(t('admin.export.offline'), 'error');
            return false;
        }
        status.show(t('admin.export.preparing'));
        try {
            const file = await download();
            status.show(t('admin.export.done', { file }), 'success');
            return true;
        } catch (error) {
            console.error('[admin] export', error);
            status.show(t('admin.export.failed', { reason: errorReason(error) }), 'error');
            return false;
        }
    });
}

/**
 * @param {HTMLElement} root the export section
 * @param {object} options
 * @param {import('firebase/database').Database} options.db
 * @param {ReturnType<import('./store.js').createStore>} options.store
 */
export function createExportPanel(root, { db, store }) {
    const status = createStatus(qs('[data-export-status]', root));
    const rows = qsa('[data-export-node]', root);
    const isConnected = () => store.get('connected') === true;

    root.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-export]');
        if (!button) return;
        const node = button.closest('[data-export-node]')?.dataset.exportNode;
        const format = button.dataset.export;
        const downloads = {
            snapshot: () => downloadSnapshot(db),
            csv: () => downloadNodeCsv(db, node),
            json: () => downloadNodeJson(db, node),
        };
        if (downloads[format]) runDownload(button, status, downloads[format], isConnected);
    });

    return {
        render() {
            for (const row of rows) {
                const node = row.dataset.exportNode;
                const count = store.has(node) ? recordCount(node, store.get(node)) : null;
                setText(
                    qs('[data-export-count]', row),
                    count === null
                        ? ''
                        : t('admin.export.records', { count, number: formatNumber(count) })
                );
            }
        },
        reset() {
            status.clear();
        },
    };
}
