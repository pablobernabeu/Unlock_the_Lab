/**
 * The study dialog: the study text, the expert's feedback and the participant
 * statistics, in a native modal <dialog> (focus moves in and is contained,
 * Escape closes it and focus returns to the control that opened it).
 */
import { CONTENT_VERSION, SEED_WEIGHT } from '../lib/config.js';
import { CRITERIA, labelKey } from '../lib/criteria.js';
import { el, qs, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { plainText } from './data.js';
import { bandLabel } from './labels.js';
import { formatCount, formatExpert, formatStat } from './numbers.js';

const STATS_HEADING_ID = 'study-dialog-stats-heading';

/**
 * Element with trusted markup from our own content files: the study texts may
 * hold <i> and similar. The expert feedback is plain text and never goes
 * through here (tests/unit/app/feedback.test.js checks the content for markup).
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

function versionNote(contentVersion) {
    if (contentVersion === CONTENT_VERSION) return null;
    const text =
        contentVersion === null
            ? t('dashboard.dialog.versionNoteAll')
            : t('dashboard.dialog.versionNote', { version: contentVersion });
    return el('p', { class: 'text-muted' }, text);
}

function statsSection({ row, target, room, contentVersion = CONTENT_VERSION }) {
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
        versionNote(contentVersion),
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
        el('p', { class: 'text-muted' }, t('dashboard.dialog.fictional')),
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
                el('p', null, item.note)
            )
        );
    return el(
        'section',
        { class: 'study-dialog__section', 'aria-labelledby': 'study-dialog-feedback-heading' },
        el('h3', { id: 'study-dialog-feedback-heading' }, t('dashboard.dialog.feedbackHeading')),
        el('p', null, feedback?.summary || t('dashboard.dialog.noFeedback')),
        items.length ? el('ul', { class: 'study-dialog__feedback' }, items) : null
    );
}

function expertLine(row) {
    if (row.expertRating === null) return el('p', { class: 'study-dialog__expert', hidden: true });
    return el(
        'p',
        { class: 'study-dialog__expert' },
        t(row.expertAveraged ? 'dashboard.dialog.expertAverage' : 'dashboard.dialog.expert', {
            rating: formatExpert(row.expertRating),
            band: bandLabel(row.band),
        })
    );
}

/**
 * @typedef {object} StudyDetails
 * @property {object} study
 * @property {object} row from studyRows
 * @property {{target: number, n: number}} target
 * @property {string|null} room
 * @property {number|null} [contentVersion] the version of the figures (null: every version)
 */

/**
 * @param {HTMLDialogElement} dialog
 * @returns {{open: (details: StudyDetails, opener?: HTMLElement|null) => void,
 *   refresh: (details: StudyDetails) => void, openStudyId: () => string|null}}
 */
export function createStudyDialog(dialog) {
    const title = qs('#study-dialog-title', dialog);
    const idLine = qs('[data-study-dialog-id]', dialog);
    const body = qs('[data-study-dialog-body]', dialog);
    let openId = null;
    let opener = null;
    let stats = null;
    let expert = null;

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
        open(details, openedBy = null) {
            const { study, row } = details;
            openId = study.id;
            opener = openedBy;
            setText(idLine, study.id);
            setText(title, plainText(study.title));
            stats = statsSection(details);
            expert = expertLine(row);
            body.replaceChildren(expert, stats, studySection(study), feedbackSection(study));
            if (!dialog.open) dialog.showModal();
            dialog.scrollTop = 0;
        },
        refresh(details) {
            if (!dialog.open || openId !== details.row.id || !stats) return;
            const next = statsSection(details);
            stats.replaceWith(next);
            stats = next;
            // With every version, the expert rating is an average that new ratings can move.
            const nextExpert = expertLine(details.row);
            expert.replaceWith(nextExpert);
            expert = nextExpert;
        },
        openStudyId: () => openId,
    };
}
