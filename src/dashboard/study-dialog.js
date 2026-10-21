/**
 * The study dialog: the study text, the expert's feedback and the participant
 * statistics, in a native modal <dialog> (focus moves in and is contained,
 * Escape closes it and focus returns to the control that opened it).
 */
import { SEED_WEIGHT } from '../lib/config.js';
import { CRITERIA, labelKey } from '../lib/criteria.js';
import { el, qs, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { plainText } from './data.js';
import { bandLabel } from './labels.js';
import { formatCount, formatStat } from './numbers.js';

const STATS_HEADING_ID = 'study-dialog-stats-heading';

/**
 * Element with trusted markup from our own content files (they may hold <i> and similar).
 * @param {string} tag
 * @param {string} html from src/content, never from the database
 * @param {Record<string, unknown>} [attrs]
 * @returns {HTMLElement}
 */
function trustedContent(tag, html, attrs) {
    const element = el(tag, attrs);
    element.innerHTML = html ?? '';
    return element;
}

function statPair(label, value) {
    return el('div', null, el('dt', null, label), el('dd', null, value));
}

function targetText({ target, n }) {
    const formatted = formatStat(target);
    if (n === 0) return t('dashboard.dialog.targetNone', { target: formatted });
    return t('dashboard.dialog.target', { target: formatted, weight: SEED_WEIGHT, count: n });
}

function statsSection(row, target, room) {
    const ci =
        row.lower === null
            ? formatStat(null)
            : t('dashboard.table.ciValue', {
                  lower: formatStat(row.lower),
                  upper: formatStat(row.upper),
              });
    return el(
        'section',
        { class: 'study-dialog__section', 'aria-labelledby': STATS_HEADING_ID },
        el('h3', { id: STATS_HEADING_ID }, t('dashboard.dialog.statsHeading')),
        room ? el('p', { class: 'text-muted' }, t('dashboard.dialog.roomNote', { room })) : null,
        el(
            'dl',
            { class: 'study-dialog__stats' },
            statPair(t('dashboard.dialog.stats.n'), formatCount(row.n)),
            statPair(t('dashboard.dialog.stats.mean'), formatStat(row.mean)),
            statPair(t('dashboard.dialog.stats.sd'), formatStat(row.sd)),
            statPair(t('dashboard.dialog.stats.ci'), ci),
            statPair(t('dashboard.dialog.stats.prediction'), formatStat(row.meanPrediction))
        ),
        el('p', null, targetText(target))
    );
}

function studySection(study) {
    const sections = CRITERIA.filter(({ field }) => field !== 'title').map(({ key, field, icon }) =>
        el(
            'div',
            { class: 'study-dialog__field' },
            el('h4', null, el('span', { 'aria-hidden': 'true' }, icon), ' ', t(labelKey(key))),
            trustedContent('p', study[field])
        )
    );
    return el(
        'section',
        { class: 'study-dialog__section', 'aria-labelledby': 'study-dialog-text-heading' },
        el('h3', { id: 'study-dialog-text-heading' }, t('dashboard.dialog.studyHeading')),
        sections
    );
}

function feedbackSection(study) {
    const feedback = study.feedback;
    const items = CRITERIA.map(({ key, icon }) => ({ key, icon, item: feedback?.criteria?.[key] }))
        .filter(({ item }) => item?.note)
        .map(({ key, icon, item }) =>
            el(
                'li',
                null,
                el(
                    'p',
                    { class: 'study-dialog__criterion' },
                    el('span', { 'aria-hidden': 'true' }, icon),
                    ' ',
                    el('strong', null, t(labelKey(key))),
                    ' ',
                    bandLabel(item.band)
                        ? el('span', { class: `badge badge--${item.band}` }, bandLabel(item.band))
                        : null
                ),
                trustedContent('p', item.note)
            )
        );
    return el(
        'section',
        { class: 'study-dialog__section', 'aria-labelledby': 'study-dialog-feedback-heading' },
        el('h3', { id: 'study-dialog-feedback-heading' }, t('dashboard.dialog.feedbackHeading')),
        feedback?.summary
            ? trustedContent('p', feedback.summary)
            : el('p', null, t('dashboard.dialog.noFeedback')),
        items.length ? el('ul', { class: 'study-dialog__feedback' }, items) : null
    );
}

function expertLine(row) {
    if (row.expertRating === null) return null;
    return el(
        'p',
        { class: 'study-dialog__expert' },
        t('dashboard.dialog.expert', {
            rating: formatCount(row.expertRating),
            band: bandLabel(row.band),
        })
    );
}

/**
 * @param {HTMLDialogElement} dialog
 * @returns {{open: (details: {study: object, row: object, target: {target: number, n: number},
 *   room: string|null}, opener?: HTMLElement|null) => void,
 *   refresh: (details: {row: object, target: {target: number, n: number}, room: string|null}) => void,
 *   openStudyId: () => string|null}}
 */
export function createStudyDialog(dialog) {
    const title = qs('#study-dialog-title', dialog);
    const idLine = qs('[data-study-dialog-id]', dialog);
    const body = qs('[data-study-dialog-body]', dialog);
    let openId = null;
    let opener = null;
    let stats = null;

    qs('[data-study-dialog-close]', dialog).addEventListener('click', () => dialog.close());
    // A click on the backdrop lands on the dialog element outside its box.
    dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        const outside =
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom;
        if (outside) dialog.close();
    });
    dialog.addEventListener('close', () => {
        openId = null;
        if (opener?.isConnected && typeof opener.focus === 'function') opener.focus();
        opener = null;
    });

    return {
        open({ study, row, target, room }, openedBy = null) {
            openId = study.id;
            opener = openedBy;
            setText(idLine, study.id);
            setText(title, plainText(study.title));
            stats = statsSection(row, target, room);
            body.replaceChildren(
                expertLine(row) ?? '',
                stats,
                studySection(study),
                feedbackSection(study)
            );
            if (!dialog.open) dialog.showModal();
            dialog.scrollTop = 0;
        },
        refresh({ row, target, room }) {
            if (!dialog.open || openId !== row.id || !stats) return;
            const next = statsSection(row, target, room);
            stats.replaceWith(next);
            stats = next;
        },
        openStudyId: () => openId,
    };
}
