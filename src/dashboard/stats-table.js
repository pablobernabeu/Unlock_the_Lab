/**
 * The sortable statistics table. Sort controls are buttons inside the column
 * headers, with the state in aria-sort. Rows are keyed by study and updated in
 * place, so live updates keep the chosen sort and keyboard focus.
 */
import { announce, el, qs, qsa, setText } from '../lib/dom.js';
import { getLocale, t } from '../lib/i18n.js';
import { SORT_KEYS, sortStudyRows } from './data.js';
import { preserveFocus, syncChildren } from './focus.js';
import { bandLabel } from './labels.js';
import { formatCount, formatStat } from './numbers.js';

const COLUMN_LABELS = Object.freeze({
    study: () => t('dashboard.table.columns.study'),
    title: () => t('dashboard.table.columns.title'),
    expert: () => t('dashboard.table.columns.expert'),
    n: () => t('dashboard.table.columns.n'),
    mean: () => t('dashboard.table.columns.mean'),
    sd: () => t('dashboard.table.columns.sd'),
    ci: () => t('dashboard.table.columns.ci'),
    prediction: () => t('dashboard.table.columns.prediction'),
});

function createRow(studyId, onOpenStudy) {
    const button = el(
        'button',
        {
            type: 'button',
            class: 'btn-link stats-table__study',
            dataset: { focusKey: `study:${studyId}` },
        },
        studyId
    );
    button.addEventListener('click', () => onOpenStudy(studyId, button));
    return el(
        'tr',
        { dataset: { key: studyId } },
        el('th', { scope: 'row' }, button),
        el('td', { class: 'stats-table__title' }),
        el('td', { class: 'stats-table__expert' }),
        el('td', { class: 'num' }),
        el('td', { class: 'num' }),
        el('td', { class: 'num' }),
        el('td', { class: 'num stats-table__ci' }),
        el('td', { class: 'num' })
    );
}

function fillExpert(cell, row) {
    const signature = `${row.expertRating}|${row.band}`;
    if (cell.dataset.signature === signature) return;
    cell.dataset.signature = signature;
    cell.replaceChildren(
        formatCount(row.expertRating),
        ...(row.band
            ? [' ', el('span', { class: `badge badge--${row.band}` }, bandLabel(row.band))]
            : [])
    );
}

function fillRow(tr, row) {
    const [, title, expert, n, mean, sd, ci, prediction] = tr.cells;
    setText(title, row.shortTitle);
    title.title = row.title;
    fillExpert(expert, row);
    setText(n, formatCount(row.n));
    setText(mean, formatStat(row.mean));
    setText(sd, formatStat(row.sd));
    setText(
        ci,
        row.lower === null
            ? formatStat(null)
            : t('dashboard.table.ciValue', {
                  lower: formatStat(row.lower),
                  upper: formatStat(row.upper),
              })
    );
    setText(prediction, formatStat(row.meanPrediction));
}

/**
 * @param {HTMLTableElement} table
 * @param {object} options
 * @param {(studyId: string, opener: HTMLElement) => void} options.onOpenStudy
 * @returns {{update: (rows: import('./data.js').StudyRow[]) => void,
 *   getSort: () => {key: string, direction: string}}}
 */
export function createStatsTable(table, { onOpenStudy }) {
    const tbody = qs('[data-stats-rows]', table);
    const headers = qsa('th[data-sort-column]', table);
    const rowElements = new Map();
    let sort = { key: 'study', direction: 'ascending' };
    let rows = [];

    function rowElement(studyId) {
        if (!rowElements.has(studyId)) rowElements.set(studyId, createRow(studyId, onOpenStudy));
        return rowElements.get(studyId);
    }

    function render() {
        const sorted = sortStudyRows(rows, sort, getLocale());
        preserveFocus(tbody, () =>
            syncChildren(
                tbody,
                sorted.map((row) => {
                    const tr = rowElement(row.id);
                    fillRow(tr, row);
                    return tr;
                })
            )
        );
    }

    function renderSortState() {
        for (const header of headers) {
            if (header.dataset.sortColumn === sort.key)
                header.setAttribute('aria-sort', sort.direction);
            else header.removeAttribute('aria-sort');
        }
    }

    function sortBy(key) {
        if (!SORT_KEYS.includes(key)) return;
        const direction =
            sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending';
        sort = { key, direction };
        renderSortState();
        render();
        announce(
            t('dashboard.table.sorted', {
                column: COLUMN_LABELS[key](),
                direction: t(`dashboard.table.${direction}`),
            })
        );
    }

    for (const button of qsa('button[data-sort]', table)) {
        button.addEventListener('click', () => sortBy(button.dataset.sort));
    }
    renderSortState();

    return {
        update(nextRows) {
            rows = nextRows;
            render();
        },
        getSort: () => ({ ...sort }),
    };
}
