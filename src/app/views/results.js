/**
 * The results page, for the participant's own results and, read-only and in
 * the third person, for a shared `?session=` link. The score and the
 * study-by-study review come from data already in hand; the leaderboard and
 * the comparison with other participants load afterwards and fill their
 * sections when they arrive.
 */
import {
    CONTENT_VERSION,
    MIN_STUDIES_TO_RANK,
    RESULTS_TOP_N,
    TOKEN_BUDGET,
} from '../../lib/config.js';
import { qualityBand } from '../../lib/content.js';
import { CRITERIA, labelKey } from '../../lib/criteria.js';
import { el, qs } from '../../lib/dom.js';
import { formatPercent, formatRating } from '../../lib/format.js';
import { t } from '../../lib/i18n.js';
import { meanAccuracy } from '../../lib/scoring.js';
import { chartPoints, leaderboardView, ratingProfile, tokenShares } from '../results-model.js';
import { targetDigits } from '../target-precision.js';
import { bandBadge, qualityLabel, setChildren } from '../ui.js';
import { formatTarget, renderExpertFeedback } from './feedback.js';
import { drawRatingChart } from './results-chart.js';

/**
 * @typedef {object} ResultsModel
 * @property {'own'|'readOnly'} mode
 * @property {string} sessionId
 * @property {string} name nickname to show (a fallback when unknown)
 * @property {{score: number, papersRated: number}|null} totals
 * @property {object[]} rows review rows (results-model.js)
 * @property {string|null} room the room whose leaderboard can be shown
 * @property {Promise<object[]>} entries leaderboard entries (own entry merged in)
 * @property {Promise<Record<string, {n: number, mean: number|null}>>} others
 * @property {Record<string, number>|null} tokens criterion weights
 * @property {boolean} [tokensKeptLocally] the weights are only in this browser, because an
 *   earlier allocation for the session was already stored
 */

let activeChart = null;

function section(id, heading, ...content) {
    return el(
        'section',
        { class: 'results-section', 'aria-labelledby': id },
        el('h2', { id }, heading),
        ...content
    );
}

function loadingText() {
    return el('p', { class: 'text-muted', role: 'status' }, t('app.results.loading'));
}

/* ---------- Score ---------- */

function scoreSection(model) {
    const own = model.mode === 'own';
    const { totals } = model;
    const accuracy = totals ? meanAccuracy(totals.score, totals.papersRated) : null;
    if (accuracy === null) {
        return section(
            'results-score-heading',
            t('app.results.scoreHeading'),
            el('p', null, t('app.results.scoreUnknown'))
        );
    }
    const count = totals.papersRated;
    return el(
        'section',
        { class: 'results-section results-score card', 'aria-labelledby': 'results-score-heading' },
        el('h2', { id: 'results-score-heading' }, t('app.results.scoreHeading')),
        el('p', { class: 'results-score__value' }, formatPercent(accuracy)),
        el(
            'p',
            { class: 'results-score__caption' },
            own
                ? t('app.results.scoreCaption', { count })
                : t('app.results.scoreCaptionOther', { count, name: model.name })
        ),
        el('p', { class: 'text-muted' }, t('app.results.scoreExplain'))
    );
}

/* ---------- Leaderboard ---------- */

function rankText(model, view) {
    const own = model.mode === 'own';
    const { position, rankedCount } = view;
    if (!position) return t('app.results.notOnBoard');
    if (position.rank === null) {
        return own
            ? t('app.results.notRanked', { count: MIN_STUDIES_TO_RANK })
            : t('app.results.notRankedOther', { count: MIN_STUDIES_TO_RANK, name: model.name });
    }
    return own
        ? t('app.results.rank', { rank: position.rank, count: rankedCount })
        : t('app.results.rankOther', { rank: position.rank, count: rankedCount, name: model.name });
}

function leaderboardTable(model, view, scopeLabel) {
    if (view.top.length === 0) {
        return el('p', null, t('app.results.leaderboardEmpty', { count: MIN_STUDIES_TO_RANK }));
    }
    const own = model.mode === 'own';
    return el(
        'div',
        {
            class: 'table-wrap',
            role: 'region',
            tabindex: '0',
            'aria-labelledby': 'results-board-caption',
        },
        el(
            'table',
            { class: 'table results-table leaderboard-table' },
            el('caption', { id: 'results-board-caption' }, scopeLabel),
            el(
                'thead',
                null,
                el(
                    'tr',
                    null,
                    el('th', { scope: 'col', class: 'num' }, t('app.results.colRank')),
                    el('th', { scope: 'col' }, t('app.results.colName')),
                    el('th', { scope: 'col', class: 'num' }, t('app.results.colScore')),
                    el('th', { scope: 'col', class: 'num' }, t('app.results.colStudies'))
                )
            ),
            el(
                'tbody',
                null,
                view.top.map((entry) => {
                    const isThis = entry.sessionId === model.sessionId;
                    return el(
                        'tr',
                        {
                            class: isThis ? 'leaderboard-table__this' : null,
                            'aria-current': isThis ? 'true' : null,
                        },
                        el('td', { class: 'num' }, entry.rank),
                        el(
                            'th',
                            { scope: 'row' },
                            entry.nameValid ? entry.userName : t('common.participant.unnamed'),
                            isThis && own
                                ? [
                                      ' ',
                                      el(
                                          'span',
                                          { class: 'badge badge--brand' },
                                          t('app.results.you')
                                      ),
                                  ]
                                : null
                        ),
                        el('td', { class: 'num' }, formatPercent(entry.meanAccuracy)),
                        el('td', { class: 'num' }, entry.papersRated)
                    );
                })
            )
        )
    );
}

function scopeToggle(model, initial, onChange) {
    const name = 'results-scope';
    const option = (value, label) =>
        el(
            'label',
            { class: 'scope-toggle__option' },
            el('input', {
                type: 'radio',
                name,
                value,
                checked: value === initial,
                onChange: () => onChange(value),
            }),
            ' ',
            label
        );
    return el(
        'fieldset',
        { class: 'scope-toggle' },
        el('legend', null, t('app.results.scopeLabel')),
        option('room', t('app.results.scopeRoom', { room: model.room })),
        option('all', t('app.results.scopeAll'))
    );
}

function leaderboardSection(model) {
    const body = el('div', { class: 'results-board' }, loadingText());
    const heading = t('app.results.leaderboardHeading', { count: RESULTS_TOP_N });
    const result = section('results-board-heading', heading, body);

    model.entries
        .then((entries) => {
            let scope = model.room ? 'room' : 'all';
            // Announced when the scope toggle changes it (the table below changes silently).
            const rank = el('p', { class: 'results-rank', 'aria-live': 'polite' });
            const table = el('div');
            const draw = () => {
                const room = scope === 'room' ? model.room : null;
                const view = leaderboardView(entries, { sessionId: model.sessionId, room });
                const scopeLabel =
                    scope === 'room'
                        ? t('app.results.scopeRoom', { room: model.room })
                        : t('app.results.scopeAll');
                rank.textContent = rankText(model, view);
                table.replaceChildren(leaderboardTable(model, view, scopeLabel));
            };
            const toggle = model.room
                ? scopeToggle(model, scope, (value) => {
                      scope = value;
                      draw();
                  })
                : null;
            draw();
            body.replaceChildren(...[toggle, rank, table].filter(Boolean));
        })
        .catch((error) => {
            console.warn('[results] Leaderboard not loaded:', error);
            body.replaceChildren(el('p', { role: 'alert' }, t('app.results.leaderboardFailed')));
        });
    return result;
}

/* ---------- Rating profile ---------- */

function profileSummary(profile) {
    const lines = [];
    if (profile.meanAbsFromOthers !== null) {
        lines.push(
            t('app.results.profileFromOthers', {
                distance: formatRating(profile.meanAbsFromOthers),
            })
        );
    }
    if (profile.meanAbsFromExpert !== null) {
        lines.push(
            t('app.results.profileFromExpert', {
                distance: formatRating(profile.meanAbsFromExpert),
            })
        );
    }
    const diff = formatRating(Math.abs(profile.meanSignedFromExpert ?? 0));
    if (profile.direction === 'higher') lines.push(t('app.results.profileHigher', { diff }));
    if (profile.direction === 'lower') lines.push(t('app.results.profileLower', { diff }));
    if (profile.direction === 'similar') lines.push(t('app.results.profileSimilar'));
    return lines.map((line) => el('p', null, line));
}

function profileTable(points) {
    return el(
        'div',
        {
            class: 'table-wrap',
            role: 'region',
            tabindex: '0',
            'aria-labelledby': 'results-profile-caption',
        },
        el(
            'table',
            { class: 'table results-table' },
            el('caption', { id: 'results-profile-caption' }, t('app.results.tableCaption')),
            el(
                'thead',
                null,
                el(
                    'tr',
                    null,
                    el('th', { scope: 'col' }, t('app.results.tableStudy')),
                    el('th', { scope: 'col', class: 'num' }, t('app.results.tableOwn')),
                    el('th', { scope: 'col', class: 'num' }, t('app.results.tableOthers')),
                    el('th', { scope: 'col', class: 'num' }, t('app.results.tableN'))
                )
            ),
            el(
                'tbody',
                null,
                points.map((point) =>
                    el(
                        'tr',
                        null,
                        el('th', { scope: 'row' }, point.title),
                        el('td', { class: 'num' }, point.y),
                        el('td', { class: 'num' }, formatRating(point.x)),
                        el('td', { class: 'num' }, point.n)
                    )
                )
            )
        )
    );
}

function chartBlock(points) {
    const canvas = el('canvas', {
        role: 'img',
        'aria-label': t('app.results.chartLabel', { count: points.length }),
    });
    const box = el('div', { class: 'chart-box' }, canvas);
    activeChart?.destroy();
    activeChart = null;
    drawRatingChart(canvas, points)
        .then((chart) => {
            activeChart = chart;
        })
        .catch((error) => {
            console.warn('[results] Chart not drawn:', error);
            box.replaceChildren(el('p', { role: 'status' }, t('app.results.chartFailed')));
        });
    return box;
}

function profileSection(model) {
    if (model.rows.length === 0) return null;
    const own = model.mode === 'own';
    const body = el('div', { class: 'flow' }, loadingText());
    const heading = own
        ? t('app.results.profileHeading')
        : t('app.results.profileHeadingOther', { name: model.name });
    const result = section(
        'results-profile-heading',
        heading,
        el('p', null, t('app.results.profileIntro')),
        body
    );

    model.others
        .then((others) => {
            const profile = ratingProfile(model.rows, others);
            const points = chartPoints(model.rows, others);
            if (points.length === 0) {
                setChildren(
                    body,
                    ...profileSummary(profile),
                    el('p', null, t('app.results.profileNoOthers'))
                );
                return;
            }
            const parts = [
                ...profileSummary(profile),
                chartBlock(points),
                profile.missing > 0
                    ? el(
                          'p',
                          { class: 'text-muted' },
                          t('app.results.profileMissing', { count: profile.missing })
                      )
                    : null,
                el(
                    'details',
                    { class: 'results-details' },
                    el('summary', null, t('app.results.chartTable')),
                    profileTable(points)
                ),
            ];
            body.replaceChildren(...parts.filter(Boolean));
        })
        .catch((error) => {
            console.warn('[results] Comparison not loaded:', error);
            body.replaceChildren(el('p', { role: 'alert' }, t('app.results.dataFailed')));
        });
    return result;
}

/* ---------- Study by study ---------- */

function fact(label, value) {
    return el('div', { class: 'review-item__fact' }, el('dt', null, label), el('dd', null, value));
}

/** True for an answer given to an earlier content version than the current one. */
function isEarlierVersion(row) {
    return Number.isInteger(row.contentVersion) && row.contentVersion < CONTENT_VERSION;
}

function reviewItem(row) {
    const { study, expertRating } = row;
    const band = qualityBand(expertRating);
    const notRecorded = t('app.results.notRecorded');
    const titleId = `review-title-${study.id}`;
    const labelId = `review-feedback-${study.id}`;
    return el(
        'li',
        { class: 'review-item' },
        el('h3', { class: 'review-item__title', id: titleId }, study.title),
        el(
            'dl',
            { class: 'review-item__facts' },
            fact(t('app.results.reviewRating'), String(row.rating)),
            fact(t('app.results.reviewPrediction'), row.prediction ?? notRecorded),
            fact(
                t('app.results.reviewTarget'),
                Number.isFinite(row.target)
                    ? formatTarget(row.target, targetDigits(row.target, row.prediction, row.score))
                    : notRecorded
            ),
            fact(
                t('app.results.reviewScore'),
                Number.isInteger(row.score) ? row.score : notRecorded
            ),
            fact(t('app.results.reviewExpert'), [
                String(expertRating),
                ' ',
                band ? bandBadge(band, qualityLabel(band)) : null,
            ])
        ),
        isEarlierVersion(row)
            ? el(
                  'p',
                  { class: 'review-item__note' },
                  t('app.results.reviewEarlierVersion', { version: row.contentVersion })
              )
            : null,
        el(
            'details',
            { class: 'results-details' },
            // Named after the study too: up to 48 of these follow one another in tab order.
            el(
                'summary',
                { 'aria-labelledby': `${labelId} ${titleId}` },
                el('span', { id: labelId }, t('app.results.reviewFeedback'))
            ),
            // The current text's feedback, with its own expert rating.
            renderExpertFeedback(study, { withHeading: false })
        )
    );
}

function reviewSection(model) {
    if (model.rows.length === 0) return null;
    return section(
        'results-review-heading',
        t('app.results.reviewHeading'),
        el('p', null, t('app.results.reviewIntro')),
        model.rows.some(isEarlierVersion)
            ? el('p', null, t('app.results.reviewEarlierVersions'))
            : null,
        el('ol', { class: 'review-list' }, model.rows.map(reviewItem))
    );
}

/* ---------- Criterion weights ---------- */

function weightsSection(model) {
    const shares = tokenShares(model.tokens);
    if (!shares) {
        return section(
            'results-weights-heading',
            t('app.results.weightsHeading'),
            el('p', null, t('app.results.weightsNone'))
        );
    }
    const icons = Object.fromEntries(CRITERIA.map(({ key, icon }) => [key, icon]));
    return section(
        'results-weights-heading',
        t('app.results.weightsHeading'),
        model.tokensKeptLocally ? el('p', null, t('app.results.weightsLocal')) : null,
        el(
            'ul',
            { class: 'weight-bars' },
            shares.map(({ key, count, percent }) => {
                const fill = el('span', { class: 'weight-bars__fill' });
                fill.style.width = `${percent}%`;
                return el(
                    'li',
                    { class: 'weight-bars__item' },
                    el(
                        'span',
                        { class: 'weight-bars__label' },
                        el('span', { 'aria-hidden': 'true' }, icons[key]),
                        ' ',
                        t(labelKey(key))
                    ),
                    el(
                        'span',
                        { class: 'weight-bars__value' },
                        t('app.results.weightsValue', {
                            count,
                            budget: TOKEN_BUDGET,
                            percent: formatPercent(percent),
                        })
                    ),
                    el('span', { class: 'weight-bars__track', 'aria-hidden': 'true' }, fill)
                );
            })
        )
    );
}

/**
 * Renders the results into the results view.
 * @param {ResultsModel} model
 * @returns {HTMLElement} the view
 */
export function renderResultsView(model) {
    const view = document.getElementById('view-results');
    const own = model.mode === 'own';
    qs('#results-heading', view).textContent = own
        ? t('app.results.heading')
        : t('app.results.headingOther', { name: model.name });
    qs('#results-readonly-note', view).hidden = own;
    // Addressed to the participant: wrong on someone else's shared results.
    qs('#results-thanks', view).hidden = !own;
    qs('#results-takeaway-compare', view).hidden = !own;
    const nickname = qs('#results-nickname', view);
    nickname.hidden = !own;
    nickname.textContent = own ? t('app.results.nickname', { name: model.name }) : '';

    qs('#results-dynamic', view).replaceChildren(
        ...[
            scoreSection(model),
            leaderboardSection(model),
            profileSection(model),
            reviewSection(model),
            weightsSection(model),
        ].filter(Boolean)
    );
    return view;
}
