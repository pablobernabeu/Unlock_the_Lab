/**
 * The criterion weights page: the participant shares TOKEN_BUDGET tokens
 * between the six criteria. Each criterion has a − / + stepper that carries
 * the state for keyboard and screen-reader users, and a row of token boxes for
 * pointer users (hidden from assistive technology, since it repeats the
 * stepper). The allocation is saved in the participant state on every change
 * and written once, create-only, to /rankings/{sessionId}.
 */
import { TOKEN_BUDGET } from '../../lib/config.js';
import { CRITERIA, descriptionKey, labelKey } from '../../lib/criteria.js';
import { announce, el } from '../../lib/dom.js';
import { t } from '../../lib/i18n.js';
import { showToast } from '../../lib/toast.js';
import { ConnectionError } from '../connection.js';
import { submitRanking } from '../ranking-submit.js';
import { isRated, resultsPage } from '../state.js';
import { allocationComplete, maxTokensFor, setTokens, tokensUsed } from '../tokens.js';
import { isUnavailable, setChildren, setUnavailable } from '../ui.js';

/**
 * Writes the allocation once the session is connected and has a nickname.
 * @param {object} app
 * @param {Record<string, number>} tokens
 * @returns {Promise<Record<string, number>>} the allocation stored in the database
 */
async function saveRanking(app, tokens) {
    const { uid } = await app.session.whenReady();
    await app.session.ensureUsername();
    const { sessionId, userName, room } = app.state;
    return submitRanking({ sessionId, uid, userName, room, tokens });
}

function criterionRow(key, icon, onSet) {
    const labelId = `weight-${key}-label`;
    const countId = `weight-${key}-count`;
    const label = t(labelKey(key));
    const minus = el(
        'button',
        {
            type: 'button',
            class: 'stepper__button',
            'aria-label': t('app.weights.remove', { criterion: label }),
            'aria-describedby': countId,
        },
        el('span', { 'aria-hidden': 'true' }, '−')
    );
    const plus = el(
        'button',
        {
            type: 'button',
            class: 'stepper__button',
            'aria-label': t('app.weights.add', { criterion: label }),
            'aria-describedby': countId,
        },
        el('span', { 'aria-hidden': 'true' }, '+')
    );
    const count = el('span', { id: countId, class: 'stepper__count' });
    const boxes = Array.from({ length: TOKEN_BUDGET }, (_, index) =>
        el('button', {
            type: 'button',
            class: 'token-box',
            tabindex: '-1',
            dataset: { count: String(index + 1) },
        })
    );
    const bar = el('div', { class: 'token-bar', 'aria-hidden': 'true' }, boxes);
    // Clicking a box must not move focus into the hidden bar.
    bar.addEventListener('mousedown', (event) => event.preventDefault());
    bar.addEventListener('click', (event) => {
        const box = event.target.closest('.token-box');
        if (box) onSet(key, Number(box.dataset.count), { fromBar: true });
    });
    minus.addEventListener('click', () => {
        if (!isUnavailable(minus)) onSet(key, -1, { step: true });
    });
    plus.addEventListener('click', () => {
        if (!isUnavailable(plus)) onSet(key, 1, { step: true });
    });

    const row = el(
        'div',
        { class: 'weights-row', role: 'group', 'aria-labelledby': labelId },
        el(
            'div',
            { class: 'weights-row__text' },
            el(
                'h2',
                { class: 'weights-row__label', id: labelId },
                el('span', { 'aria-hidden': 'true' }, icon),
                ' ',
                label
            ),
            el('p', { class: 'field-hint' }, t(descriptionKey(key)))
        ),
        el('div', { class: 'stepper' }, minus, count, plus),
        bar
    );

    function update(tokens) {
        const value = tokens[key];
        const max = maxTokensFor(tokens, key);
        count.textContent = t('app.weights.count', { count: value });
        setUnavailable(minus, value === 0);
        setUnavailable(plus, value >= max);
        boxes.forEach((box, index) => {
            box.classList.toggle('token-box--filled', index < value);
            box.classList.toggle('token-box--blocked', index >= max);
        });
    }
    return { row, update };
}

/**
 * @param {object} app the app context (see participant.js)
 * @returns {HTMLElement} the view
 */
export function renderWeightsView(app) {
    const view = document.getElementById('view-weights');
    let tokens = { ...app.state.criterionTokens };
    let busy = false;

    const used = el('p', { class: 'weights-total__text' });
    const fill = el('div', { class: 'weights-total__fill' });
    const submit = el(
        'button',
        { type: 'button', class: 'btn btn-primary', 'aria-describedby': 'weights-submit-hint' },
        t('app.weights.submit')
    );
    const hint = el('p', { id: 'weights-submit-hint', class: 'field-hint' });
    const status = el('p', { class: 'weights__status', role: 'status' });
    const error = el('p', { class: 'field-error', role: 'alert' });

    const rows = CRITERIA.map(({ key, icon }) => criterionRow(key, icon, onSet));

    function refresh() {
        const total = tokensUsed(tokens);
        used.textContent = t('app.weights.used', { used: total, budget: TOKEN_BUDGET });
        fill.style.width = `${(total / TOKEN_BUDGET) * 100}%`;
        rows.forEach(({ update }) => update(tokens));
        const complete = allocationComplete(tokens);
        setUnavailable(submit, busy || !complete);
        hint.hidden = complete;
        hint.textContent = t('app.weights.submitHint', {
            budget: TOKEN_BUDGET,
            remaining: TOKEN_BUDGET - total,
            count: TOKEN_BUDGET - total,
        });
    }

    function onSet(key, value, { step = false } = {}) {
        if (busy) return;
        const next = setTokens(tokens, key, step ? tokens[key] + value : value);
        if (next === tokens) return;
        tokens = next;
        app.patch({ criterionTokens: tokens });
        error.textContent = '';
        refresh();
        announce(
            t('app.weights.announce', {
                criterion: t(labelKey(key)),
                count: tokens[key],
                used: tokensUsed(tokens),
                budget: TOKEN_BUDGET,
            })
        );
    }

    submit.addEventListener('click', async () => {
        if (busy) return;
        if (isUnavailable(submit)) {
            error.textContent = hint.textContent;
            return;
        }
        busy = true;
        submit.textContent = t('app.weights.saving');
        error.textContent = '';
        refresh();
        try {
            const saved = await saveRanking(app, tokens);
            // An earlier attempt that timed out may have landed after all; its allocation stays.
            const keptEarlier = CRITERIA.some(({ key }) => saved[key] !== tokens[key]);
            app.patch({ rankingSubmitted: true, criterionTokens: saved });
            app.navigate(resultsPage(app.studyCount));
            if (keptEarlier) showToast(t('app.weights.earlierKept'));
            return;
        } catch (failure) {
            console.warn('[weights] Not saved:', failure);
            error.textContent =
                failure instanceof ConnectionError && failure.kind !== 'failed'
                    ? t('app.study.sessionStopped')
                    : t('app.weights.saveFailed');
        }
        busy = false;
        submit.textContent = t('app.weights.submit');
        refresh();
    });

    const unrated = app.order.some((study) => !isRated(app.state, study.id));
    const backPage = app.state.finishedFromPage;
    const keepRating =
        unrated && Number.isInteger(backPage)
            ? el(
                  'button',
                  {
                      type: 'button',
                      class: 'btn-link',
                      onClick: () => app.navigate(backPage),
                  },
                  t('app.weights.keepRating')
              )
            : null;

    setChildren(
        view,
        el('h1', null, t('app.weights.heading')),
        el(
            'div',
            { class: 'flow view-body' },
            el('p', { class: 'lead' }, t('app.weights.intro', { budget: TOKEN_BUDGET })),
            el('p', null, t('app.weights.howTo'))
        ),
        el(
            'div',
            { class: 'weights-total' },
            used,
            el('div', { class: 'weights-total__bar', 'aria-hidden': 'true' }, fill)
        ),
        el(
            'div',
            { class: 'weights-list' },
            rows.map(({ row }) => row)
        ),
        el('div', { class: 'view-actions weights__actions' }, submit, hint, status, error),
        keepRating ? el('p', { class: 'weights__back' }, keepRating) : null
    );
    refresh();
    return view;
}
