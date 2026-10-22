/**
 * Persistent in-page notices above the current view (connection problems, a
 * resumed session on a shared device, a room mismatch). Unlike toasts they
 * stay until resolved or dismissed, and they never sit behind a dialog.
 */
import { el } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

/**
 * @typedef {object} NoticeAction
 * @property {string} label
 * @property {() => void} [onClick] a button
 * @property {string} [href] a link instead of a button
 * @property {boolean} [primary]
 */

/**
 * @param {HTMLElement|null} container
 */
export function createNotices(container) {
    const shown = new Map();

    function actionElement({ label, onClick, href, primary }) {
        const className = ['btn', 'btn-small', primary ? 'btn-primary' : 'btn-secondary'];
        if (href) return el('a', { class: className, href }, label);
        return el('button', { type: 'button', class: className, onClick }, label);
    }

    function refresh() {
        if (container) container.hidden = shown.size === 0;
    }

    /**
     * Shows (or replaces) a notice.
     * @param {string} id
     * @param {object} notice
     * @param {'info'|'warning'|'danger'} [notice.tone]
     * @param {string} [notice.title]
     * @param {string|string[]} notice.text
     * @param {NoticeAction[]} [notice.actions]
     * @param {boolean} [notice.dismissible]
     * @param {boolean} [notice.urgent] announced at once (role="alert") rather than politely
     * @returns {void}
     */
    function show(id, { tone = 'info', title, text, actions = [], dismissible = false, urgent }) {
        if (!container) return;
        const paragraphs = Array.isArray(text) ? text : [text];
        const notice = el(
            'div',
            {
                class: ['notice', 'info-box', `info-box--${tone}`],
                role: urgent ? 'alert' : 'status',
                dataset: { notice: id },
            },
            title ? el('p', { class: 'info-box__title' }, title) : null,
            paragraphs.map((paragraph) => el('p', null, paragraph)),
            actions.length || dismissible
                ? el(
                      'div',
                      { class: 'notice__actions cluster' },
                      actions.map(actionElement),
                      dismissible
                          ? el(
                                'button',
                                {
                                    type: 'button',
                                    class: 'btn btn-small btn-link',
                                    onClick: () => clear(id),
                                },
                                t('app.notice.dismiss')
                            )
                          : null
                  )
                : null
        );
        const existing = shown.get(id);
        if (existing?.isConnected) existing.replaceWith(notice);
        else container.append(notice);
        shown.set(id, notice);
        refresh();
    }

    /**
     * Removes a notice.
     * @param {string} id
     * @returns {void}
     */
    function clear(id) {
        shown.get(id)?.remove();
        shown.delete(id);
        refresh();
    }

    /**
     * Removes the notices that only matter on the page where they appeared.
     * @param {string[]} ids
     * @returns {void}
     */
    function clearAll(ids = [...shown.keys()]) {
        for (const id of ids) clear(id);
    }

    return { show, clear, clearAll };
}
