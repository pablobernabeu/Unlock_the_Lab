/**
 * The score banner in the page header: average score per study, studies
 * rated and the participant's nickname. Shown on study and weights pages once
 * at least one study is rated.
 */
import { setText } from '../lib/dom.js';
import { formatPercent } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { meanAccuracy } from '../lib/scoring.js';
import { ratedCount } from './state.js';

/**
 * @param {object} state participant state
 * @param {object} options
 * @param {number} options.studyCount
 * @param {boolean} options.visible whether the current view shows the banner
 * @returns {void}
 */
export function updateScoreBanner(state, { studyCount, visible }) {
    const banner = document.getElementById('score-banner');
    if (!banner) return;
    const rated = ratedCount(state);
    banner.hidden = !visible || rated === 0;
    if (banner.hidden) return;

    setText('#banner-score', formatPercent(meanAccuracy(state.totalScore, rated)));
    setText('#banner-rated', t('app.header.ratedValue', { count: rated, total: studyCount }));
    const nickname = document.getElementById('banner-nickname-item');
    if (nickname) nickname.hidden = !state.userName;
    setText('#banner-nickname', state.userName ?? '');
}
