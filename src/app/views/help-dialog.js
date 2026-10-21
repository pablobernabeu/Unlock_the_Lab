/**
 * The 'Glossary and rubric' dialog on study pages: a native modal <dialog>
 * (focus moves in, the page behind is inert, Escape closes) with two tabs
 * that follow the ARIA tabs pattern (arrow keys, Home and End).
 */
import { el } from '../../lib/dom.js';
import { t } from '../../lib/i18n.js';
import { renderGlossary, renderRubric } from './reference.js';

let dialog = null;

function buildTabs(content) {
    const panels = [
        { id: 'help-glossary', label: t('app.help.glossaryTab'), body: renderGlossary(content.glossary) },
        { id: 'help-rubric', label: t('app.help.rubricTab'), body: renderRubric(content.rubric) },
    ];
    const tabs = panels.map(({ id, label }, index) =>
        el(
            'button',
            {
                type: 'button',
                role: 'tab',
                id: `${id}-tab`,
                class: 'help-tabs__tab',
                'aria-controls': id,
                'aria-selected': index === 0 ? 'true' : 'false',
                tabindex: index === 0 ? '0' : '-1',
            },
            label
        )
    );
    const panelElements = panels.map(({ id, body }, index) =>
        el(
            'div',
            {
                role: 'tabpanel',
                id,
                class: 'help-tabs__panel',
                'aria-labelledby': `${id}-tab`,
                tabindex: '0',
                hidden: index !== 0,
            },
            body
        )
    );

    function select(index, { focus = true } = {}) {
        tabs.forEach((tab, i) => {
            const selected = i === index;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
            panelElements[i].hidden = !selected;
        });
        if (focus) tabs[index].focus();
    }

    const tabList = el(
        'div',
        { role: 'tablist', class: 'help-tabs__list', 'aria-label': t('app.help.tabsLabel') },
        tabs
    );
    tabList.addEventListener('click', (event) => {
        const index = tabs.indexOf(event.target.closest('[role="tab"]'));
        if (index !== -1) select(index);
    });
    tabList.addEventListener('keydown', (event) => {
        const current = tabs.indexOf(document.activeElement);
        if (current === -1) return;
        const moves = {
            ArrowRight: (current + 1) % tabs.length,
            ArrowLeft: (current - 1 + tabs.length) % tabs.length,
            Home: 0,
            End: tabs.length - 1,
        };
        if (event.key in moves) {
            event.preventDefault();
            select(moves[event.key]);
        }
    });
    return el('div', { class: 'help-tabs' }, tabList, panelElements);
}

function buildDialog(content) {
    const close = el(
        'button',
        { type: 'button', class: 'btn btn-secondary btn-small help-dialog__close' },
        t('app.help.close')
    );
    const element = el(
        'dialog',
        { class: 'dialog help-dialog', 'aria-labelledby': 'help-dialog-title' },
        el(
            'div',
            { class: 'help-dialog__header' },
            el('h2', { class: 'dialog__title', id: 'help-dialog-title' }, t('app.help.title')),
            close
        ),
        buildTabs(content)
    );
    close.addEventListener('click', () => element.close());
    // A click on the backdrop (outside the dialog box) closes it, as the v1 modal did.
    element.addEventListener('click', (event) => {
        if (event.target !== element) return;
        const box = element.getBoundingClientRect();
        const inside =
            event.clientX >= box.left &&
            event.clientX <= box.right &&
            event.clientY >= box.top &&
            event.clientY <= box.bottom;
        if (!inside) element.close();
    });
    document.body.append(element);
    return element;
}

/**
 * Opens the dialog, building it on first use, and returns focus to the opener on close.
 * @param {{glossary: object[], rubric: object[]}} content
 * @param {HTMLElement} [opener]
 * @returns {void}
 */
export function openHelpDialog(content, opener = document.activeElement) {
    dialog ??= buildDialog(content);
    if (dialog.open) return;
    dialog.addEventListener(
        'close',
        () => {
            if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
        },
        { once: true }
    );
    dialog.showModal();
}
