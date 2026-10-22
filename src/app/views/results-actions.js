/**
 * The actions under the results: saving the results link and handing the
 * device to someone else (own results), or joining the workshop (a shared
 * read-only results page).
 */
import { el } from '../../lib/dom.js';
import { t } from '../../lib/i18n.js';

/**
 * The link that reopens a session's results (v1 used the same `?session=` form).
 * @param {string} sessionId
 * @returns {string}
 */
export function resultsLink(sessionId) {
    const url = new URL('/', location.href);
    url.searchParams.set('session', sessionId);
    return url.toString();
}

function emailHref({ link, name }) {
    const dashboard = new URL('/dashboard.html', location.href).toString();
    const subject = t('app.results.emailSubject');
    const body = t('app.results.emailBody', { url: link, name, dashboard });
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function copyLink(input, status) {
    try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard not available');
        await navigator.clipboard.writeText(input.value);
        status.textContent = t('app.results.copied');
    } catch {
        // Some browsers block the clipboard; the link is in the box, ready to copy by hand.
        input.focus();
        input.select();
        status.textContent = t('app.results.copyManual');
    }
}

function saveSection({ sessionId, name }) {
    const link = resultsLink(sessionId);
    const input = el('input', {
        id: 'results-link',
        type: 'text',
        class: 'input',
        readonly: true,
        value: link,
        spellcheck: 'false',
    });
    const status = el('p', { class: 'results-save__status', role: 'status' });
    return el(
        'section',
        {
            class: 'results-section info-box results-save',
            'aria-labelledby': 'results-save-heading',
        },
        el(
            'h2',
            { id: 'results-save-heading', class: 'info-box__title' },
            t('app.results.saveHeading')
        ),
        el('p', null, t('app.results.saveText', { name })),
        el(
            'div',
            { class: 'field' },
            el('label', { for: 'results-link' }, t('app.results.linkLabel')),
            input
        ),
        el(
            'div',
            { class: 'cluster results-save__actions' },
            el(
                'button',
                {
                    type: 'button',
                    class: 'btn btn-primary',
                    onClick: () => copyLink(input, status),
                },
                t('app.results.copy')
            ),
            el(
                'a',
                { class: 'btn btn-secondary', href: emailHref({ link, name }) },
                t('app.results.email')
            )
        ),
        status
    );
}

function newParticipantSection(onNewParticipant) {
    return el(
        'section',
        { class: 'results-section', 'aria-labelledby': 'results-new-heading' },
        el('h2', { id: 'results-new-heading' }, t('app.results.newHeading')),
        el('p', null, t('app.results.newText')),
        el(
            'button',
            { type: 'button', class: 'btn btn-secondary', onClick: onNewParticipant },
            t('app.footer.newParticipant')
        )
    );
}

/**
 * Actions for the participant's own results.
 * @param {object} options
 * @param {string} options.sessionId
 * @param {string} options.name the nickname
 * @param {() => void} options.onNewParticipant
 * @returns {void}
 */
export function renderOwnResultActions({ sessionId, name, onNewParticipant }) {
    document
        .getElementById('results-own-actions')
        .replaceChildren(saveSection({ sessionId, name }), newParticipantSection(onNewParticipant));
}

/**
 * The invitation shown under someone else's results.
 * @returns {void}
 */
export function renderReadOnlyResultActions() {
    document
        .getElementById('results-own-actions')
        .replaceChildren(
            el(
                'p',
                { class: 'results-section' },
                el('a', { class: 'btn btn-primary', href: '/' }, t('app.results.takePart'))
            )
        );
}
