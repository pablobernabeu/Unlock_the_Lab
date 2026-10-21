/**
 * The 'At a glance' figures: participants, ratings, completed and active now.
 */
import { ACTIVE_WINDOW_MS, MIN_STUDIES_TO_FINISH } from '../lib/config.js';
import { qs, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { formatCount } from './numbers.js';

/**
 * @param {HTMLElement} root the element holding the `[data-stat]` values
 * @returns {{setCounts: (counts: {participants: number, ratings: number, completed: number}) => void,
 *   setActive: (count: number) => void}}
 */
export function createOverview(root) {
    const value = (name) => qs(`[data-stat="${name}"]`, root);
    setText(
        qs('[data-stat-label="completed"]', root),
        t('dashboard.overview.completed', { count: MIN_STUDIES_TO_FINISH })
    );
    setText(
        qs('[data-stat-note="completed"]', root),
        t('dashboard.overview.completedNote', { count: MIN_STUDIES_TO_FINISH })
    );
    setText(
        qs('[data-stat-note="active"]', root),
        t('dashboard.overview.activeNote', { minutes: ACTIVE_WINDOW_MS / 60000 })
    );

    return {
        setCounts({ participants, ratings, completed }) {
            setText(value('participants'), formatCount(participants));
            setText(value('ratings'), formatCount(ratings));
            setText(value('completed'), formatCount(completed));
        },
        setActive(count) {
            setText(value('active'), formatCount(count));
        },
    };
}
