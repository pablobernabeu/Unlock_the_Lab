/**
 * Accessible replacements for alert(), confirm() and prompt(), built on the
 * native `<dialog>` element with showModal(): focus moves into the dialog,
 * the page behind is inert, Escape cancels and focus returns to the control
 * that opened it.
 */
import { el } from './dom.js';
import { t } from './i18n.js';

let dialogCount = 0;

function messageNodes(message) {
    if (message === null || message === undefined || message === '') return [];
    if (message instanceof Node) return [message];
    const paragraphs = Array.isArray(message) ? message : [message];
    return paragraphs.map((text) => (text instanceof Node ? text : el('p', null, String(text))));
}

/**
 * Opens a modal dialog and resolves with the chosen value.
 * @param {object} options
 * @param {string} options.title
 * @param {string | string[] | Node} [options.message] text paragraphs or a prepared node
 * @param {Array<{value: string, label: string, variant?: string}>} options.actions in visual order
 * @param {string} options.initialFocus value of the action that receives focus first
 * @param {(parts: {body: HTMLElement, buttons: Map<string, HTMLButtonElement>}) => void} [options.extend]
 * @returns {Promise<string>} the action value, or 'cancel' on Escape
 */
function openDialog({ title, message, actions, initialFocus, extend }) {
    const id = `utl-dialog-${++dialogCount}`;
    const opener = document.activeElement;
    const buttons = new Map();

    const body = el(
        'div',
        { class: 'dialog__message', id: `${id}-message` },
        messageNodes(message)
    );
    const actionBar = el('div', { class: 'dialog__actions' });
    for (const action of actions) {
        const button = el(
            'button',
            {
                type: 'button',
                class: `btn ${action.variant ?? 'btn-secondary'}`,
                dataset: { value: action.value },
            },
            action.label
        );
        buttons.set(action.value, button);
        actionBar.append(button);
    }
    const dialog = el(
        'dialog',
        { class: 'dialog', 'aria-labelledby': `${id}-title`, 'aria-describedby': `${id}-message` },
        el('h2', { class: 'dialog__title', id: `${id}-title` }, title),
        body,
        actionBar
    );
    extend?.({ body, buttons });
    document.body.append(dialog);

    return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            if (dialog.open && typeof dialog.close === 'function') dialog.close();
            dialog.remove();
            if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
            resolve(value);
        };

        actionBar.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-value]');
            if (button && !button.disabled) finish(button.dataset.value);
        });
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            finish('cancel');
        });
        dialog.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish('cancel');
            }
        });
        // Other code may close the dialog directly (for example when a session ends);
        // the caller must still get an answer and the element must not linger.
        dialog.addEventListener('close', () => finish('cancel'));

        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        const focusTarget = dialog.querySelector('[data-autofocus]') ?? buttons.get(initialFocus);
        focusTarget?.focus();
    });
}

/**
 * Shows a message with a single OK button.
 * @param {object} options
 * @param {string} options.title
 * @param {string | string[] | Node} [options.message]
 * @param {string} [options.okLabel]
 * @returns {Promise<void>}
 */
export async function alertDialog({ title, message, okLabel = t('common.dialog.ok') }) {
    await openDialog({
        title,
        message,
        actions: [{ value: 'ok', label: okLabel, variant: 'btn-primary' }],
        initialFocus: 'ok',
    });
}

/**
 * Asks a yes/no question. Destructive (`danger`) questions focus Cancel first.
 * @param {object} options
 * @param {string} options.title
 * @param {string | string[] | Node} [options.message]
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {boolean} [options.danger]
 * @returns {Promise<boolean>} true when confirmed
 */
export async function confirmDialog({
    title,
    message,
    confirmLabel = t('common.dialog.confirm'),
    cancelLabel = t('common.dialog.cancel'),
    danger = false,
}) {
    const result = await openDialog({
        title,
        message,
        actions: [
            { value: 'cancel', label: cancelLabel, variant: 'btn-secondary' },
            {
                value: 'confirm',
                label: confirmLabel,
                variant: danger ? 'btn-danger' : 'btn-primary',
            },
        ],
        initialFocus: danger ? 'cancel' : 'confirm',
    });
    return result === 'confirm';
}

/**
 * Asks the person to type a word (such as DELETE) before a destructive action.
 * The confirm button stays disabled until the text matches exactly.
 * @param {object} options
 * @param {string} options.title
 * @param {string | string[] | Node} [options.message]
 * @param {string} options.expected the text to type
 * @param {string} [options.label] input label; defaults to 'Type {expected} to confirm'
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {boolean} [options.danger] defaults to true
 * @returns {Promise<boolean>} true when confirmed with the expected text
 */
export async function promptDialog({
    title,
    message,
    expected,
    label = t('common.dialog.typeToConfirm', { expected }),
    confirmLabel = t('common.dialog.confirm'),
    cancelLabel = t('common.dialog.cancel'),
    danger = true,
}) {
    let input;
    const result = await openDialog({
        title,
        message,
        actions: [
            { value: 'cancel', label: cancelLabel, variant: 'btn-secondary' },
            {
                value: 'confirm',
                label: confirmLabel,
                variant: danger ? 'btn-danger' : 'btn-primary',
            },
        ],
        initialFocus: 'cancel',
        extend: ({ body, buttons }) => {
            const inputId = `utl-prompt-${dialogCount}`;
            const confirmButton = buttons.get('confirm');
            input = el('input', {
                id: inputId,
                type: 'text',
                class: 'input',
                autocomplete: 'off',
                autocapitalize: 'off',
                spellcheck: 'false',
                dataset: { autofocus: '' },
            });
            confirmButton.disabled = true;
            input.addEventListener('input', () => {
                confirmButton.disabled = input.value.trim() !== expected;
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !confirmButton.disabled) confirmButton.click();
            });
            body.append(el('div', { class: 'field' }, el('label', { for: inputId }, label), input));
        },
    });
    return result === 'confirm' && input.value.trim() === expected;
}
