/**
 * The study view, rendered from one template for every study: the study
 * card, the two answer scales (real radio inputs in fieldsets) and, once the
 * answers are saved, the feedback panel.
 */
import { MIN_STUDIES_TO_FINISH, RATING_MAX, RATING_MIN } from '../../lib/config.js';
import { CRITERIA, labelKey } from '../../lib/criteria.js';
import { el, escapeHtml } from '../../lib/dom.js';
import { getLocale, t } from '../../lib/i18n.js';
import { ConnectionError } from '../connection.js';
import { isPermissionDenied } from '../db-utils.js';
import { submitRating } from '../rating-submit.js';
import { responseTimeFor } from '../response-time.js';
import { isRated, ratedCount, studyPage, weightsPage } from '../state.js';
import { isUnavailable, setUnavailable, trustedHtml } from '../ui.js';
import { openHelpDialog } from './help-dialog.js';
import { renderFeedbackPanel } from './feedback.js';

const SLOW_SAVE_MS = 8000;
const SCALE = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

function studySectionHtml(study, field) {
    const html = study[field] ?? '';
    if (field !== 'methods') return html;
    const label = t('app.study.dataAvailability');
    return html.replace(label, `<strong>${escapeHtml(label)}</strong>`);
}

function toolbar(app, studyIndex) {
    const help = el(
        'button',
        { type: 'button', class: 'btn btn-secondary btn-small' },
        el('span', { 'aria-hidden': 'true' }, '📖'),
        t('app.help.open')
    );
    help.addEventListener('click', () => openHelpDialog(app.content, help));

    let back = null;
    if (studyIndex > 0 && !app.state.hasUsedBackButton) {
        const hintId = 'study-back-hint';
        const button = el(
            'button',
            { type: 'button', class: 'btn btn-secondary btn-small', 'aria-describedby': hintId },
            el('span', { 'aria-hidden': 'true' }, '←'),
            t('app.study.back')
        );
        button.addEventListener('click', () => {
            app.patch({ hasUsedBackButton: true });
            app.navigate(studyPage(studyIndex - 1));
        });
        back = el(
            'div',
            { class: 'study-toolbar__back' },
            button,
            el('span', { id: hintId, class: 'field-hint' }, t('app.study.backHint'))
        );
    }
    return el('div', { class: 'study-toolbar' }, back, help);
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
                null,
                t('app.study.progress', { position: studyIndex + 1, total: app.studyCount })
            ),
            el('span', { class: 'study__tag' }, t('app.study.fictional'))
        ),
        el(
            'p',
            { class: 'study__label' },
            el('span', { 'aria-hidden': 'true' }, titleCriterion.icon),
            ' ',
            t('app.study.titleLabel')
        ),
        el('h1', { id: 'study-title', class: 'study__title' }, study.title),
        CRITERIA.filter(({ key }) => key !== 'title').map(({ key, field, icon }) =>
            el(
                'section',
                { class: 'study__section' },
                el(
                    'h2',
                    { class: 'study__heading' },
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
        return error.kind === 'failed' ? t('app.study.notConnected') : t('app.study.sessionStopped');
    }
    if (isPermissionDenied(error)) return t('app.study.denied');
    return t('app.study.saveFailed');
}

function finishButton(app, page) {
    const button = el('button', { type: 'button', class: 'btn btn-secondary' }, t('app.study.finish'));
    button.addEventListener('click', () => app.finishEarly(page));
    return button;
}

function answersForm(app, study, studyIndex) {
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
    const submit = el(
        'button',
        { type: 'submit', class: 'btn btn-primary', 'aria-describedby': 'answers-submit-hint' },
        t('app.study.submit')
    );
    const submitHint = el(
        'p',
        { id: 'answers-submit-hint', class: 'field-hint' },
        t('app.study.submitHint')
    );
    const status = el('p', { class: 'answers__status', role: 'status' });
    const error = el('p', { class: 'answers__error field-error', role: 'alert' });
    const form = el(
        'form',
        { class: 'answers__form', novalidate: true },
        prediction,
        rating,
        el('div', { class: 'answers__actions' }, submit, submitHint),
        status,
        error
    );

    let busy = false;
    let slowTimer = null;
    const chosen = (name) => Number(form.elements[name].value) || null;
    const complete = () => chosen('prediction') !== null && chosen('rating') !== null;

    function refreshSubmit() {
        setUnavailable(submit, busy || !complete());
        submitHint.hidden = complete();
    }

    function setBusy(value) {
        busy = value;
        prediction.disabled = value;
        rating.disabled = value;
        form.setAttribute('aria-busy', String(value));
        submit.textContent = value ? t('app.study.saving') : t('app.study.submit');
        clearTimeout(slowTimer);
        status.textContent = '';
        if (value) slowTimer = setTimeout(() => (status.textContent = t('app.study.slow')), SLOW_SAVE_MS);
        refreshSubmit();
    }

    form.addEventListener('change', () => {
        error.textContent = '';
        refreshSubmit();
    });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy || isUnavailable(submit)) return;
        const submittedAt = Date.now();
        const answers = { prediction: chosen('prediction'), rating: chosen('rating') };
        error.textContent = '';
        setBusy(true);
        try {
            const { uid } = await app.connection.whenReady();
            const state = app.state;
            const result = await submitRating({
                study,
                sessionId: state.sessionId,
                uid,
                ...answers,
                responseTime: responseTimeFor(state.pageDisplayTimestamps, study.id, submittedAt),
                trial: ratedCount(state) + 1,
                locale: getLocale(),
                room: state.room,
            });
            setBusy(false);
            app.onRatingSaved(study, studyIndex, result);
        } catch (failure) {
            console.warn('[study] Answers not saved:', failure);
            setBusy(false);
            error.textContent = errorMessage(failure);
        }
    });
    refreshSubmit();

    const page = studyPage(studyIndex);
    const canFinish = ratedCount(app.state) >= MIN_STUDIES_TO_FINISH;
    return el(
        'section',
        { class: 'answers card', 'aria-labelledby': 'answers-heading' },
        el('h2', { id: 'answers-heading' }, t('app.study.answersHeading')),
        form,
        canFinish ? el('div', { class: 'answers__finish' }, finishButton(app, page)) : null
    );
}

function feedbackActions(app, studyIndex) {
    const last = studyIndex >= app.studyCount - 1;
    const next = el(
        'button',
        { type: 'button', class: 'btn btn-primary' },
        last ? t('app.study.toWeights') : t('app.study.next')
    );
    next.addEventListener('click', () =>
        app.navigate(last ? weightsPage(app.studyCount) : studyPage(studyIndex + 1))
    );
    const canFinish = !last && ratedCount(app.state) >= MIN_STUDIES_TO_FINISH;
    return [next, canFinish ? finishButton(app, studyPage(studyIndex)) : null];
}

/**
 * The saved answers for a study, in the shape the feedback panel expects.
 * @param {object} state
 * @param {string} studyId
 * @returns {object}
 */
export function savedResult(state, studyId) {
    return {
        rating: state.userRatings[studyId],
        prediction: state.userPredictions[studyId] ?? null,
        score: state.paperScores[studyId] ?? null,
        target: state.paperTargets[studyId] ?? null,
        crowd: state.paperCrowd[studyId] ?? null,
    };
}

/**
 * Renders the study at `studyIndex` in the participant's order.
 * @param {object} app the app context (see main.js)
 * @param {number} studyIndex
 * @returns {HTMLElement} the view
 */
export function renderStudyView(app, studyIndex) {
    const view = document.getElementById('view-study');
    const study = app.order[studyIndex];
    const rated = isRated(app.state, study.id);
    view.replaceChildren(
        toolbar(app, studyIndex),
        studyCard(app, study, studyIndex),
        rated
            ? renderFeedbackPanel({
                  study,
                  result: savedResult(app.state, study.id),
                  actions: feedbackActions(app, studyIndex),
              })
            : answersForm(app, study, studyIndex)
    );
    return view;
}
