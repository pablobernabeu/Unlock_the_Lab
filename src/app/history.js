/**
 * The browser's Back and Forward buttons inside the workshop. Each view
 * change adds a history entry, and moving between those entries follows the
 * rules of the app's own buttons:
 *   - the welcome page and the guide move freely;
 *   - on a study page, Back goes to the previous study only while the
 *     one-time step back is unused, and uses it up;
 *   - Forward never passes a study that has not been answered;
 *   - on the weights page, Back goes back to rating, as 'Go back to rating
 *     studies' does, when that is on offer;
 *   - the results page and a closed or paused session stay where they are.
 * After a refused move the browser goes back to the entry it came from.
 */
import { MIN_STUDIES_TO_FINISH } from '../lib/config.js';
import {
    FIRST_STUDY_PAGE,
    describePage,
    isRated,
    keepRatingPage,
    ratedCount,
    weightsPage,
} from './state.js';

/** Marks the history entries this app made. */
const MARK = 'unlock-the-lab';

/**
 * Forward from `from` to `to`: no unanswered study may be passed on the way,
 * unless the participant has already chosen to finish early and is heading
 * past the studies to the weights.
 */
function forwardMove(from, to, state, order) {
    const studyCount = order.length;
    const toKind = describePage(to, studyCount).kind;
    const finishedEarly =
        Number.isInteger(state.finishedFromPage) && ratedCount(state) >= MIN_STUDIES_TO_FINISH;
    if (toKind === 'study' || !finishedEarly) {
        const end = Math.min(to, weightsPage(studyCount));
        for (let page = Math.max(from, FIRST_STUDY_PAGE); page < end; page += 1) {
            if (!isRated(state, order[page - FIRST_STUDY_PAGE].id)) {
                return { refused: 'app.history.unanswered' };
            }
        }
    }
    if (toKind === 'results' && !state.rankingSubmitted) {
        return { refused: 'app.history.saveWeights' };
    }
    return { page: to, usesBack: false };
}

/**
 * Where the browser's Back or Forward may take the participant.
 * @param {object} options
 * @param {number} options.from the page on screen
 * @param {number} options.to the page of the history entry the browser moved to
 * @param {object} options.state the participant state
 * @param {object[]} options.order the studies in the participant's order
 * @param {'open'|'closed'|'paused'} [options.session]
 * @param {boolean} [options.busy] answers or weights are being saved
 * @returns {{page: number, usesBack: boolean}|{refused: string}} the page to show and whether
 *   the move uses up the one-time step back, or the key of the message saying why it is refused
 */
export function historyMove({ from, to, state, order, session = 'open', busy = false }) {
    const fromKind = describePage(from, order.length).kind;
    if (to === from) return { page: from, usesBack: false };
    if (fromKind === 'results') return { refused: 'app.history.finished' };
    if (session === 'closed') return { refused: 'app.history.closed' };
    if (session === 'paused') return { refused: 'app.history.paused' };
    if (busy) return { refused: 'app.history.saving' };
    if (to > from) return forwardMove(from, to, state, order);

    if (fromKind === 'study') {
        if (state.hasUsedBackButton) return { refused: 'app.history.backUsed' };
        if (from === FIRST_STUDY_PAGE) return { refused: 'app.history.firstStudy' };
        if (to !== from - 1) return { refused: 'app.history.oneStep' };
        return { page: to, usesBack: true };
    }
    if (fromKind === 'weights') {
        const page = keepRatingPage(state, order);
        return page === null ? { refused: 'app.history.allRated' } : { page, usesBack: false };
    }
    // From the guide back to the welcome page.
    return { page: to, usesBack: false };
}

const isEntry = (value) =>
    value?.app === MARK && Number.isInteger(value.index) && Number.isInteger(value.page);

/**
 * Keeps one history entry per view and passes the browser's moves to `onMove`.
 * Entries carry their position, so a refused move, even one several entries
 * long, can be undone with a single history.go().
 * @param {object} options
 * @param {string} options.sessionId
 * @param {(page: number) => boolean} options.onMove called when Back or Forward lands on an
 *   entry for another page; it shows that page (calling `replace` when it shows a different
 *   one) and returns true, or returns false to stay, and the browser then returns to the
 *   entry it came from
 * @returns {{start: (page: number) => void, push: (page: number) => void,
 *   replace: (page: number) => void}}
 */
export function createHistory({ sessionId, onMove }) {
    let index = 0;
    let page = null;

    function write(method, nextPage) {
        page = nextPage;
        history[method]({ app: MARK, session: sessionId, page, index }, '');
    }

    function onPopState(event) {
        const target = event.state;
        if (!isEntry(target)) {
            // An entry the app did not make (an address typed with #fragment): the same view.
            index += 1;
            write('replaceState', page);
            return;
        }
        // Back on the entry that a refused move came from.
        if (target.index === index) return;
        const from = { index, page };
        index = target.index;
        // An entry of an earlier session in this tab, or of the same page: nothing to show.
        if (target.session !== sessionId) {
            write('replaceState', page);
            return;
        }
        if (target.page === page) return;
        page = target.page;
        if (onMove(target.page)) return;
        ({ index, page } = from);
        history.go(from.index - target.index);
    }

    return {
        /** Takes over the current entry (a reload or a resumed session adds none). */
        start(first) {
            index = isEntry(history.state) ? history.state.index : 0;
            // The views scroll to the top themselves when they change.
            history.scrollRestoration = 'manual';
            write('replaceState', first);
            window.addEventListener('popstate', onPopState);
        },
        /** A new entry for a page the participant moved to with the app's own buttons. */
        push(next) {
            if (next === page) return;
            index += 1;
            write('pushState', next);
        },
        /** The current entry now shows `next`. */
        replace(next) {
            write('replaceState', next);
        },
    };
}
