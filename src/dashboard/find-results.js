/**
 * 'Find your results': offers the session saved on this device, and looks a
 * username up exactly (ignoring case and spaces). Usernames are not unique,
 * so several matches give a chooser rather than a guess, and partial names
 * never match someone else.
 */
import { announce, el, qs, setText } from '../lib/dom.js';
import { formatDate, t } from '../lib/i18n.js';
import { findEntriesByUsername } from '../lib/leaderboard.js';
import { parseLookup, resultsHref } from './data.js';

function choiceText(entry) {
    return t('dashboard.find.choice', {
        name: entry.userName,
        studies: t('common.counts.studies', { count: entry.papersRated }),
        date: formatDate(entry.timestamp),
    });
}

/**
 * @param {HTMLElement} root the section
 * @param {object} options
 * @param {string|null} options.localSessionId
 * @param {() => import('../lib/leaderboard.js').LeaderboardEntry[] | null} options.getEntries
 *   null while the leaderboard is still loading
 * @param {(href: string) => void} [options.navigate]
 * @returns {{update: (data: {entries: import('../lib/leaderboard.js').LeaderboardEntry[],
 *   localHasRatings: boolean}) => void}}
 */
export function createFindResults(
    root,
    { localSessionId, getEntries, navigate = (href) => location.assign(href) }
) {
    const form = qs('[data-find-form]', root);
    const input = qs('#find-input', root);
    const error = qs('[data-find-error]', root);
    const choices = qs('[data-find-choices]', root);
    const detected = qs('[data-find-detected]', root);
    const detectedText = qs('[data-find-detected-text]', root);

    // The link is offered once the data show the session has results to look at.
    if (localSessionId) qs('[data-find-detected-link]', root).href = resultsHref(localSessionId);

    function showError(message) {
        choices.hidden = true;
        error.hidden = false;
        setText(error, message);
        input.setAttribute('aria-invalid', 'true');
        input.focus();
    }

    function clearMessages() {
        error.hidden = true;
        choices.hidden = true;
        input.removeAttribute('aria-invalid');
    }

    function open(href, name) {
        announce(t('dashboard.find.opening', { name }));
        navigate(href);
    }

    function showChoices(matches) {
        setText(
            qs('[data-find-choices-text]', root),
            t('dashboard.find.several', { count: matches.length })
        );
        qs('[data-find-choices-list]', root).replaceChildren(
            ...matches.map((entry) => {
                const href = resultsHref(entry.sessionId);
                return el(
                    'li',
                    null,
                    href ? el('a', { href }, choiceText(entry)) : choiceText(entry)
                );
            })
        );
        choices.hidden = false;
    }

    function lookUp(name) {
        const entries = getEntries();
        if (!entries) return showError(t('dashboard.find.loading'));
        const matches = findEntriesByUsername(entries, name).filter((entry) =>
            resultsHref(entry.sessionId)
        );
        if (matches.length === 0) return showError(t('dashboard.find.notFound', { name }));
        if (matches.length === 1)
            return open(resultsHref(matches[0].sessionId), matches[0].userName);
        showChoices(matches);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearMessages();
        const lookup = parseLookup(input.value);
        if (lookup.kind === 'empty') return showError(t('dashboard.find.empty'));
        if (lookup.kind === 'badLink') return showError(t('dashboard.find.badLink'));
        if (lookup.kind === 'session') return open(resultsHref(lookup.sessionId), lookup.sessionId);
        lookUp(lookup.name);
    });

    return {
        /**
         * Shows or hides the link to this device's results.
         * @param {object} data
         * @param {import('../lib/leaderboard.js').LeaderboardEntry[]} data.entries
         * @param {boolean} data.localHasRatings this device's session has saved ratings
         */
        update({ entries, localHasRatings }) {
            if (!localSessionId) return;
            const own = entries.find((entry) => entry.sessionId === localSessionId);
            detected.hidden = !own && !localHasRatings;
            setText(
                detectedText,
                own?.nameValid
                    ? t('dashboard.find.detected', { name: own.userName })
                    : t('dashboard.find.detectedNoName')
            );
        },
    };
}
