/**
 * Criterion importance: the average share of tokens per criterion with 95%
 * intervals. Each row states its figures in text; the bar beside them is
 * decorative, so the list needs no separate table.
 */
import { TOKEN_BUDGET } from '../lib/config.js';
import { CRITERIA, labelKey } from '../lib/criteria.js';
import { el, qs, setText } from '../lib/dom.js';
import { formatPercent } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { formatShare } from './numbers.js';

function createRow(criterion) {
    const fill = el('span', { class: 'criterion__fill' });
    const whisker = el('span', { class: 'criterion__whisker' });
    const row = el(
        'li',
        { class: 'criterion', dataset: { key: criterion.key } },
        el(
            'p',
            { class: 'criterion__text' },
            el('span', { class: 'criterion__icon', 'aria-hidden': 'true' }, criterion.icon),
            ' ',
            el('span', { class: 'criterion__label' }, t(labelKey(criterion.key))),
            ' ',
            el('span', { class: 'criterion__value', dataset: { value: '' } }),
            ' ',
            el('span', { class: 'criterion__ci text-muted', dataset: { ci: '' } })
        ),
        el('div', { class: 'criterion__track', 'aria-hidden': 'true' }, fill, whisker)
    );
    return { row, fill, whisker };
}

function percentOfScale(value, scaleMax) {
    return `${Math.min(100, Math.max(0, (value / scaleMax) * 100))}%`;
}

/**
 * @param {HTMLElement} root the criterion section
 * @returns {{update: (shares: ReturnType<typeof import('./data.js').criterionShares>) => void}}
 */
export function createCriterionImportance(root) {
    const list = qs('[data-criteria-list]', root);
    const empty = qs('[data-criteria-empty]', root);
    const count = qs('[data-criteria-count]', root);
    const rows = new Map(CRITERIA.map((criterion) => [criterion.key, createRow(criterion)]));
    list.replaceChildren(...[...rows.values()].map(({ row }) => row));
    const scale = el(
        'li',
        { class: 'criterion-scale', 'aria-hidden': 'true' },
        el('span', null, t('dashboard.criteria.scaleStart')),
        el('span', { dataset: { scaleEnd: '' } })
    );
    list.append(scale);

    // Until the first snapshot arrives the section says it is loading rather than showing empty bars.
    list.hidden = true;
    count.hidden = true;
    empty.hidden = false;
    setText(empty, t('common.status.loading'));

    setText(
        qs('[data-copy="criteria.intro"]', root),
        t('dashboard.criteria.intro', { budget: TOKEN_BUDGET, count: CRITERIA.length })
    );

    function updateRow({ row, fill, whisker }, item, scaleMax) {
        setText(
            qs('[data-value]', row),
            t('dashboard.criteria.share', { share: formatShare(item.mean) })
        );
        setText(
            qs('[data-ci]', row),
            item.lower === null
                ? t('dashboard.criteria.ciMissing')
                : t('dashboard.criteria.ci', {
                      lower: formatShare(item.lower),
                      upper: formatShare(item.upper),
                  })
        );
        fill.style.width = percentOfScale(item.mean ?? 0, scaleMax);
        whisker.hidden = item.lower === null;
        if (item.lower !== null) {
            whisker.style.left = percentOfScale(item.lower, scaleMax);
            whisker.style.width = `calc(${percentOfScale(item.upper, scaleMax)} - ${percentOfScale(item.lower, scaleMax)})`;
        }
    }

    return {
        update({ n, criteria, scaleMax }) {
            const hasData = n > 0;
            empty.hidden = hasData;
            list.hidden = !hasData;
            count.hidden = !hasData;
            setText(empty, t('dashboard.criteria.empty'));
            setText(count, t('dashboard.criteria.count', { count: n }));
            if (!hasData) return;
            for (const item of criteria) updateRow(rows.get(item.key), item, scaleMax);
            setText(qs('[data-scale-end]', scale), formatPercent(scaleMax * 100));
        },
    };
}
