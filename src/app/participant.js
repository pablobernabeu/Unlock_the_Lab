/**
 * The participant workshop: state, navigation between the views and the
 * session lifecycle. Page indices keep v1's meaning (state.js), so a session
 * started under v1 resumes on the same page.
 */
import {
    FEEDBACK_MODE,
    INACTIVITY_TIMEOUT_MS,
    INACTIVITY_WARNING_MS,
    MILESTONE_STUDIES,
    MIN_STUDIES_TO_FINISH,
} from '../lib/config.js';
import { alertDialog, confirmDialog } from '../lib/dialog.js';
import { announce, focusHeading } from '../lib/dom.js';
import { getParticipantAuth } from '../lib/firebase.js';
import { t } from '../lib/i18n.js';
import { roomFromUrl } from '../lib/room.js';
import { seededShuffle } from '../lib/shuffle.js';
import { storageAvailable } from '../lib/storage.js';
import { showToast } from '../lib/toast.js';
import { withTimeout } from './db-utils.js';
import { updateScoreBanner } from './header.js';
import { createNotices } from './notices.js';
import { markFirstDisplay } from './response-time.js';
import { loadLeaderboard, loadOthersMeans } from './results-data.js';
import { ownReviewRows, tokenShares, withOwnEntry } from './results-model.js';
import { createSession } from './session.js';
import { generateSessionId } from './session-id.js';
import {
    clearState,
    commitRating,
    describePage,
    isRated,
    loadState,
    ratedCount,
    resultsPage,
    saveState,
    startingState,
    weightsPage,
} from './state.js';
import { bindOnce, closeOpenDialogs, dialogOpen, focusView, setPageTitle, showView } from './ui.js';
import { renderGuideView } from './views/guide.js';
import { renderClosedView } from './views/message.js';
import { renderResultsView } from './views/results.js';
import { renderOwnResultActions, resultsLink } from './views/results-actions.js';
import { renderStudyView, showFeedbackInPlace } from './views/study.js';
import { renderWeightsView } from './views/weights.js';
import { renderWelcomeView } from './views/welcome.js';

/** A study score at or above this plays the logo's celebration, as in v1. */
const CELEBRATION_SCORE = 90;
const SIGN_OUT_TIMEOUT_MS = 3000;
const MINUTE_MS = 60 * 1000;

/** Notices that only concern the page on which they appeared. */
const PAGE_NOTICES = ['resume', 'roomMismatch'];

/**
 * The saved session (v1 or v2, migrated) or a new one.
 * @param {number} studyCount
 * @param {string|null} urlRoom
 */
function prepareState(studyCount, urlRoom) {
    return startingState(loadState(studyCount), {
        urlRoom,
        newSessionId: generateSessionId,
        studyCount,
    });
}

/**
 * Starts the workshop for this browser's participant.
 * @param {object} options
 * @param {{studies: object[], glossary: object[], rubric: object[]}} options.content
 * @param {{celebrate: () => void}} options.logo the header logo's animation
 * @returns {void}
 */
export function startParticipantApp({ content, logo }) {
    const studyCount = content.studies.length;
    const prepared = prepareState(studyCount, roomFromUrl());
    let state = prepared.state;
    // A first-time visitor's session is only stored once they choose to start.
    let persisted = prepared.saved;
    let storageWarned = false;
    const order = seededShuffle(content.studies, state.sessionId);
    const notices = createNotices(document.getElementById('app-notice'));

    function persist() {
        if (!persisted) return;
        const stored = saveState(state);
        if (!stored && !storageWarned) {
            storageWarned = true;
            notices.show('storage', {
                tone: 'warning',
                text: t('common.errors.storageUnavailable'),
                dismissible: true,
            });
        }
    }

    function patch(changes) {
        state = { ...state, ...changes };
        persist();
    }

    const currentKind = () => describePage(state.currentPage, studyCount).kind;

    const session = createSession({
        getState: () => state,
        patch,
        onProblem: showConnectionProblem,
        onConnected: () => notices.clear('connection'),
        onClosed: showClosed,
        onWarning: () => {
            alertDialog({
                title: t('app.session.warningTitle'),
                message: t('app.session.warningText', {
                    minutes: INACTIVITY_WARNING_MS / MINUTE_MS,
                }),
                okLabel: t('app.session.continue'),
            }).then(() => session.keepAlive());
        },
        onPaused: () => {
            closeOpenDialogs();
            alertDialog({
                title: t('app.session.pausedTitle'),
                message: t('app.session.pausedText', {
                    minutes: INACTIVITY_TIMEOUT_MS / MINUTE_MS,
                }),
                okLabel: t('app.session.continue'),
            }).then(() => session.resume());
        },
        onUserName: () => {
            refreshChrome();
            if (currentKind() === 'results') render(state.currentPage);
        },
    });

    const app = {
        content,
        order,
        studyCount,
        session,
        feedbackEachStudy: FEEDBACK_MODE === 'each',
        get state() {
            return state;
        },
        patch,
        navigate,
        begin,
        finishEarly,
        onRatingSaved,
        confirmNewParticipant,
    };

    /* ---------- Views ---------- */

    function recordFirstDisplay(study) {
        if (isRated(state, study.id)) return;
        const timestamps = markFirstDisplay(state.pageDisplayTimestamps, study.id, Date.now());
        if (timestamps !== state.pageDisplayTimestamps)
            patch({ pageDisplayTimestamps: timestamps });
    }

    function renderOwnResults() {
        const rows = ownReviewRows(order, state);
        const totals = { score: state.totalScore, papersRated: ratedCount(state) };
        const name = state.userName ?? t('common.participant.unnamed');
        const ownEntry = {
            sessionId: state.sessionId,
            userName: state.userName ?? '',
            ...totals,
            room: state.room,
            now: Date.now(),
        };
        const view = renderResultsView({
            mode: 'own',
            sessionId: state.sessionId,
            name,
            totals,
            rows,
            room: state.room,
            // The local totals are the truth for this participant, even before the latest write lands.
            entries: loadLeaderboard().then((entries) =>
                totals.papersRated > 0 ? withOwnEntry(entries, ownEntry) : entries
            ),
            others: loadOthersMeans(
                rows.map((row) => row.study.id),
                state.sessionId
            ),
            tokens: tokenShares(state.criterionTokens) ? state.criterionTokens : null,
        });
        renderOwnResultActions({
            sessionId: state.sessionId,
            name,
            onNewParticipant: confirmNewParticipant,
        });
        return view;
    }

    function renderPage(page) {
        const { kind, studyIndex } = describePage(page, studyCount);
        switch (kind) {
            case 'welcome':
                return { view: renderWelcomeView(app), title: t('app.pageTitle.welcome') };
            case 'guide':
                return { view: renderGuideView(app), title: t('app.pageTitle.guide') };
            case 'study':
                recordFirstDisplay(order[studyIndex]);
                return {
                    view: renderStudyView(app, studyIndex),
                    title: t('app.pageTitle.study', {
                        position: studyIndex + 1,
                        total: studyCount,
                    }),
                };
            case 'weights':
                return { view: renderWeightsView(app), title: t('app.pageTitle.weights') };
            default:
                return { view: renderOwnResults(), title: t('app.pageTitle.results') };
        }
    }

    function refreshChrome() {
        const kind = currentKind();
        updateScoreBanner(state, {
            studyCount,
            visible: kind === 'study' || kind === 'weights',
        });
        document.getElementById('footer-new-participant').hidden = !persisted;
    }

    function render(page, { focus = false } = {}) {
        const { view, title } = renderPage(page);
        showView(view.id);
        setPageTitle(title);
        refreshChrome();
        if (focus) focusView(view);
    }

    /* ---------- Navigation ---------- */

    function navigate(page) {
        notices.clearAll(PAGE_NOTICES);
        // A participant who has submitted the weights has finished and goes to the results.
        if (page === weightsPage(studyCount) && state.rankingSubmitted)
            page = resultsPage(studyCount);
        state = { ...state, currentPage: page };
        persist();
        render(page, { focus: true });
        if (currentKind() === 'results') session.finish();
    }

    function begin() {
        persisted = true;
        if (!storageAvailable() && !storageWarned) {
            storageWarned = true;
            notices.show('storage', {
                tone: 'warning',
                text: t('common.errors.storageUnavailable'),
                dismissible: true,
            });
        }
        navigate(1);
        session.start({ presence: true });
    }

    async function finishEarly(page) {
        const confirmed = await confirmDialog({
            title: t('app.study.finishTitle'),
            message: t('app.study.finishMessage', {
                count: ratedCount(state),
                total: studyCount,
            }),
            confirmLabel: t('app.study.finishConfirm'),
            cancelLabel: t('app.study.finishCancel'),
        });
        if (!confirmed) return;
        patch({ finishedFromPage: page });
        navigate(weightsPage(studyCount));
    }

    /* ---------- Ratings ---------- */

    function celebrateLater(delayMs) {
        setTimeout(() => logo.celebrate(), delayMs);
    }

    function milestone(count) {
        const message = t('app.study.milestone', { count });
        // A toast would sit behind an open dialog, where some screen readers miss it.
        if (dialogOpen()) announce(message);
        else showToast(message, { tone: 'success' });
    }

    function onRatingSaved(study, studyIndex, result, section) {
        const before = ratedCount(state);
        state = commitRating(state, {
            studyId: study.id,
            ...result,
            feedbackShown: app.feedbackEachStudy,
        });
        const celebrate =
            result.score >= CELEBRATION_SCORE && !state.celebratedPapers.includes(study.id);
        if (celebrate)
            state = { ...state, celebratedPapers: [...state.celebratedPapers, study.id] };
        persist();
        refreshChrome();

        const panel = showFeedbackInPlace(app, studyIndex, section);
        focusHeading(panel.querySelector('#feedback-heading'));
        session.syncLeaderboard();

        const count = ratedCount(state);
        if (celebrate) celebrateLater(500);
        if (count === MILESTONE_STUDIES && before < count) {
            celebrateLater(800);
            milestone(count);
        }
    }

    /* ---------- Session problems and endings ---------- */

    function showConnectionProblem(kind) {
        if (kind === 'claimed') {
            notices.clear('resume');
            notices.show('claimed', {
                tone: 'danger',
                title: t('app.session.claimedTitle'),
                text: [t('app.session.claimedText'), t('app.session.claimedAction')],
                actions: [
                    { label: t('app.session.claimedResults'), href: resultsLink(state.sessionId) },
                    {
                        label: t('app.footer.newParticipant'),
                        onClick: startNewParticipant,
                        primary: true,
                    },
                ],
                urgent: true,
            });
            return;
        }
        notices.show('connection', {
            tone: 'warning',
            title: t('app.session.connectFailedTitle'),
            text: t('app.session.connectFailedText'),
            actions: [
                {
                    label: t('common.errors.retry'),
                    onClick: () => session.start({ presence: currentKind() !== 'results' }),
                },
            ],
            urgent: true,
        });
    }

    function showClosed() {
        // The results page stays usable; it no longer saves anything.
        if (currentKind() === 'results') return;
        closeOpenDialogs();
        notices.clearAll();
        const canSeeResults = ratedCount(state) >= MIN_STUDIES_TO_FINISH;
        const view = renderClosedView({
            onResults: canSeeResults ? () => navigate(resultsPage(studyCount)) : null,
            onNewParticipant: startNewParticipant,
        });
        showView(view.id);
        setPageTitle(t('app.session.closedTitle'));
        updateScoreBanner(state, { studyCount, visible: false });
        focusView(view);
    }

    /* ---------- New participant ---------- */

    async function startNewParticipant() {
        // A link's room wins: that is how someone holding an older session joins a new room.
        const room = roomFromUrl() ?? state.room;
        await session.end();
        clearState();
        try {
            // A fresh anonymous sign-in keeps the next participant's data apart from this one's.
            const auth = await getParticipantAuth();
            const { signOut } = await import('firebase/auth');
            await withTimeout(signOut(auth), SIGN_OUT_TIMEOUT_MS, 'Signing out');
        } catch (error) {
            console.info('[app] Sign-out skipped:', error?.message ?? error);
        }
        const url = new URL('/', location.href);
        if (room) url.searchParams.set('room', room);
        location.assign(url.toString());
    }

    async function confirmNewParticipant() {
        const count = ratedCount(state);
        const confirmed = await confirmDialog({
            title: t('app.session.newTitle'),
            message:
                count > 0 && state.userName
                    ? t('app.session.newText', { name: state.userName, count })
                    : t('app.session.newTextEmpty'),
            confirmLabel: t('app.session.newConfirm'),
            danger: true,
        });
        if (confirmed) await startNewParticipant();
    }

    /* ---------- Start-up ---------- */

    function showStartNotices() {
        const kind = currentKind();
        if (prepared.roomMismatch) {
            notices.show('roomMismatch', {
                tone: 'warning',
                text: t('app.roomMismatch', { room: prepared.roomMismatch }),
                actions: [
                    {
                        label: t('app.footer.newParticipant'),
                        onClick: confirmNewParticipant,
                        primary: true,
                    },
                ],
                dismissible: true,
            });
        } else if (prepared.saved && (kind === 'study' || kind === 'weights')) {
            const count = ratedCount(state);
            notices.show('resume', {
                text: state.userName
                    ? t('app.resumeNotice', { name: state.userName, count })
                    : t('app.resumeNoticeNoName', { count }),
                actions: [
                    { label: t('app.footer.newParticipant'), onClick: confirmNewParticipant },
                ],
                dismissible: true,
            });
        }
    }

    bindOnce(document.getElementById('footer-new-participant'), 'click', confirmNewParticipant);
    render(state.currentPage);
    showStartNotices();
    if (state.currentPage >= 1) session.start({ presence: currentKind() !== 'results' });
}
