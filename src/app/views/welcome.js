/**
 * The welcome page. Its fixed text is prerendered in index.html; this fills
 * the sentences that quote numbers (computed in scoring-facts.js, so they
 * always match the scoring code) and wires the start button.
 */
import { setText } from '../../lib/dom.js';
import { formatPercent } from '../../lib/format.js';
import { t } from '../../lib/i18n.js';
import { scoringFacts } from '../scoring-facts.js';
import { bindOnce } from '../ui.js';

/**
 * @param {object} app the app context (see participant.js)
 * @returns {HTMLElement} the view
 */
export function renderWelcomeView(app) {
    const view = document.getElementById('view-welcome');
    const facts = scoringFacts({ studyCount: app.studyCount });

    setText('#welcome-scoring-target', t('app.welcome.scoringTarget', { weight: facts.weight }));
    setText(
        '#welcome-scoring-early',
        t('app.welcome.scoringEarly', {
            count: facts.exampleCount,
            share: formatPercent(facts.expertShare),
        })
    );
    setText(
        '#welcome-scoring-points',
        t('app.welcome.scoringPoints', {
            penalty: facts.penalty,
            one: facts.oneAway,
            two: facts.twoAway,
        })
    );
    setText(
        '#welcome-leaderboard',
        t('app.welcome.leaderboardText', {
            minRank: facts.minRank,
            total: facts.total,
            minFinish: facts.minFinish,
        })
    );
    setText(
        '#welcome-length',
        t('app.welcome.length', { total: facts.total, minFinish: facts.minFinish })
    );

    const roomNote = document.getElementById('welcome-room');
    roomNote.hidden = !app.state.room;
    if (app.state.room) {
        roomNote.textContent = t('app.welcome.leaderboardRoom', { room: app.state.room });
    }

    bindOnce(document.getElementById('welcome-start'), 'click', () => app.begin());
    return view;
}
