/**
 * The rating-profile scatter chart on the results page: each study is a dot
 * at (other participants' mean rating, the participant's own rating), with a
 * dashed identity line where the two agree. Chart.js is loaded only when the
 * chart is drawn, so participants never download it before the results page.
 * The same data are always available as a table next to the chart.
 */
import { formatRating } from '../../lib/format.js';
import { t } from '../../lib/i18n.js';
import { motionAllowed } from '../../lib/motion.js';
import { RATING_MAX, RATING_MIN } from '../../lib/config.js';

let chartModule = null;

async function loadChart() {
    chartModule ??= import('chart.js')
        .then(({ Chart, LineElement, LinearScale, PointElement, ScatterController, Tooltip }) => {
            Chart.register(LineElement, LinearScale, PointElement, ScatterController, Tooltip);
            return Chart;
        })
        .catch((error) => {
            chartModule = null;
            throw error;
        });
    return chartModule;
}

function token(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function axis(title) {
    return {
        type: 'linear',
        min: RATING_MIN - 0.5,
        max: RATING_MAX + 0.5,
        afterBuildTicks: (scale) => {
            scale.ticks = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, index) => ({
                value: RATING_MIN + index,
            }));
        },
        title: { display: true, text: title, color: token('--color-text', '#1e293b') },
        ticks: { color: token('--color-text-muted', '#475569') },
        grid: { color: token('--color-border', '#e2e8f0') },
    };
}

function tooltipLines(points) {
    // Several studies can share a position, so each item names its own study.
    return {
        title: () => '',
        label: (item) => {
            const point = points[item.dataIndex];
            if (!point) return '';
            return [
                point.title,
                t('app.results.chartTooltipOwn', { rating: point.y }),
                t('app.results.chartTooltipOthers', {
                    mean: formatRating(point.x),
                    count: point.n,
                }),
            ];
        },
    };
}

/**
 * Draws the chart into `canvas`.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{x: number, y: number, n: number, title: string}>} points from chartPoints
 * @returns {Promise<{destroy: () => void}>} rejects when Chart.js cannot be loaded
 */
export async function drawRatingChart(canvas, points) {
    const Chart = await loadChart();
    const accent = token('--color-accent-strong', '#5563d6');
    const chart = new Chart(canvas, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: t('app.results.chartStudies'),
                    data: points.map(({ x, y }) => ({ x, y })),
                    backgroundColor: accent,
                    borderColor: accent,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                },
                {
                    label: t('app.results.chartIdentity'),
                    data: [
                        { x: RATING_MIN - 0.5, y: RATING_MIN - 0.5 },
                        { x: RATING_MAX + 0.5, y: RATING_MAX + 0.5 },
                    ],
                    showLine: true,
                    borderColor: token('--color-border-strong', '#64748b'),
                    borderDash: [6, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: motionAllowed() ? { duration: 400 } : false,
            interaction: { mode: 'point', intersect: true },
            scales: {
                x: axis(t('app.results.chartAxisOthers')),
                y: axis(t('app.results.chartAxisOwn')),
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: (item) => item.datasetIndex === 0,
                    callbacks: tooltipLines(points),
                },
            },
        },
    });
    return { destroy: () => chart.destroy() };
}
