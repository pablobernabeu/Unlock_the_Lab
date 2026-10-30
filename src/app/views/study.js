/**
 * The study view, rendered from one template for every study: the study
 * card, the two answer scales (real radio inputs in fieldsets) and, once the
 * answers are saved, the feedback panel.
 */
import {
    CONTENT_VERSION,
    MIN_STUDIES_TO_FINISH,
    RATING_MAX,
    RATING_MIN,
} from '../../lib/config.js';
import { expertRatingFor } from '../../lib/content.js';
import { CRITERIA, labelKey } from '../../lib/criteria.js';
import { isPermissionDenied } from '../../lib/db-utils.js';
import { el, escapeHtml } from '../../lib/dom.js';
import { getLocale, t } from '../../lib/i18n.js';
import { ConnectionError } from '../connection.js';
import { submitRating } from '../rating-submit.js';
import { responseTimeFor } from '../response-time.js';
import { isRated, ratedCount, studyPage, weightsPage } from '../state.js';
import { isUnavailable, setChildren, setUnavailable, trustedHtml } from '../ui.js';
import { openHelpDialog } from './help-dialog.js';
import { renderFeedbackPanel } from './feedback.js';

/** After this long without an answer from the server, say that saving is slow. */
const SLOW_SAVE_MS = 8000;
/** Marks (data-leaves-study) the buttons that leave the study: they wait while it is saving. */
const LEAVES_STUDY = { leavesStudy: '' };
const SCALE = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

/** Study text is trusted content HTML; 'Data availability:' in Methods is set in bold, as in v1. */
function studySectionHtml(study, field) {
    const html = study[field] ?? '';
    if (field !== 'methods') return html;
    const label = t('app.study.dataAvailability');
    return html.replace(label, `<strong>${escapeHtml(label)}</strong>`);
}

function backControl(app, studyIndex) {
    if (studyIndex === 0 || app.state.hasUsedBackButton) return null;
    const hintId = 'study-back-hint';
    const button = el(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            'aria-describedby': hintId,
            dataset: LEAVES_STUDY,
            onClick: () => {
                if (isUnavailable(button)) return;
                app.patch({ hasUsedBackButton: true });
                app.navigate(studyPage(studyIndex - 1));
            },
        },
        el('span', { 'aria-hidden': 'true' }, '←'),
        t('app.study.back')
    );
    return el(
        'div',
        { class: 'study-toolbar__back' },
        button,
        el('span', { id: hintId, class: 'field-hint' }, t('app.study.backHint'))
    );
}

function toolbar(app, studyIndex) {
    const help = el(
        'button',
        { type: 'button', class: 'btn btn-secondary btn-small study-toolbar__help' },
        el('span', { 'aria-hidden': 'true' }, '📖'),
        t('app.help.open')
    );
    help.addEventListener('click', () => openHelpDialog(app.content, help));
    return el('div', { class: 'study-toolbar' }, backControl(app, studyIndex), help);
}

function studyCard(app, study, studyIndex) {
    const titleCriterion = CRITERIA.find(({ key }) => key === 'title');
    return el(
        'article',
        { class: 'study card', 'aria-labelledby': 'study-title' },
        el(
            'p',
            { class: 'study__meta' },
            el(
                'span',
                { class: 'study__progress' },
                t('app.study.progress', { position: studyIndex + 1, total: app.studyCount })
            ),
            el('span', { class: 'study__tag' }, t('app.study.fictional'))
        ),
        el(
            'p',
            { class: 'study__label' },
            el('span', { 'aria-hidden': 'true' }, titleCriterion.icon),
            ' ',
            t(labelKey('title'))
        ),
        el('h1', { id: 'study-title', class: 'study__title' }, study.title),
        CRITERIA.filter(({ key }) => key !== 'title').map(({ key, field, icon }) =>
            el(
                'section',
                { class: 'study__section', 'aria-labelledby': `study-section-${key}` },
                el(
                    'h2',
                    { class: 'study__heading', id: `study-section-${key}` },
                    el('span', { 'aria-hidden': 'true' }, icon),
                    ' ',
                    t(labelKey(key))
                ),
                trustedHtml('p', null, studySectionHtml(study, field))
            )
        )
    );
}

function scaleFieldset({ name, legend, hint }) {
    const hintId = `${name}-hint`;
    return el(
        'fieldset',
        { class: 'scale-group', 'aria-describedby': hintId },
        el('legend', { class: 'scale-group__legend' }, legend),
        el('p', { id: hintId, class: 'field-hint' }, hint),
        el(
            'div',
            { class: 'scale' },
            SCALE.map((value) => {
                const id = `${name}-${value}`;
                let end = null;
                if (value === RATING_MIN) end = t('app.study.endLowSr');
                if (value === RATING_MAX) end = t('app.study.endHighSr');
                return el(
                    'div',
                    { class: 'scale__option' },
                    el('input', { type: 'radio', name, id, value, class: 'scale__input' }),
                    el(
                        'label',
                        { for: id, class: 'scale__label' },
                        el('span', { class: 'scale__number' }, value),
                        end ? el('span', { class: 'visually-hidden' }, ` (${end})`) : null
                    )
                );
            })
        ),
        el(
            'div',
            { class: 'scale__ends', 'aria-hidden': 'true' },
            el('span', null, t('app.study.endLow')),
            el('span', null, t('app.study.endHigh'))
        )
    );
}

function errorMessage(error) {
    if (error instanceof ConnectionError) {
        return error.kind === 'failed'
            ? t('app.study.notConnected')
            : t('app.study.sessionStopped');
    }
    if (isPermissionDenied(error)) return t('app.study.denied');
    return t('app.study.saveFailed');
}

function finishButton(app, page) {
    const button = el(
        'button',
        {
            type: 'button',
            class: 'btn btn-secondary',
            dataset: LEAVES_STUDY,
            onClick: () => {
                if (!isUnavailable(button)) app.finishEarly(page);
            },
        },
        t('app.study.finish')
    );
    return button;
}

function finishControl(app, studyIndex) {
    const canFinish =
        studyIndex < app.studyCount - 1 && ratedCount(app.state) >= MIN_STUDIES_TO_FINISH;
    if (!canFinish) return null;
    return el(
        'div',
        { class: 'study-finish' },
        el('p', { class: 'field-hint' }, t('app.study.finishHint')),
        finishButton(app, studyPage(studyIndex))
    );
}

/** The submit button and its state: unavailable until both answers are chosen or while saving. */
function createSubmitControl() {
    const button = el(
        'button',
        { type: 'submit', class: 'btn btn-primary', 'aria-describedby': 'answers-submit-hint' },
        t('app.study.submit')
    );
    const hint = el(
        'p',
        { id: 'answers-submit-hint', class: 'field-hint' },
        t('app.study.submitHint')
    );
    return {
        button,
        hint,
        update({ busy, complete }) {
            setUnavailable(button, busy || !complete);
            hint.hidden = complete;
            button.textContent = busy ? t('app.study.saving') : t('app.study.submit');
        },
    };
}

async function saveAnswers(app, study, answers, submittedAt) {
    const { uid } = await app.session.whenReady();
    const state = app.state;
    return submitRating({
        study,
        sessionId: state.sessionId,
        uid,
        ...answers,
        responseTime: responseTimeFor(state.pageDisplayTimestamps, study.id, submittedAt),
        trial: ratedCount(state) + 1,
        locale: getLocale(),
        room: state.room,
    });
}

function answersSection(app, study, studyIndex) {
    const prediction = scaleFieldset({
        name: 'prediction',
        legend: t('app.study.predictionLegend'),
        hint: t('app.study.predictionHint'),
    });
    const rating = scaleFieldset({
        name: 'rating',
        legend: t('app.study.ratingLegend'),
        hint: t('app.study.ratingHint'),
    });
    const submit = createSubmitControl();
    const status = el('p', { class: 'answers__status', role: 'status' });
    const error = el('p', { class: 'answers__error field-error', role: 'alert' });
    const form = el(
        'form',
        { class: 'answers__form', novalidate: true },
        prediction,
        rating,
        el('div', { class: 'answers__actions' }, submit.button, submit.hint),
        status,
        error
    );
    const section = el(
        'section',
        { class: 'answers card', 'aria-labelledby': 'answers-heading' },
        el('h2', { id: 'answers-heading' }, t('app.study.answersHeading')),
        form
    );

    let busy = false;
    let slowTimer = null;
    const chosen = (name) => Number(form.elements[name].value) || null;
    const complete = () => chosen('prediction') !== null && chosen('rating') !== null;

    function setBusy(value) {
        busy = value;
        // A disabled fieldset also stops the answers changing while they are being saved.
        prediction.disabled = value;
        rating.disabled = value;
        // Leaving now would put this study's feedback on whichever study is shown next.
        const view = section.closest('.view');
        for (const button of view?.querySelectorAll('[data-leaves-study]') ?? []) {
            setUnavailable(button, value);
        }
        form.setAttribute('aria-busy', String(value));
        clearTimeout(slowTimer);
        status.textContent = '';
        if (value) {
            slowTimer = setTimeout(() => {
                status.textContent = t('app.study.slow');
            }, SLOW_SAVE_MS);
        }
        submit.update({ busy, complete: complete() });
    }

    form.addEventListener('change', () => {
        error.textContent = '';
        submit.update({ busy, complete: complete() });
    });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy) return;
        if (!complete() || isUnavailable(submit.button)) {
            error.textContent = t('app.study.submitHint');
            return;
        }
        const answers = { prediction: chosen('prediction'), rating: chosen('rating') };
        error.textContent = '';
        setBusy(true);
        try {
            const result = await saveAnswers(app, study, answers, Date.now());
            setBusy(false);
            app.onRatingSaved(study, studyIndex, result, section);
        } catch (failure) {
            console.warn('[study] Answers not saved:', failure);
            setBusy(false);
            error.textContent = errorMessage(failure);
        }
    });
    submit.update({ busy, complete: complete() });
    return section;
}

function feedbackActions(app, studyIndex) {
    const last = studyIndex >= app.studyCount - 1;
    const next = el(
        'button',
        {
            type: 'button',
            class: 'btn btn-primary',
            onClick: () =>
                app.navigate(last ? weightsPage(app.studyCount) : studyPage(studyIndex + 1)),
        },
        last ? t('app.study.toWeights') : t('app.study.next')
    );
    return [next];
}

/**
 * The saved answers for a study, in the shape the feedback panel expects. An answer
 * given to an earlier content version carries the expert rating its target was made from.
 * @param {object} state
 * @param {string} studyId
 * @returns {object}
 */
export function savedResult(state, studyId) {
    const version = state.paperVersions?.[studyId] ?? CONTENT_VERSION;
    return {
        rating: state.userRatings[studyId],
        prediction: state.userPredictions[studyId] ?? null,
        score: state.paperScores[studyId] ?? null,
        target: state.paperTargets[studyId] ?? null,
        crowd: state.paperCrowd[studyId] ?? null,
        expertRating: version < CONTENT_VERSION ? expertRatingFor(studyId, version) : null,
    };
}

/**
 * The feedback panel (with its navigation) for a study the participant has rated.
 * @param {object} app
 * @param {number} studyIndex
 * @returns {HTMLElement}
 */
export function renderSavedFeedback(app, studyIndex) {
    const study = app.order[studyIndex];
    return renderFeedbackPanel({
        study,
        result: savedResult(app.state, study.id),
        showExpert: app.feedbackEachStudy,
        actions: feedbackActions(app, studyIndex),
    });
}

/**
 * Renders the study at `studyIndex` in the participant's order.
 * @param {object} app the app context (see participant.js)
 * @param {number} studyIndex
 * @returns {HTMLElement} the view
 */
export function renderStudyView(app, studyIndex) {
    const view = document.getElementById('view-study');
    const study = app.order[studyIndex];
    setChildren(
        view,
        toolbar(app, studyIndex),
        studyCard(app, study, studyIndex),
        isRated(app.state, study.id)
            ? renderSavedFeedback(app, studyIndex)
            : answersSection(app, study, studyIndex),
        finishControl(app, studyIndex)
    );
    return view;
}

/**
 * After a successful save: swaps the answer form for the feedback panel and
 * offers 'Finish' once enough studies are rated.
 * @param {object} app
 * @param {number} studyIndex
 * @param {HTMLElement} section the answers section that was submitted
 * @returns {HTMLElement} the feedback panel
 */
export function showFeedbackInPlace(app, studyIndex, section) {
    const panel = renderSavedFeedback(app, studyIndex);
    section.replaceWith(panel);
    const view = document.getElementById('view-study');
    view.querySelector('.study-finish')?.remove();
    const finish = finishControl(app, studyIndex);
    if (finish) view.append(finish);
    return panel;
}
