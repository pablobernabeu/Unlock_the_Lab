/**
 * Public live dashboard (dashboard.html). Read-only: it never signs in and
 * never writes. Each database node has its own listener; changes are batched
 * and only the sections that depend on a changed node are re-rendered.
 */
import { APP_VERSION, SEED_WEIGHT, STORAGE_KEYS } from '../lib/config.js';
import { loadContent } from '../lib/content.js';
import { ensureLiveRegions, qs, setText } from '../lib/dom.js';
import { db } from '../lib/firebase.js';
import { applyTranslations, initI18n, t } from '../lib/i18n.js';
import { normaliseEntries } from '../lib/leaderboard.js';
import { renderLocaleSwitcher } from '../lib/locale-switcher.js';
import { initMotion, renderMotionToggle } from '../lib/motion.js';
import { roomFromUrl } from '../lib/room.js';
import { scoringTarget, validRatings } from '../lib/scoring.js';
import { safeGetJSON } from '../lib/storage.js';
import { createBatcher } from './batcher.js';
import { createConnectionStatus } from './connection-status.js';
import { createCriterionImportance } from './criterion-importance.js';
import {
    chartSummary,
    collectRooms,
    countActive,
    criterionShares,
    groupRatings,
    localSessionId,
    overviewCounts,
    sessionHasRatings,
    studyRows,
} from './data.js';
import { createFindResults } from './find-results.js';
import { createLeaderboard } from './leaderboard.js';
import { subscribe } from './live.js';
import { formatCount } from './numbers.js';
import { createOverview } from './overview.js';
import { createRoomFilter } from './room-filter.js';
import { createStatsTable } from './stats-table.js';
import { createStudyDialog } from './study-dialog.js';

/** Time-based figures (active now, the 24-hour leaderboard) are recomputed this often. */
const CLOCK_TICK_MS = 30 * 1000;

function section(headingId) {
    return qs(`#${headingId}`).closest('section');
}

function showLoadError(error) {
    console.error('[dashboard]', error);
    qs('[data-load-error]').hidden = false;
}

function renderStaticCopy() {
    setText(qs('[data-footer-version]'), t('common.footer.version', { version: APP_VERSION }));
    setText(qs('[data-chart-summary]'), t('common.status.loading'));
    setText(
        qs('[data-copy="chart.introTarget"]'),
        t('dashboard.chart.introTarget', { weight: SEED_WEIGHT })
    );
    renderLocaleSwitcher(qs('[data-locale-switcher]'));
    renderMotionToggle(qs('[data-motion-toggle]'));
}

function renderChartSummary(rows) {
    const { total, rated, close } = chartSummary(rows);
    setText(
        qs('[data-chart-summary]'),
        rated === 0
            ? t('dashboard.chart.summaryNone')
            : t('dashboard.chart.summary', {
                  rated: formatCount(rated),
                  total: formatCount(total),
                  close: formatCount(close),
              })
    );
}

function createDashboard() {
    const state = {
        nodes: { ratings: null, leaderboard: null, rankings: null, sessions: null, active: null },
        loaded: new Set(),
        serverOffset: 0,
        room: roomFromUrl(),
        studies: null,
        entries: [],
        rows: [],
    };
    const now = () => Date.now() + state.serverOffset;
    const localId = localSessionId(safeGetJSON(STORAGE_KEYS.state));
    let chart = null;

    const overview = createOverview(section('overview-heading'));
    const leaderboard = createLeaderboard(section('leaderboard-heading'), {
        localSessionId: localId,
    });
    const criteria = createCriterionImportance(section('criteria-heading'));
    const dialog = createStudyDialog(qs('[data-study-dialog]'));
    const findResults = createFindResults(section('find-heading'), {
        localSessionId: localId,
        getEntries: () => (state.loaded.has('leaderboard') ? state.entries : null),
    });

    function studyDetails(studyId) {
        const study = state.studies?.find((candidate) => candidate.id === studyId);
        const row = state.rows.find((candidate) => candidate.id === studyId);
        if (!study || !row) return null;
        // The game's target is global: every room's ratings, plus the expert rating.
        const target = scoringTarget(
            validRatings(state.nodes.ratings?.[studyId]),
            study.expertRating
        );
        return { study, row, target, room: state.room };
    }

    function openStudy(studyId, opener) {
        const details = studyDetails(studyId);
        if (details) dialog.open(details, opener);
    }

    const statsTable = createStatsTable(qs('[data-stats-table]'), { onOpenStudy: openStudy });

    function renderRatings() {
        const groups = groupRatings(state.nodes.ratings, {
            room: state.room,
            studyIds: state.studies.map((study) => study.id),
        });
        state.rows = studyRows(state.studies, groups);
        overview.setCounts(overviewCounts(groups));
        statsTable.update(state.rows);
        chart?.update(state.rows);
        renderChartSummary(state.rows);
        const openId = dialog.openStudyId();
        if (openId) {
            const details = studyDetails(openId);
            if (details) dialog.refresh(details);
        }
    }

    function render(parts) {
        const changed = (...names) => names.some((name) => parts.has(name));
        const ready = (name) => state.loaded.has(name);
        if (changed('ratings', 'content', 'room', 'chart') && ready('ratings') && state.studies) {
            renderRatings();
        }
        if (changed('leaderboard', 'room', 'clock') && ready('leaderboard')) {
            leaderboard.update({ entries: state.entries, now: now(), room: state.room });
        }
        if (changed('leaderboard', 'ratings')) {
            findResults.update({
                entries: state.entries,
                localHasRatings: sessionHasRatings(state.nodes.ratings, localId),
            });
        }
        if (changed('rankings', 'room') && ready('rankings')) {
            criteria.update(criterionShares(state.nodes.rankings, { room: state.room }));
        }
        if (changed('active', 'room', 'clock') && ready('active')) {
            overview.setActive(countActive(state.nodes.active, { now: now(), room: state.room }));
        }
        if (changed('sessions', 'leaderboard', 'rankings')) {
            roomFilter.setRooms(
                collectRooms(state.nodes.sessions, state.nodes.leaderboard, state.nodes.rankings)
            );
        }
    }

    const batcher = createBatcher(render);

    const roomFilter = createRoomFilter({
        select: qs('#room-select'),
        hint: qs('[data-room-hint]'),
        initialRoom: state.room,
        onChange(room) {
            state.room = room;
            batcher.mark('room');
            batcher.flush();
        },
    });

    const connection = createConnectionStatus({
        status: qs('[data-connection]'),
        text: qs('[data-connection-text]'),
    });
    subscribe(db, {
        onData(node, value) {
            state.nodes[node] = value;
            state.loaded.add(node);
            if (node === 'leaderboard') state.entries = normaliseEntries(value);
            batcher.mark(node);
        },
        onError: (node, error) => showLoadError(error),
        onConnection: connection.setConnected,
        onServerOffset(offset) {
            state.serverOffset = offset;
            batcher.mark('clock');
        },
    });
    setInterval(() => batcher.mark('clock'), CLOCK_TICK_MS);

    loadContent()
        .then(({ studies }) => {
            state.studies = studies;
            batcher.mark('content');
        })
        .catch(showLoadError);

    import('./ratings-chart.js')
        .then(({ createRatingsChart }) => {
            chart = createRatingsChart({
                box: qs('[data-chart-box]'),
                canvas: qs('[data-chart-canvas]'),
                onSelect: openStudy,
            });
            batcher.mark('chart');
        })
        .catch((error) => {
            console.error('[dashboard] chart', error);
            qs('[data-chart-box]').hidden = true;
            qs('[data-chart-failed]').hidden = false;
        });
}

async function start() {
    initMotion();
    ensureLiveRegions();
    await initI18n({ namespaces: ['dashboard'] });
    applyTranslations();
    renderStaticCopy();
    createDashboard();
}

start().catch(showLoadError);
