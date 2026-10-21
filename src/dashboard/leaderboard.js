/**
 * The leaderboard section: 'All time' and 'Past 24 hours' tabs over one
 * table. Rows are keyed by session and updated in place, so a live update
 * keeps the reader's place and keyboard focus.
 */
import {
    LEADERBOARD_SIZE,
    MIN_STUDIES_TO_RANK,
    SCORE_PENALTY,
    SEED_WEIGHT,
} from '../lib/config.js';
import { el, qs, qsa, setText } from '../lib/dom.js';
import { formatPercent } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { leaderboardView, resultsHref } from './data.js';
import { preserveFocus, syncChildren } from './focus.js';
import { formatCount } from './numbers.js';

/** Rows shown before 'Show all'. */
export const COLLAPSED_ROWS = 25;

function createRow(sessionId) {
    return el(
        'tr',
        { dataset: { key: sessionId } },
        el('td', { class: 'num leaderboard-table__place' }),
        el('th', { scope: 'row' }),
        el('td', { class: 'num' }),
        el('td', { class: 'num' })
    );
}

function fillName(cell, entry, isLocal) {
    const label = entry.nameValid ? entry.userName : t('common.participant.unnamed');
    // Rebuild the cell only when it changes, so a focused link is not replaced for nothing.
    const signature = JSON.stringify([label, isLocal]);
    if (cell.dataset.signature === signature) return;
    cell.dataset.signature = signature;
    const href = resultsHref(entry.sessionId);
    const name = href
        ? el('a', { href, dataset: { focusKey: `leaderboard:${entry.sessionId}` } }, label)
        : el('span', null, label);
    const badge = isLocal
        ? el('span', { class: 'badge badge--brand' }, t('dashboard.leaderboard.thisDevice'))
        : null;
    cell.replaceChildren(name, ...(badge ? [' ', badge] : []));
}

function fillRow(row, entry, localSessionId) {
    const [place, name, accuracy, studies] = row.cells;
    row.classList.toggle('leaderboard-table__top', entry.rank <= 3);
    setText(place, formatCount(entry.rank));
    fillName(name, entry, entry.sessionId === localSessionId);
    setText(accuracy, formatPercent(entry.displayedAccuracy));
    setText(studies, formatCount(entry.papersRated));
}

/**
 * @param {HTMLElement} root the leaderboard section
 * @param {object} [options]
 * @param {string|null} [options.localSessionId] marked 'This device'
 * @returns {{update: (data: {entries: object[], now: number, room: string|null}) => void}}
 */
export function createLeaderboard(root, { localSessionId = null } = {}) {
    const tabs = qsa('[role="tab"]', root);
    const panel = qs('[data-leaderboard-panel]', root);
    const tbody = qs('[data-leaderboard-rows]', root);
    const parts = {
        wrap: qs('[data-leaderboard-wrap]', root),
        empty: qs('[data-leaderboard-empty]', root),
        caption: qs('[data-leaderboard-caption]', root),
        dayNote: qs('[data-day-note]', root),
        truncated: qs('[data-leaderboard-truncated]', root),
        unranked: qs('[data-leaderboard-unranked]', root),
        more: qs('[data-leaderboard-more]', root),
    };
    let period = 'all';
    let expanded = false;
    let data = null;

    setText(
        qs('[data-copy="leaderboard.introScore"]', root),
        t('dashboard.leaderboard.introScore', { penalty: SCORE_PENALTY })
    );
    setText(
        qs('[data-copy="leaderboard.introTarget"]', root),
        t('dashboard.leaderboard.introTarget', { weight: SEED_WEIGHT })
    );
    setText(
        qs('[data-copy="leaderboard.introRules"]', root),
        t('dashboard.leaderboard.introRules', { count: MIN_STUDIES_TO_RANK })
    );

    function renderRows(rows) {
        const existing = new Map([...tbody.rows].map((row) => [row.dataset.key, row]));
        const ordered = rows.map((entry) => {
            const row = existing.get(entry.sessionId) ?? createRow(entry.sessionId);
            fillRow(row, entry, localSessionId);
            return row;
        });
        syncChildren(tbody, ordered);
    }

    function renderMoreButton(total) {
        parts.more.hidden = total <= COLLAPSED_ROWS;
        parts.more.setAttribute('aria-expanded', String(expanded));
        setText(
            parts.more,
            expanded
                ? t('dashboard.leaderboard.showFewer', { count: COLLAPSED_ROWS })
                : t('dashboard.leaderboard.showAll', { count: total })
        );
    }

    function render() {
        if (!data) return;
        const view = leaderboardView(data.entries, {
            period,
            now: data.now,
            room: data.room,
        });
        const hasRows = view.rows.length > 0;
        parts.dayNote.hidden = period !== 'day';
        parts.wrap.hidden = !hasRows;
        parts.empty.hidden = hasRows;
        setText(
            parts.empty,
            period === 'day'
                ? t('dashboard.leaderboard.emptyDay')
                : t('dashboard.leaderboard.emptyAll', { count: MIN_STUDIES_TO_RANK })
        );
        setText(
            parts.caption,
            t(
                period === 'day'
                    ? 'dashboard.leaderboard.captionDay'
                    : 'dashboard.leaderboard.captionAll'
            )
        );
        const visible = expanded ? view.rows : view.rows.slice(0, COLLAPSED_ROWS);
        preserveFocus(panel, () => renderRows(visible));
        renderMoreButton(view.rows.length);

        parts.truncated.hidden = !view.truncated;
        setText(parts.truncated, t('dashboard.leaderboard.truncated', { count: LEADERBOARD_SIZE }));
        parts.unranked.hidden = view.unrankedCount === 0;
        setText(
            parts.unranked,
            t('dashboard.leaderboard.unranked', {
                count: view.unrankedCount,
                min: MIN_STUDIES_TO_RANK,
            })
        );
    }

    function selectTab(tab, moveFocus) {
        period = tab.dataset.period;
        for (const other of tabs) {
            const selected = other === tab;
            other.setAttribute('aria-selected', String(selected));
            other.tabIndex = selected ? 0 : -1;
        }
        panel.setAttribute('aria-labelledby', tab.id);
        if (moveFocus) tab.focus();
        render();
    }

    function onTabKeydown(event) {
        const index = tabs.indexOf(event.currentTarget);
        const targets = {
            ArrowRight: tabs[(index + 1) % tabs.length],
            ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
            Home: tabs[0],
            End: tabs.at(-1),
        };
        const next = targets[event.key];
        if (!next) return;
        event.preventDefault();
        selectTab(next, true);
    }

    for (const tab of tabs) {
        tab.addEventListener('click', () => selectTab(tab, false));
        tab.addEventListener('keydown', onTabKeydown);
    }
    parts.more.addEventListener('click', () => {
        expanded = !expanded;
        render();
    });

    return {
        update(next) {
            data = next;
            render();
        },
    };
}
