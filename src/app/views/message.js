/**
 * Single-message views: the facilitator has closed the session, results not
 * found, or a choice between several participants with the same nickname.
 */
import { MIN_STUDIES_TO_FINISH } from '../../lib/config.js';
import { el } from '../../lib/dom.js';
import { formatDate, t } from '../../lib/i18n.js';
import { resultsLink } from './results-actions.js';
import { setChildren } from '../ui.js';

function renderMessage({ heading, paragraphs = [], content = [], actions = [] }) {
    const view = document.getElementById('view-message');
    setChildren(
        view,
        el('h1', null, heading),
        el(
            'div',
            { class: 'flow view-body' },
            paragraphs.map((text) => el('p', null, text)),
            content
        ),
        actions.length ? el('div', { class: 'view-actions cluster' }, actions) : null
    );
    return view;
}

/**
 * 'The facilitator has closed this session', with the ways on.
 * @param {object} options
 * @param {(() => void)|null} options.onResults shown when the participant may see results
 * @param {() => void} options.onNewParticipant
 * @returns {HTMLElement}
 */
export function renderClosedView({ onResults, onNewParticipant }) {
    return renderMessage({
        heading: t('app.session.closedTitle'),
        paragraphs: [
            t('app.session.closedText'),
            onResults
                ? t('app.session.closedResultsText')
                : t('app.session.closedNoResultsText', { count: MIN_STUDIES_TO_FINISH }),
        ],
        actions: [
            onResults
                ? el(
                      'button',
                      { type: 'button', class: 'btn btn-primary', onClick: onResults },
                      t('app.session.closedResults')
                  )
                : null,
            el(
                'button',
                {
                    type: 'button',
                    class: onResults ? 'btn btn-secondary' : 'btn btn-primary',
                    onClick: onNewParticipant,
                },
                t('app.footer.newParticipant')
            ),
        ].filter(Boolean),
    });
}

/**
 * No results for a `?session=` link.
 * @returns {HTMLElement}
 */
export function renderNotFoundView() {
    return renderMessage({
        heading: t('app.results.notFoundHeading'),
        paragraphs: [t('app.results.notFoundText')],
        actions: [el('a', { class: 'btn btn-primary', href: '/' }, t('app.results.takePart'))],
    });
}

/**
 * Several participants share the nickname in a `?session=` link: let the reader choose.
 * @param {object[]} matches leaderboard entries, newest first
 * @returns {HTMLElement}
 */
export function renderChooseView(matches) {
    return renderMessage({
        heading: t('app.results.chooseHeading'),
        paragraphs: [t('app.results.chooseText')],
        content: [
            el(
                'ul',
                { class: 'choose-list' },
                matches.map((entry) =>
                    el(
                        'li',
                        null,
                        el(
                            'a',
                            { href: resultsLink(entry.sessionId) },
                            t('app.results.chooseItem', {
                                name: entry.userName,
                                count: entry.papersRated,
                                date: formatDate(entry.timestamp),
                            })
                        )
                    )
                )
            ),
        ],
    });
}

/**
 * A page that could not load at all.
 * @param {string} message
 * @returns {HTMLElement}
 */
export function renderFailedView(message) {
    return renderMessage({
        heading: t('app.loadFailedHeading'),
        paragraphs: [message],
        actions: [
            el(
                'button',
                { type: 'button', class: 'btn btn-primary', onClick: () => location.reload() },
                t('common.errors.reload')
            ),
        ],
    });
}
