// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistory, historyMove } from '../../../src/app/history.js';
import { createState, resultsPage, studyPage, weightsPage } from '../../../src/app/state.js';

const STUDY_COUNT = 48;
const ORDER = Array.from({ length: STUDY_COUNT }, (_, index) => ({ id: `STUDY-${index + 1}` }));
const WEIGHTS = weightsPage(STUDY_COUNT);
const RESULTS = resultsPage(STUDY_COUNT);

/** A state that has rated the first `count` studies of ORDER. */
function rated(count, changes = {}) {
    const ids = ORDER.slice(0, count).map((study) => study.id);
    return {
        ...createState({ sessionId: 'session_1800000000000_abc123' }),
        userRatings: Object.fromEntries(ids.map((id) => [id, 4])),
        ...changes,
    };
}

const move = (from, to, state, options = {}) =>
    historyMove({ from, to, state, order: ORDER, ...options });

describe('historyMove', () => {
    it('moves freely between the welcome page and the guide', () => {
        expect(move(1, 0, rated(0))).toEqual({ page: 0, usesBack: false });
        expect(move(0, 1, rated(0))).toEqual({ page: 1, usesBack: false });
    });

    it('goes back one study while the one-time step back is unused, and uses it', () => {
        expect(move(studyPage(3), studyPage(2), rated(3))).toEqual({
            page: studyPage(2),
            usesBack: true,
        });
        expect(move(studyPage(3), studyPage(2), rated(3, { hasUsedBackButton: true }))).toEqual({
            refused: 'app.history.backUsed',
        });
    });

    it('never goes back from the first study, or more than one study', () => {
        expect(move(studyPage(0), 1, rated(0))).toEqual({ refused: 'app.history.firstStudy' });
        expect(move(studyPage(4), studyPage(1), rated(4))).toEqual({
            refused: 'app.history.oneStep',
        });
        expect(move(studyPage(1), 1, rated(1))).toEqual({ refused: 'app.history.oneStep' });
    });

    it('goes forward only past answered studies', () => {
        // Back to a rated study, then forward again to the unanswered one after it.
        expect(move(studyPage(2), studyPage(3), rated(3))).toEqual({
            page: studyPage(3),
            usesBack: false,
        });
        expect(move(1, studyPage(0), rated(0))).toEqual({ page: studyPage(0), usesBack: false });
        expect(move(studyPage(3), studyPage(4), rated(3))).toEqual({
            refused: 'app.history.unanswered',
        });
        // Several entries at once (the long-press menu) may not jump an unanswered study.
        expect(move(studyPage(1), studyPage(5), rated(3))).toEqual({
            refused: 'app.history.unanswered',
        });
        expect(move(1, studyPage(2), rated(1))).toEqual({ refused: 'app.history.unanswered' });
        expect(move(studyPage(47), WEIGHTS, rated(47))).toEqual({
            refused: 'app.history.unanswered',
        });
        expect(move(studyPage(47), WEIGHTS, rated(48))).toEqual({ page: WEIGHTS, usesBack: false });
    });

    it('goes forward to the weights page after finishing early, which the participant confirmed', () => {
        const finished = rated(10, { finishedFromPage: studyPage(10) });
        expect(move(studyPage(10), WEIGHTS, finished)).toEqual({ page: WEIGHTS, usesBack: false });
        // But not to a study beyond an unanswered one.
        expect(move(studyPage(10), studyPage(11), finished)).toEqual({
            refused: 'app.history.unanswered',
        });
        expect(move(WEIGHTS, RESULTS, finished)).toEqual({ refused: 'app.history.saveWeights' });
    });

    it('goes back from the weights page to rating only when that is on offer', () => {
        const finished = rated(10, { finishedFromPage: studyPage(10) });
        expect(move(WEIGHTS, studyPage(10), finished)).toEqual({
            page: studyPage(10),
            usesBack: false,
        });
        // The entry before may be another page: Back still goes where 'Go back to rating' goes.
        expect(move(WEIGHTS, studyPage(3), finished)).toEqual({
            page: studyPage(10),
            usesBack: false,
        });
        expect(move(WEIGHTS, studyPage(47), rated(48))).toEqual({
            refused: 'app.history.allRated',
        });
    });

    it('keeps the results page, and a closed or paused session, where they are', () => {
        const done = rated(10, { rankingSubmitted: true });
        expect(move(RESULTS, WEIGHTS, done)).toEqual({ refused: 'app.history.finished' });
        expect(move(RESULTS, RESULTS - 5, done, { session: 'closed' })).toEqual({
            refused: 'app.history.finished',
        });
        expect(move(studyPage(3), studyPage(2), rated(3), { session: 'closed' })).toEqual({
            refused: 'app.history.closed',
        });
        expect(move(1, 0, rated(0), { session: 'paused' })).toEqual({
            refused: 'app.history.paused',
        });
    });

    it('waits while answers are being saved', () => {
        expect(move(studyPage(3), studyPage(2), rated(2), { busy: true })).toEqual({
            refused: 'app.history.saving',
        });
    });

    it('treats a move to the same page as no move', () => {
        expect(move(studyPage(3), studyPage(3), rated(0), { session: 'closed' })).toEqual({
            page: studyPage(3),
            usesBack: false,
        });
    });
});

/** Waits until the browser has handled a history traversal (popstate is queued). */
function traversed() {
    return new Promise((resolve) => {
        window.addEventListener('popstate', () => setTimeout(resolve, 0), { once: true });
    });
}

describe('createHistory', () => {
    const SID = 'session_1800000000000_abc123';
    let listeners;

    beforeEach(() => {
        history.replaceState(null, '');
        listeners = [];
        const add = window.addEventListener.bind(window);
        vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
            listeners.push([type, listener]);
            add(type, listener, options);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        for (const [type, listener] of listeners) window.removeEventListener(type, listener);
    });

    it('takes over the current entry, so a reload adds no entry', () => {
        const length = history.length;
        const first = createHistory({ sessionId: SID, onMove: () => true });
        first.start(3);
        expect(history.length).toBe(length);
        expect(history.state).toMatchObject({ page: 3, index: 0, session: SID });
        first.push(4);
        expect(history.length).toBe(length + 1);

        // A reload on this entry starts again from it, at its position.
        const second = createHistory({ sessionId: SID, onMove: () => true });
        second.start(4);
        expect(history.length).toBe(length + 1);
        expect(history.state).toMatchObject({ page: 4, index: 1 });
    });

    it('pushes one entry per page and hands Back and Forward to onMove', async () => {
        const moves = [];
        const nav = createHistory({
            sessionId: SID,
            onMove: (page) => {
                moves.push(page);
                return true;
            },
        });
        nav.start(0);
        nav.push(1);
        nav.push(1);
        nav.push(2);
        expect(history.state).toMatchObject({ page: 2, index: 2 });

        let landed = traversed();
        history.back();
        await landed;
        expect(moves).toEqual([1]);
        expect(history.state).toMatchObject({ page: 1, index: 1 });

        landed = traversed();
        history.forward();
        await landed;
        expect(moves).toEqual([1, 2]);
    });

    it('returns to the entry it came from when onMove refuses, even across several entries', async () => {
        const onMove = vi.fn(() => false);
        const nav = createHistory({ sessionId: SID, onMove });
        nav.start(0);
        nav.push(1);
        nav.push(2);
        nav.push(3);

        history.go(-3);
        await vi.waitFor(() => expect(onMove).toHaveBeenCalledWith(0));
        await vi.waitFor(() => expect(history.state).toMatchObject({ page: 3, index: 3 }));
        // The return trip is not a move of its own.
        expect(onMove).toHaveBeenCalledTimes(1);
    });

    it('records where onMove went instead', async () => {
        const nav = createHistory({
            sessionId: SID,
            onMove: () => {
                nav.replace(7);
                return true;
            },
        });
        nav.start(5);
        nav.push(6);
        const landed = traversed();
        history.back();
        await landed;
        expect(history.state).toMatchObject({ page: 7, index: 0 });
    });

    it('stays on the current view for entries of an earlier session', async () => {
        history.replaceState({ app: 'unlock-the-lab', session: 'old', page: 9, index: 0 }, '');
        history.pushState({ app: 'unlock-the-lab', session: 'old', page: 10, index: 1 }, '');
        const onMove = vi.fn(() => true);
        const nav = createHistory({ sessionId: SID, onMove });
        nav.start(0);
        const landed = traversed();
        history.back();
        await landed;
        expect(onMove).not.toHaveBeenCalled();
        expect(history.state).toMatchObject({ session: SID, page: 0, index: 0 });
    });
});
