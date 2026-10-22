/**
 * The feedback shown after a study's answers are saved: the prediction
 * score, the target and how it was made up, the participant's own rating
 * next to the other participants' mean, then the expert's feedback.
 */
import { SEED_WEIGHT } from '../../lib/config.js';
import { qualityBand } from '../../lib/content.js';
import { CRITERIA, labelKey } from '../../lib/criteria.js';
import { el } from '../../lib/dom.js';
import { formatRating } from '../../lib/format.js';
import { formatNumber, t } from '../../lib/i18n.js';
import { scoreBand } from '../../lib/scoring.js';
import { bandBadge } from '../ui.js';

const SCORE_MESSAGES = {
    perfect: () => t('app.feedback.band.perfect'),
    outstanding: () => t('app.feedback.band.outstanding'),
    excellent: () => t('app.feedback.band.excellent'),
    great: () => t('app.feedback.band.great'),
    good: () => t('app.feedback.band.good'),
    keepLearning: () => t('app.feedback.band.keepLearning'),
};

const CRITERION_BAND_LABELS = {
    low: () => t('app.feedback.bandLow'),
    medium: () => t('app.feedback.bandMedium'),
    high: () => t('app.feedback.bandHigh'),
};

const QUALITY_LABELS = {
    low: () => t('common.quality.low'),
    medium: () => t('common.quality.medium'),
    high: () => t('common.quality.high'),
};

/**
 * The expert's rating, summary and per-criterion bands and notes.
 * @param {object} study with expertRating and feedback
 * @param {object} [options]
 * @param {boolean} [options.withHeading] adds the 'Expert feedback' heading (h3)
 * @returns {HTMLElement}
 */
export function renderExpertFeedback(study, { withHeading = true } = {}) {
    const band = qualityBand(study.expertRating);
    const criteria = study.feedback?.criteria ?? {};
    return el(
        'div',
        { class: 'expert-feedback' },
        withHeading
            ? el('h3', { class: 'expert-feedback__heading' }, t('app.feedback.expertHeading'))
            : null,
        el(
            'p',
            { class: 'expert-feedback__rating' },
            band ? bandBadge(band, QUALITY_LABELS[band]()) : null,
            ' ',
            t('app.feedback.expertRating', { rating: study.expertRating })
        ),
        study.feedback?.summary
            ? el('p', { class: 'expert-feedback__summary' }, study.feedback.summary)
            : null,
        el('h4', { class: 'expert-feedback__criteria-heading' }, t('app.feedback.criteriaHeading')),
        el(
            'dl',
            { class: 'criterion-notes' },
            CRITERIA.filter(({ key }) => criteria[key]).map(({ key, icon }) => {
                const { band: criterionBand, note } = criteria[key];
                const bandLabel = CRITERION_BAND_LABELS[criterionBand]?.() ?? criterionBand;
                return el(
                    'div',
                    { class: 'criterion-notes__item' },
                    el(
                        'dt',
                        { class: 'criterion-notes__term' },
                        el('span', { 'aria-hidden': 'true' }, icon),
                        ' ',
                        el('span', null, t(labelKey(key))),
                        ' ',
                        bandBadge(criterionBand, bandLabel)
                    ),
                    el('dd', { class: 'criterion-notes__note' }, note)
                );
            })
        )
    );
}

/**
 * A target with two decimals: with one decimal a careful reader could get a
 * score 1 point away from the one shown, because the score uses the exact target.
 * @param {number} value
 * @returns {string}
 */
export function formatTarget(value) {
    return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function targetLines({ prediction, target, crowd, expertRating }) {
    if (!Number.isFinite(prediction)) return [t('app.feedback.targetUnknown')];
    if (!Number.isFinite(target)) {
        return [t('app.feedback.predictionOnly', { prediction }), t('app.feedback.targetUnknown')];
    }
    const lines = [
        t('app.feedback.predictionVsTarget', { prediction, target: formatTarget(target) }),
        t('app.feedback.distance', { distance: formatTarget(Math.abs(prediction - target)) }),
    ];
    if (crowd?.n > 0) {
        lines.push(
            t('app.feedback.targetWithOthers', {
                count: crowd.n,
                expert: expertRating,
                weight: SEED_WEIGHT,
            })
        );
    } else if (crowd) {
        lines.push(t('app.feedback.targetExpertOnly', { expert: expertRating }));
    }
    return lines;
}

function ratingLines({ rating, crowd }) {
    const lines = [];
    if (crowd?.n > 0) {
        lines.push(
            t('app.feedback.othersMean', { count: crowd.n, mean: formatRating(crowd.mean) })
        );
    } else if (crowd) {
        lines.push(t('app.feedback.othersNone'));
    }
    lines.push(t('app.feedback.yourRating', { rating }));
    return lines;
}

/**
 * The feedback panel for a saved study.
 * @param {object} options
 * @param {object} options.study
 * @param {{rating: number, prediction: number|null, score: number|null, target: number|null,
 *   crowd: {n: number, mean: number|null}|null}} options.result
 * @param {boolean} [options.showExpert] include the expert's feedback (FEEDBACK_MODE 'each')
 * @param {HTMLElement[]} options.actions buttons shown under the feedback
 * @returns {HTMLElement}
 */
export function renderFeedbackPanel({ study, result, showExpert = true, actions }) {
    const { score } = result;
    const hasScore = Number.isInteger(score);
    return el(
        'section',
        { class: 'feedback card', 'aria-labelledby': 'feedback-heading' },
        el(
            'div',
            { class: 'feedback__score' },
            el(
                'h2',
                { id: 'feedback-heading', class: 'feedback__heading', tabindex: '-1' },
                hasScore ? t('app.feedback.heading', { score }) : t('app.results.scoreUnknown')
            ),
            hasScore
                ? el('p', { class: 'feedback__band' }, SCORE_MESSAGES[scoreBand(score)]())
                : null
        ),
        el(
            'ul',
            { class: 'feedback__facts' },
            [
                ...targetLines({ ...result, expertRating: study.expertRating }),
                ...ratingLines(result),
            ].map((line) => el('li', null, line))
        ),
        showExpert ? renderExpertFeedback(study) : null,
        el('div', { class: 'feedback__actions cluster' }, actions)
    );
}
