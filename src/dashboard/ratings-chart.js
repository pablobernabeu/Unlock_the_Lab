/**
 * The 'Ratings by study' chart: participant mean per study as a bar with a
 * 95% interval, the expert rating as a diamond and the bar colour from the
 * expert quality band. Loaded on demand so the rest of the dashboard works
 * even if this chunk fails. Only the Chart.js parts used here are registered.
 *
 * Wide screens get columns; narrow screens get horizontal bars, one row per
 * study, so 48 studies stay readable on a phone.
 */
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from 'chart.js';
import { RATING_MAX, RATING_MIN } from '../lib/config.js';
import { t } from '../lib/i18n.js';
import { motionAllowed, onMotionChange } from '../lib/motion.js';
import { errorBarSegment } from './data.js';
import { bandLabel } from './labels.js';
import { formatCount, formatStat } from './numbers.js';

Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip
);

/** Containers narrower than this get horizontal bars. */
const NARROW_WIDTH = 640;
/** Height per study in the horizontal layout, and room for the axes. */
const ROW_HEIGHT = 18;
const AXES_HEIGHT = 96;
const COLUMN_HEIGHT = 380;
const CAP_HALF_WIDTH = 5;
const ANIMATION = Object.freeze({ duration: 400 });

function cssColour(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function readColours() {
    return {
        low: cssColour('--color-quality-low', '#881337'),
        medium: cssColour('--color-quality-medium', '#b45309'),
        high: cssColour('--color-quality-high', '#0369a1'),
        none: cssColour('--color-border-strong', '#64748b'),
        text: cssColour('--color-text', '#1e293b'),
        muted: cssColour('--color-text-muted', '#475569'),
        grid: cssColour('--color-border', '#e2e8f0'),
        surface: cssColour('--color-surface', '#ffffff'),
    };
}

function strokeErrorBar(ctx, segment, across, horizontal) {
    const point = (along, offset) =>
        horizontal ? [along, across + offset] : [across + offset, along];
    ctx.beginPath();
    ctx.moveTo(...point(segment.from, 0));
    ctx.lineTo(...point(segment.to, 0));
    // A limit beyond the axis has no cap, which tells readers the interval goes on.
    for (const [along, capped] of [
        [segment.from, segment.capFrom],
        [segment.to, segment.capTo],
    ]) {
        if (!capped) continue;
        ctx.moveTo(...point(along, -CAP_HALF_WIDTH));
        ctx.lineTo(...point(along, CAP_HALF_WIDTH));
    }
    ctx.stroke();
}

/**
 * Draws the intervals right after the bars, so the expert diamonds stay on top.
 * Positions are taken relative to each bar's tip so they follow the bar while it animates.
 */
function errorBarPlugin(getIntervals, colours) {
    return {
        id: 'utlErrorBars',
        afterDatasetDraw(chart, { index }) {
            if (index !== 0) return;
            const horizontal = chart.options.indexAxis === 'y';
            const valueScale = horizontal ? chart.scales.x : chart.scales.y;
            const area = chart.chartArea;
            const [areaStart, areaEnd] = horizontal
                ? [area.left, area.right]
                : [area.bottom, area.top];
            const means = chart.data.datasets[0].data;
            const intervals = getIntervals();
            const { ctx } = chart;
            ctx.save();
            ctx.lineCap = 'round';
            chart.getDatasetMeta(0).data.forEach((bar, position) => {
                const interval = intervals[position];
                const meanValue = means[position];
                if (!interval || !Number.isFinite(meanValue)) return;
                const tip = horizontal ? bar.x : bar.y;
                const meanPx = valueScale.getPixelForValue(meanValue);
                const segment = errorBarSegment(
                    tip + valueScale.getPixelForValue(interval.lower) - meanPx,
                    tip + valueScale.getPixelForValue(interval.upper) - meanPx,
                    areaStart,
                    areaEnd
                );
                if (!segment) return;
                const across = horizontal ? bar.y : bar.x;
                // A surface-coloured halo keeps the dark line visible on dark bars.
                ctx.strokeStyle = colours.surface;
                ctx.lineWidth = 4;
                strokeErrorBar(ctx, segment, across, horizontal);
                ctx.strokeStyle = colours.text;
                ctx.lineWidth = 2;
                strokeErrorBar(ctx, segment, across, horizontal);
            });
            ctx.restore();
        },
    };
}

function meanLabel(row) {
    if (row.n === 1) return t('dashboard.chart.tooltipMeanSingle', { mean: formatStat(row.mean) });
    return t('dashboard.chart.tooltipMean', {
        mean: formatStat(row.mean),
        lower: formatStat(row.lower),
        upper: formatStat(row.upper),
        count: formatCount(row.n),
    });
}

function axes(horizontal, colours) {
    const valueAxis = {
        type: 'linear',
        min: RATING_MIN,
        max: RATING_MAX,
        ticks: { stepSize: 1, color: colours.muted },
        grid: { color: colours.grid },
        border: { display: false },
        title: { display: true, text: t('dashboard.chart.axisRating'), color: colours.text },
    };
    const studyAxis = {
        type: 'category',
        grid: { display: false },
        border: { color: colours.grid },
        ticks: { color: colours.muted, autoSkip: true, maxRotation: 0, font: { size: 11 } },
        title: { display: true, text: t('dashboard.chart.axisStudy'), color: colours.text },
    };
    return horizontal ? { x: valueAxis, y: studyAxis } : { x: studyAxis, y: valueAxis };
}

function chartConfig({ horizontal, colours, getRows, getIntervals }) {
    return {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    type: 'bar',
                    label: t('dashboard.chart.legendMean'),
                    data: [],
                    backgroundColor: [],
                    borderRadius: 4,
                    borderSkipped: 'start',
                    maxBarThickness: 24,
                    // A mean of exactly 1 would otherwise have no visible bar.
                    minBarLength: 3,
                    order: 2,
                },
                {
                    type: 'line',
                    label: t('dashboard.chart.legendExpert'),
                    data: [],
                    showLine: false,
                    pointStyle: 'rectRot',
                    pointRadius: 6,
                    pointHoverRadius: 7,
                    pointBackgroundColor: colours.surface,
                    pointBorderColor: colours.text,
                    pointBorderWidth: 2,
                    // Lets diamonds at 1 or 7 show whole instead of being cut at the axis.
                    clip: 10,
                    order: 1,
                },
            ],
        },
        options: {
            indexAxis: horizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            animation: motionAllowed() ? ANIMATION : false,
            interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
            scales: axes(horizontal, colours),
            plugins: {
                tooltip: {
                    // Studies nobody has rated have no bar; the body says so instead.
                    filter: (item) => item.datasetIndex !== 0 || getRows()[item.dataIndex]?.n > 0,
                    itemSort: (a, b) => a.datasetIndex - b.datasetIndex,
                    callbacks: {
                        title: ([item]) => {
                            const row = getRows()[item.dataIndex];
                            return row ? `${row.id}: ${row.shortTitle}` : '';
                        },
                        label: (item) => {
                            const row = getRows()[item.dataIndex];
                            if (!row) return '';
                            return item.datasetIndex === 1
                                ? t('dashboard.chart.tooltipExpert', {
                                      rating: formatCount(row.expertRating),
                                      band: bandLabel(row.band),
                                  })
                                : meanLabel(row);
                        },
                        afterBody: ([item]) =>
                            getRows()[item?.dataIndex]?.n === 0
                                ? t('dashboard.chart.tooltipNoRatings')
                                : '',
                        footer: () => t('dashboard.chart.tooltipFooter'),
                    },
                },
            },
        },
        plugins: [errorBarPlugin(getIntervals, colours)],
    };
}

/**
 * The study under a click: anywhere in a study's column (or row), including
 * its axis label, which Chart.js's own onClick would ignore.
 */
function studyIndexAt(chart, event, count) {
    const horizontal = chart.options.indexAxis === 'y';
    const area = chart.chartArea;
    const along = horizontal ? event.offsetY : event.offsetX;
    const across = horizontal ? event.offsetX : event.offsetY;
    const [start, end] = horizontal ? [area.top, area.bottom] : [area.left, area.right];
    const beyondValues = horizontal ? across > area.right : across < area.top;
    if (along < start || along > end || beyondValues) return null;
    const scale = horizontal ? chart.scales.y : chart.scales.x;
    const index = Math.round(scale.getValueForPixel(along));
    return index >= 0 && index < count ? index : null;
}

/**
 * Creates the chart in `canvas`, inside `box` (whose height this sets).
 * @param {object} options
 * @param {HTMLElement} options.box
 * @param {HTMLCanvasElement} options.canvas
 * @param {(studyId: string, opener: HTMLElement) => void} options.onSelect
 * @returns {{update: (rows: import('./data.js').StudyRow[]) => void, destroy: () => void}}
 */
export function createRatingsChart({ box, canvas, onSelect }) {
    const colours = readColours();
    let rows = [];
    let intervals = [];
    let signature = '';
    let horizontal = box.clientWidth < NARROW_WIDTH;
    let chart = null;

    function sizeBox() {
        const count = rows.length || 48;
        box.style.height = `${horizontal ? count * ROW_HEIGHT + AXES_HEIGHT : COLUMN_HEIGHT}px`;
    }

    function applyData() {
        const [bars, expert] = chart.data.datasets;
        chart.data.labels = rows.map((row) => String(row.number));
        bars.data = rows.map((row) => row.mean);
        bars.backgroundColor = rows.map((row) => colours[row.band ?? 'none']);
        expert.data = rows.map((row) => row.expertRating);
        intervals = rows.map((row) =>
            row.lower === null ? null : { lower: row.lower, upper: row.upper }
        );
    }

    function build() {
        chart?.destroy();
        sizeBox();
        chart = new Chart(
            canvas,
            chartConfig({
                horizontal,
                colours,
                getRows: () => rows,
                getIntervals: () => intervals,
            })
        );
        applyData();
        chart.update('none');
    }

    canvas.addEventListener('click', (event) => {
        const index = studyIndexAt(chart, event, rows.length);
        if (index !== null) onSelect(rows[index].id, canvas);
    });

    const resizeObserver = new ResizeObserver(() => {
        const nextHorizontal = box.clientWidth < NARROW_WIDTH;
        if (nextHorizontal !== horizontal) {
            horizontal = nextHorizontal;
            build();
        }
    });
    resizeObserver.observe(box);

    const stopMotionListener = onMotionChange((allowed) => {
        chart.options.animation = allowed ? ANIMATION : false;
    });

    build();

    return {
        update(nextRows) {
            const next = JSON.stringify(
                nextRows.map((row) => [row.id, row.mean, row.lower, row.upper, row.expertRating])
            );
            rows = nextRows;
            if (next === signature) return;
            const countChanged = signature === '' || chart.data.labels.length !== rows.length;
            signature = next;
            if (countChanged) sizeBox();
            applyData();
            chart.update(motionAllowed() ? undefined : 'none');
        },
        destroy() {
            resizeObserver.disconnect();
            stopMotionListener();
            chart?.destroy();
        },
    };
}
