/**
 * The overview: sessions, participants with ratings, ratings, completed
 * sessions and presence entries, for the whole database, updated live.
 */
import { ACTIVE_WINDOW_MS, MIN_STUDIES_TO_FINISH } from '../lib/config.js';
import { qs, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { presenceCounts, ratingCounts, recordCount } from './counts.js';
import { createStatus, displayCount, errorReason } from './ui.js';

const ACTIVE_WINDOW_MINUTES = ACTIVE_WINDOW_MS / 60000;

const CONNECTION_TEXT = Object.freeze({
    connecting: () => t('admin.overview.connection.connecting'),
    live: () => t('admin.overview.connection.live'),
    offline: () => t('admin.overview.connection.offline'),
});

/**
 * @param {HTMLElement} root the overview section
 * @param {ReturnType<import('./store.js').createStore>} store
 * @param {() => number} serverNow current server time in ms
 */
export function createOverview(root, store, serverNow) {
    const stat = (name) => qs(`[data-stat="${name}"]`, root);
    const connection = qs('[data-connection]', root);
    const problem = createStatus(qs('[data-overview-error]', root));

    setText(
        qs('[data-stat-note="completed"]', root),
        t('admin.overview.completedNote', { count: MIN_STUDIES_TO_FINISH })
    );

    function renderConnection() {
        const connected = store.get('connected');
        const state = connected === undefined ? 'connecting' : connected ? 'live' : 'offline';
        connection.dataset.state = state;
        setText(qs('[data-connection-text]', connection), CONNECTION_TEXT[state]());
    }

    function renderRatings() {
        const counts = store.has('ratings') ? ratingCounts(store.get('ratings')) : {};
        setText(stat('participants'), displayCount(counts.participants));
        setText(stat('ratings'), displayCount(counts.ratings));
        setText(stat('completed'), displayCount(counts.completed));
    }

    function renderPresence() {
        const loaded = store.has('active');
        const { total, recent } = loaded
            ? presenceCounts(store.get('active'), { now: serverNow() })
            : {};
        setText(stat('active'), displayCount(recent));
        setText(
            qs('[data-stat-note="active"]', root),
            [
                t('admin.overview.activeNote', { count: ACTIVE_WINDOW_MINUTES }),
                loaded ? t('admin.overview.presenceTotal', { count: total }) : '',
            ]
                .join(' ')
                .trim()
        );
    }

    return {
        render() {
            renderConnection();
            const sessions = store.has('sessions')
                ? recordCount('sessions', store.get('sessions'))
                : null;
            setText(stat('sessions'), displayCount(sessions));
            renderRatings();
            renderPresence();
        },
        /** Re-renders the figures that depend on the clock. */
        tick() {
            renderPresence();
        },
        /** @param {unknown} error a listener that failed */
        showError(error) {
            problem.show(t('admin.overview.loadFailed', { reason: errorReason(error) }), 'error');
        },
        reset() {
            problem.clear();
        },
    };
}
