/**
 * Entry point of the participant app (index.html). It loads the strings and
 * the content, then either shows a read-only results page for a
 * `?session=` link (no sign-in, no writes, no timers) or starts the workshop.
 */
import '../lib/preview-banner.js';
import { APP_VERSION } from '../lib/config.js';
import { loadContent } from '../lib/content.js';
import { ensureLiveRegions, qs, setText } from '../lib/dom.js';
import { applyTranslations, initI18n, t } from '../lib/i18n.js';
import { renderLocaleSwitcher } from '../lib/locale-switcher.js';
import { initMotion, renderMotionToggle } from '../lib/motion.js';
import { initToasts } from '../lib/toast.js';
import { enableLogoAnimation } from './logo-animation.js';
import { startParticipantApp } from './participant.js';
import { loadOthersMeans, loadReadOnlyResults } from './results-data.js';
import { readOnlyTotals, withOwnEntry } from './results-model.js';
import { setPageTitle, showView } from './ui.js';
import { renderChooseView, renderFailedView, renderNotFoundView } from './views/message.js';
import { renderReadOnlyResultActions } from './views/results-actions.js';
import { renderResultsView } from './views/results.js';

function renderFooter() {
    renderMotionToggle(qs('[data-motion-toggle]'));
    renderLocaleSwitcher(qs('[data-locale-switcher]'));
    setText('#app-version', t('common.footer.version', { version: APP_VERSION }));
}

/** Shown when the strings or the content cannot load; its English text is prerendered. */
function showLoadFailure(error) {
    console.error('[app] Could not start:', error);
    qs('#app-loading').hidden = true;
    qs('#app-load-failed').hidden = false;
}

function showReadOnlyView(result) {
    if (result.kind === 'notFound') {
        return { view: renderNotFoundView(), title: t('app.pageTitle.notFound') };
    }
    if (result.kind === 'choose') {
        return { view: renderChooseView(result.matches), title: t('app.pageTitle.choose') };
    }
    const name = result.userName ?? t('common.participant.unnamed');
    const totals = readOnlyTotals(result.entry, result.rows);
    const { entry } = result;
    // Saved scores that have overtaken the leaderboard entry also give the position.
    const entries =
        entry && totals
            ? withOwnEntry(result.entries, {
                  sessionId: result.sessionId,
                  userName: entry.userName,
                  ...totals,
                  room: entry.room,
                  now: Date.now(),
              })
            : result.entries;
    const view = renderResultsView({
        mode: 'readOnly',
        sessionId: result.sessionId,
        name,
        totals,
        rows: result.rows,
        room: entry?.room ?? null,
        entries: Promise.resolve(entries),
        others: loadOthersMeans(
            result.rows.map((row) => row.study.id),
            result.sessionId
        ),
        tokens: result.tokens,
    });
    renderReadOnlyResultActions();
    return { view, title: t('app.pageTitle.resultsOf', { name }) };
}

/**
 * A shared results link: read-only, third person, nothing written.
 * @param {{studies: object[]}} content
 * @param {string} param the `?session=` value
 */
async function showReadOnlyResults(content, param) {
    setText('#app-loading-text', t('app.results.loading'));
    let shown;
    try {
        shown = showReadOnlyView(await loadReadOnlyResults(content.studies, param));
    } catch (error) {
        console.warn('[app] Results not loaded:', error);
        shown = {
            view: renderFailedView(t('app.results.loadFailed')),
            title: t('app.loadFailedHeading'),
        };
    }
    showView(shown.view.id);
    setPageTitle(shown.title);
}

async function main() {
    initMotion();
    ensureLiveRegions();
    initToasts();
    const headerLogo = enableLogoAnimation(qs('#header-logo'));
    enableLogoAnimation(qs('#welcome-logo'), { idleShake: true });

    let content;
    try {
        await initI18n({ namespaces: ['app'] });
        applyTranslations();
        renderFooter();
        content = await loadContent();
    } catch (error) {
        showLoadFailure(error);
        return;
    }

    const params = new URLSearchParams(location.search);
    if (params.has('session')) {
        await showReadOnlyResults(content, params.get('session'));
        return;
    }
    startParticipantApp({ content, logo: headerLogo });
}

main();
