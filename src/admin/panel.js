/**
 * The signed-in admin panel: wires the sections to the live data and starts
 * or stops watching the database as administrators sign in and out.
 */
import { qs } from '../lib/dom.js';
import { watchData } from './data.js';
import { createDeleteData } from './delete-data.js';
import { createEndSessions } from './end-sessions.js';
import { createExportPanel } from './export-panel.js';
import { createOverview } from './overview.js';
import { createRoomLinks } from './rooms.js';
import { createStore } from './store.js';

/** Time-based figures (active now) are recomputed this often. */
export const CLOCK_TICK_MS = 30 * 1000;

/**
 * @param {HTMLElement} root the panel container
 * @param {object} options
 * @param {import('firebase/database').Database} options.db the admin app's database
 */
export function createPanel(root, { db }) {
    const store = createStore();
    const serverNow = () => Date.now() + (store.get('serverOffset') ?? 0);
    const overview = createOverview(qs('#overview', root), store, serverNow);
    const sections = [
        overview,
        createRoomLinks(qs('#rooms', root), store),
        createExportPanel(qs('#export', root), { db, store }),
        createEndSessions(qs('#end-sessions', root), { db, store, serverNow }),
        createDeleteData(qs('#delete-data', root), { db, store }),
    ];
    const renderAll = () => sections.forEach((section) => section.render());
    store.subscribe(renderAll);

    let stopWatching = null;
    let clock = null;

    return {
        /** Starts watching the data (after an administrator signs in). */
        start() {
            if (stopWatching) return;
            renderAll();
            stopWatching = watchData(db, store, (error) => {
                console.error('[admin] live data', error);
                overview.showError(error);
            });
            clock = setInterval(() => overview.tick(), CLOCK_TICK_MS);
        },
        /** Stops watching and forgets the data (after signing out). */
        stop() {
            stopWatching?.();
            stopWatching = null;
            clearInterval(clock);
            clock = null;
            store.clear();
            sections.forEach((section) => section.reset());
        },
    };
}
