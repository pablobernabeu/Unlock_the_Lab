/**
 * Glossary and rubric, shown on the guide page and in the help dialog.
 * Glossary definitions may hold trusted inline HTML from src/content.
 */
import { el } from '../../lib/dom.js';
import { t } from '../../lib/i18n.js';
import { trustedHtml } from '../ui.js';

/**
 * @param {Array<{term: string, definition: string}>} glossary
 * @returns {HTMLElement}
 */
export function renderGlossary(glossary) {
    return el(
        'dl',
        { class: 'glossary' },
        glossary.map(({ term, definition }) =>
            el(
                'div',
                { class: 'glossary__item' },
                el('dt', { class: 'glossary__term' }, term),
                trustedHtml('dd', { class: 'glossary__definition' }, definition)
            )
        )
    );
}

/** 'Clickbait: Uses words…' becomes '<strong>Clickbait:</strong> Uses words…', as in v1. */
function anchorText(text) {
    const colon = text.indexOf(':');
    if (colon === -1) return [text];
    return [el('strong', null, text.slice(0, colon + 1)), text.slice(colon + 1)];
}

const BANDS = ['low', 'medium', 'high'];

function bandHeading(field) {
    if (field === 'low') return t('app.guide.rubricLow');
    if (field === 'medium') return t('app.guide.rubricMedium');
    return t('app.guide.rubricHigh');
}

function rubricTable(rubric) {
    return el(
        'table',
        { class: 'table rubric-table' },
        el(
            'thead',
            null,
            el(
                'tr',
                null,
                el('th', { scope: 'col' }, t('app.guide.rubricCriterion')),
                BANDS.map((field) => el('th', { scope: 'col' }, bandHeading(field)))
            )
        ),
        el(
            'tbody',
            null,
            rubric.map((criterion) =>
                el(
                    'tr',
                    null,
                    el('th', { scope: 'row' }, criterion.name),
                    BANDS.map((field) => el('td', null, anchorText(criterion[field] ?? '')))
                )
            )
        )
    );
}

/** The same rubric as stacked cards, for narrow screens (CSS shows one or the other). */
function rubricCards(rubric) {
    return el(
        'div',
        { class: 'rubric-cards' },
        rubric.map((criterion) =>
            el(
                'section',
                { class: 'rubric-card' },
                el('h3', { class: 'rubric-card__title' }, criterion.name),
                el(
                    'dl',
                    { class: 'rubric-card__bands' },
                    BANDS.map((field) =>
                        el(
                            'div',
                            { class: `rubric-card__band rubric-card__band--${field}` },
                            el('dt', null, bandHeading(field)),
                            el('dd', null, anchorText(criterion[field] ?? ''))
                        )
                    )
                )
            )
        )
    );
}

/**
 * @param {Array<{name: string, low: string, medium: string, high: string}>} rubric
 * @returns {HTMLElement}
 */
export function renderRubric(rubric) {
    return el('div', { class: 'rubric' }, rubricTable(rubric), rubricCards(rubric));
}
