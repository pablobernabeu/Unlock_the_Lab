/**
 * The criterion weights page: the participant shares TOKEN_BUDGET tokens
 * between the six criteria. Each criterion has a − / + stepper that carries
 * the state for keyboard and screen-reader users, and a row of token boxes for
 * pointer users (hidden from assistive technology, since it repeats the
 * stepper). The allocation is saved in the participant state on every change
 * (which is also where it is read from, so a change made in another tab of
 * the same session counts) and written once, create-only, to
 * /rankings/{sessionId}.
 */
import { TOKEN_BUDGET } from '../../lib/config.js';
import { CRITERIA, descriptionKey, labelKey } from '../../lib/criteria.js';
import { announce, el } from '../../lib/dom.js';
import { t } from '../../lib/i18n.js';
import { showToast } from '../../lib/toast.js';
import { ConnectionError } from '../connection.js';
import { submitRanking } from '../ranking-submit.js';
import { keepRatingPage, resultsPage } from '../state.js';
import { allocationComplete, maxTokensFor, setTokens, tokensUsed } from '../tokens.js';
import { isUnavailable, setChildren, setUnavailable } from '../ui.js';

/**
 * Writes the allocation once the session is connected and has a nickname.
 * @param {object} app
 * @param {Record<string, number>} tokens
 * @returns {Promise<{status: 'saved'|'kept'|'earlier', tokens: Record<string, number>}>}
 *   see submitRanking
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
    const allocation = () => app.state.criterionTokens;
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
    const actions = el(
        'div',
        { class: 'view-actions weights__actions' },
        submit,
        hint,
        status,
        error
    );

    const rows = CRITERIA.map(({ key, icon }) => criterionRow(key, icon, onSet));

    function refresh() {
        const total = tokensUsed(allocation());
        used.textContent = t('app.weights.used', { used: total, budget: TOKEN_BUDGET });
        fill.style.width = `${(total / TOKEN_BUDGET) * 100}%`;
        rows.forEach(({ update }) => update(allocation()));
        const complete = allocationComplete(allocation());
        setUnavailable(submit, busy || !complete);
        // Read by the browser's Back button, which waits while the weights are saving.
        actions.setAttribute('aria-busy', String(busy));
        hint.hidden = complete;
        hint.textContent = t('app.weights.submitHint', {
            budget: TOKEN_BUDGET,
            remaining: TOKEN_BUDGET - total,
            count: TOKEN_BUDGET - total,
        });
    }

    function onSet(key, value, { step = false } = {}) {
        if (busy) return;
        const current = allocation();
        const next = setTokens(current, key, step ? current[key] + value : value);
        if (next === current) return;
        app.patch({ criterionTokens: next });
        error.textContent = '';
        refresh();
        announce(
            t('app.weights.announce', {
                criterion: t(labelKey(key)),
                count: allocation()[key],
                used: tokensUsed(allocation()),
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
            const chosen = allocation();
            const saved = await saveRanking(app, chosen);
            // An earlier attempt that timed out may have landed after all; its allocation stays.
            const keptEarlier = CRITERIA.some(({ key }) => saved.tokens[key] !== chosen[key]);
            const earlier = saved.status === 'earlier';
            app.patch({
                rankingSubmitted: true,
                rankingKeptLocally: earlier,
                criterionTokens: saved.tokens,
            });
            app.navigate(resultsPage(app.studyCount));
            if (earlier) {
                // Not a toast: the participant should be able to read this at their own pace.
                app.notices.show('weightsNotSaved', {
                    tone: 'warning',
                    text: t('app.weights.earlierExists'),
                    dismissible: true,
                });
            } else if (keptEarlier) {
                showToast(t('app.weights.earlierKept'));
            }
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

    const backPage = keepRatingPage(app.state, app.order);
    const keepRating =
        backPage !== null
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
        actions,
        keepRating ? el('p', { class: 'weights__back' }, keepRating) : null
    );
    refresh();
    return view;
}
