// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fake, settle } from './fake-database.js';

vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
vi.mock('firebase/auth', () => import('./fake-database.js').then((m) => m.authModule));
vi.mock('../../../src/lib/firebase.js', () =>
    import('./fake-database.js').then((m) => m.firebaseModule)
);

/** The session lifecycle is replaced by a stub the tests drive (see session.test.js for it). */
const control = vi.hoisted(() => ({ options: null, session: null, started: null }));
vi.mock('../../../src/app/session.js', () => ({
    createSession: (options) => {
        control.options = options;
        control.session = {
            closed: false,
            paused: false,
            // A test can hold the start (and its control check) with control.started.
            start: vi.fn(() => control.started ?? Promise.resolve()),
            finish: vi.fn(),
            end: vi.fn(async () => {
                control.session.closed = true;
            }),
            resume: vi.fn(),
            ensureUsername: vi.fn(async () => {}),
            keepAlive: vi.fn(),
            syncLeaderboard: vi.fn(async () => {}),
            whenReady: vi.fn(async () => ({ uid: 'uid-1' })),
        };
        return control.session;
    },
}));

const { STORAGE_KEYS } = await import('../../../src/lib/config.js');
const { initI18n } = await import('../../../src/lib/i18n.js');
const { seededShuffle } = await import('../../../src/lib/shuffle.js');
const { startParticipantApp } = await import('../../../src/app/participant.js');
const { createState, resultsPage, studyPage, weightsPage } =
    await import('../../../src/app/state.js');

const SID = 'session_1800000000000_abc123';
const STUDIES = Array.from({ length: 48 }, (_, index) => ({
    id: `STUDY-${index + 1}`,
    title: `Study title ${index + 1}`,
    access: 'Open access.',
    source: 'A journal.',
    overview: 'A theory.',
    methods: 'Some methods.',
    conclusion: 'A conclusion.',
    expertRating: 4,
    feedback: { summary: 'A summary.', criteria: {} },
}));
const ORDER = seededShuffle(STUDIES, SID);
const INDEX_HTML = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../index.html'),
    'utf8'
);

beforeAll(async () => {
    await initI18n({ namespaces: ['app'] });
});

/** Window listeners each app adds, removed after its test so that apps never overlap. */
const windowListeners = [];
const addWindowListener = window.addEventListener.bind(window);
window.addEventListener = (type, listener, options) => {
    windowListeners.push([type, listener, options]);
    addWindowListener(type, listener, options);
};

const reload = vi.fn();

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
    control.started = null;
    localStorage.clear();
    history.replaceState(null, '');
    const page = new DOMParser().parseFromString(INDEX_HTML, 'text/html');
    document.body.replaceWith(document.importNode(page.body, true));
    window.scrollTo = () => {};
    vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
    vi.useRealTimers();
    for (const [type, listener, options] of windowListeners.splice(0)) {
        window.removeEventListener(type, listener, options);
    }
});

/** Starts the app and lets its start-up (the session's control check) finish. */
async function startApp() {
    startParticipantApp({ content: { studies: STUDIES }, logo: { celebrate: () => {} }, reload });
    await settle();
}

/** Saves a session in this browser that has rated the first `count` studies of its order. */
function saveSession(count, changes = {}) {
    const ids = ORDER.slice(0, count).map((study) => study.id);
    const state = {
        ...createState({ sessionId: SID, userName: 'Curious Otter 42' }),
        currentPage: studyPage(count),
        userRatings: Object.fromEntries(ids.map((id) => [id, 4])),
        userPredictions: Object.fromEntries(ids.map((id) => [id, 4])),
        paperScores: Object.fromEntries(ids.map((id) => [id, 100])),
        totalScore: count * 100,
        joinedAt: fake.now - 60_000,
        ...changes,
    };
    localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
}

const storedState = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.state));
const view = (id) => document.getElementById(id);
const buttonNamed = (root, name) =>
    [...root.querySelectorAll('button')].find((button) => button.textContent.includes(name));

/** Answers the study on screen and submits, with its rating write held until released. */
async function submitHeld(studyIndex) {
    const release = fake.hold('set', `ratings/${ORDER[studyIndex].id}/${SID}`);
    view('view-study').querySelector('#prediction-4').checked = true;
    view('view-study').querySelector('#rating-4').checked = true;
    const form = view('view-study').querySelector('form');
    form.dispatchEvent(new Event('change', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(fake.writesTo('set', `ratings/${ORDER[studyIndex].id}/${SID}`)).toHaveLength(1);
    return release;
}

describe('startParticipantApp', () => {
    it('keeps the study view as it is while a rating saves, and shows its feedback after', async () => {
        saveSession(11);
        await startApp();
        const study = view('view-study');
        const back = buttonNamed(study, 'Back to the previous study');
        const finish = buttonNamed(study, 'Finish and see my results');
        expect(back.getAttribute('aria-disabled')).toBeNull();

        const release = await submitHeld(11);
        expect(back.getAttribute('aria-disabled')).toBe('true');
        expect(finish.getAttribute('aria-disabled')).toBe('true');
        back.click();
        expect(storedState().currentPage).toBe(studyPage(11));
        expect(study.querySelector('#study-title').textContent).toBe(ORDER[11].title);

        release();
        await settle();
        expect(storedState().userRatings).toHaveProperty(ORDER[11].id, 4);
        expect(study.querySelector('#feedback-heading')).not.toBeNull();
        expect(document.activeElement).toBe(study.querySelector('#feedback-heading'));
        expect(back.getAttribute('aria-disabled')).toBeNull();
        expect(buttonNamed(study, 'Finish and see my results')).toBeDefined();
    });

    it('redraws the closed view when a rating saved during the ending lands', async () => {
        saveSession(9);
        await startApp();
        const release = await submitHeld(9);

        control.session.closed = true;
        control.options.onClosed();
        expect(view('view-message').hidden).toBe(false);
        expect(buttonNamed(view('view-message'), 'See my results')).toBeUndefined();

        release();
        await settle();
        expect(control.session.syncLeaderboard).toHaveBeenCalled();
        expect(view('view-message').hidden).toBe(false);
        expect(view('view-study').hidden).toBe(true);
        expect(buttonNamed(view('view-message'), 'See my results')).toBeDefined();
        expect(document.getElementById('score-banner').hidden).toBe(true);
    });

    it('keeps the weights that were stored when an earlier save landed after timing out', async () => {
        const first = { title: 20, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 };
        const second = { title: 10, access: 0, source: 0, theory: 0, methods: 10, conclusion: 0 };
        saveSession(10, { currentPage: weightsPage(48), criterionTokens: second });
        fake.write(`rankings/${SID}`, { ...first, uid: 'uid-1' });
        fake.refuse('set', `rankings/${SID}`);
        await startApp();

        buttonNamed(view('view-weights'), 'Save and see my results').click();
        await settle();
        expect(storedState()).toMatchObject({ rankingSubmitted: true, criterionTokens: first });
        expect(view('view-results').hidden).toBe(false);
        expect(document.querySelector('.toast')?.textContent).toContain('earlier weights');
    });

    it('does not save the old session again once a new participant is starting', async () => {
        saveSession(2, { joinedAt: null });
        await startApp();
        let finishEnd;
        control.session.end.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishEnd = resolve;
                })
        );
        control.options.onProblem('claimed');
        buttonNamed(document.getElementById('app-notice'), 'Start as a new participant').click();
        await settle();
        // The old session's connection finishes while it is being cleared.
        control.options.patch({ joinedAt: fake.now });
        finishEnd();
        await settle();
        control.options.patch({ joinedAt: fake.now });
        expect(localStorage.getItem(STORAGE_KEYS.state)).toBeNull();
    });

    it('keeps an earlier allocation stored by version 1 and the new one in this browser only', async () => {
        const v1Record = {
            ...{ title: 5, access: 5, source: 5, theory: 5, methods: 0, conclusion: 0 },
            userName: 'Curious Otter 42',
            timestamp: 1_700_000_000_000,
        };
        const chosen = { title: 10, access: 0, source: 0, theory: 0, methods: 10, conclusion: 0 };
        saveSession(10, { currentPage: weightsPage(48), criterionTokens: chosen });
        fake.write(`rankings/${SID}`, v1Record);
        fake.refuse('set', `rankings/${SID}`);
        await startApp();

        buttonNamed(view('view-weights'), 'Save and see my results').click();
        await settle();
        expect(view('view-results').hidden).toBe(false);
        expect(storedState()).toMatchObject({
            rankingSubmitted: true,
            rankingKeptLocally: true,
            criterionTokens: chosen,
        });
        expect(fake.read(`rankings/${SID}`)).toEqual(v1Record);
        const notice = document.querySelector('[data-notice="weightsNotSaved"]');
        expect(notice.textContent).toContain('Your weights could not be saved');
        expect(view('view-results').textContent).toContain('kept in this browser only');
        // Methods and Title have 10 tokens each: the participant's own choice is shown.
        expect(view('view-results').textContent).toContain('10 of 20 tokens');
    });
});

describe('start-up of a resumed session', () => {
    it('shows the loading message, never the study form, until the control check is done', async () => {
        saveSession(3);
        let finishStart;
        control.started = new Promise((resolve) => {
            finishStart = resolve;
        });
        await startApp();
        expect(document.getElementById('app-loading').hidden).toBe(false);
        expect(view('view-study').hidden).toBe(true);
        expect(view('view-study').querySelector('input')).toBeNull();
        expect(document.getElementById('score-banner').hidden).toBe(true);

        // The check finds that the facilitator has closed the session.
        control.session.closed = true;
        control.options.onClosed();
        finishStart();
        await settle();
        expect(view('view-message').hidden).toBe(false);
        expect(view('view-study').querySelector('input')).toBeNull();
        expect(document.getElementById('app-loading').hidden).toBe(true);
    });

    it('shows the study once the control check finds the session open', async () => {
        saveSession(3);
        let finishStart;
        control.started = new Promise((resolve) => {
            finishStart = resolve;
        });
        await startApp();
        expect(view('view-study').querySelector('input')).toBeNull();
        finishStart();
        await settle();
        expect(view('view-study').hidden).toBe(false);
        expect(view('view-study').querySelector('#study-title').textContent).toBe(ORDER[3].title);
        expect(document.getElementById('score-banner').hidden).toBe(false);
    });

    it('does not wait for the check on the welcome page or the results page', async () => {
        control.started = new Promise(() => {});
        saveSession(10, { currentPage: resultsPage(48), rankingSubmitted: true });
        await startApp();
        expect(view('view-results').hidden).toBe(false);
    });
});

/** An entry as the app writes it, for a page of this session. */
const entry = (page, index) => ({ app: 'unlock-the-lab', session: SID, page, index });

const toastText = () => document.querySelector('.toast')?.textContent ?? '';

describe("the browser's Back and Forward buttons", () => {
    it('add one entry per view and take the one-time step back, as the in-app button does', async () => {
        saveSession(3, { currentPage: studyPage(2) });
        const length = history.length;
        await startApp();
        expect(history.length).toBe(length);
        expect(history.state).toMatchObject(entry(studyPage(2), 0));

        buttonNamed(view('view-study'), 'Next study').click();
        expect(history.state).toMatchObject(entry(studyPage(3), 1));
        expect(history.length).toBe(length + 1);

        history.back();
        await vi.waitFor(() => expect(storedState().currentPage).toBe(studyPage(2)));
        expect(storedState().hasUsedBackButton).toBe(true);
        expect(view('view-study').querySelector('#study-title').textContent).toBe(ORDER[2].title);
        expect(document.activeElement).toBe(view('view-study').querySelector('h1'));
        expect(document.title).toBe(`Study 3 of 48 – Unlock the Lab`);

        // Forward again: the study passed on the way is answered.
        history.forward();
        await vi.waitFor(() => expect(storedState().currentPage).toBe(studyPage(3)));
        expect(buttonNamed(view('view-study'), 'Back to the previous study')).toBeUndefined();

        // The step back is used up: the view stays and says why.
        history.back();
        await vi.waitFor(() => expect(toastText()).toContain('You have already gone back once'));
        await vi.waitFor(() => expect(history.state).toMatchObject(entry(studyPage(3), 1)));
        expect(storedState().currentPage).toBe(studyPage(3));
        expect(view('view-study').querySelector('#study-title').textContent).toBe(ORDER[3].title);
    });

    it('goes back from the weights page to rating, where Go back to rating studies goes', async () => {
        history.replaceState(entry(studyPage(10), 0), '');
        history.pushState(entry(weightsPage(48), 1), '');
        saveSession(10, { currentPage: weightsPage(48), finishedFromPage: studyPage(10) });
        await startApp();

        history.back();
        await vi.waitFor(() => expect(storedState().currentPage).toBe(studyPage(10)));
        expect(view('view-study').hidden).toBe(false);
        expect(storedState().hasUsedBackButton).toBe(false);
    });

    it('keeps the results page where it is and says why', async () => {
        history.replaceState(entry(weightsPage(48), 0), '');
        history.pushState(entry(resultsPage(48), 1), '');
        saveSession(10, { currentPage: resultsPage(48), rankingSubmitted: true });
        await startApp();

        history.back();
        await vi.waitFor(() => expect(toastText()).toContain('your results stay on this page'));
        await vi.waitFor(() => expect(history.state).toMatchObject(entry(resultsPage(48), 1)));
        expect(view('view-results').hidden).toBe(false);
        expect(storedState().currentPage).toBe(resultsPage(48));
    });

    it('keeps the closed view where it is and says why', async () => {
        saveSession(3, { currentPage: studyPage(2) });
        await startApp();
        buttonNamed(view('view-study'), 'Next study').click();
        control.session.closed = true;
        control.options.onClosed();

        history.back();
        await vi.waitFor(() => expect(toastText()).toContain('The facilitator has closed'));
        expect(view('view-message').hidden).toBe(false);
        expect(storedState()).toMatchObject({
            currentPage: studyPage(3),
            hasUsedBackButton: false,
        });
    });

    it('waits while answers are being saved', async () => {
        saveSession(3, { currentPage: studyPage(2) });
        await startApp();
        buttonNamed(view('view-study'), 'Next study').click();
        const release = await submitHeld(3);

        history.back();
        await vi.waitFor(() => expect(toastText()).toContain('Still saving'));
        expect(storedState().currentPage).toBe(studyPage(3));
        release();
        await settle();
        expect(view('view-study').querySelector('#feedback-heading')).not.toBeNull();
    });
});

/** Saves `state` as another tab of this browser would, and tells this tab about it. */
function saveInOtherTab(state) {
    const value = state === null ? null : JSON.stringify(state);
    if (value === null) localStorage.removeItem(STORAGE_KEYS.state);
    else localStorage.setItem(STORAGE_KEYS.state, value);
    window.dispatchEvent(
        new StorageEvent('storage', {
            key: STORAGE_KEYS.state,
            newValue: value,
            storageArea: localStorage,
        })
    );
}

describe('another tab of the same session', () => {
    it('shows the progress another tab has saved', async () => {
        saveSession(3);
        await startApp();
        expect(view('view-study').querySelector('.answers')).not.toBeNull();

        // The other tab answers this study.
        const answered = {
            ...storedState(),
            userRatings: { ...storedState().userRatings, [ORDER[3].id]: 5 },
            userPredictions: { ...storedState().userPredictions, [ORDER[3].id]: 5 },
            paperScores: { ...storedState().paperScores, [ORDER[3].id]: 76 },
            totalScore: 376,
        };
        saveInOtherTab(answered);
        expect(view('view-study').querySelector('.answers')).toBeNull();
        expect(view('view-study').querySelector('#feedback-heading').textContent).toContain('76');
        expect(document.getElementById('banner-rated').textContent).toBe('4 of 48');

        // ...and moves on to the next study.
        saveInOtherTab({ ...answered, currentPage: studyPage(4) });
        expect(view('view-study').querySelector('#study-title').textContent).toBe(ORDER[4].title);
        expect(history.state).toMatchObject({ page: studyPage(4) });
    });

    it('never saves an older copy over newer progress', async () => {
        saveSession(3, { currentPage: studyPage(2) });
        await startApp();
        // The other tab has answered study 4 and moved on; its storage event is still on its way.
        const newer = {
            ...storedState(),
            currentPage: studyPage(4),
            userRatings: { ...storedState().userRatings, [ORDER[3].id]: 5 },
            userPredictions: { ...storedState().userPredictions, [ORDER[3].id]: 5 },
            paperScores: { ...storedState().paperScores, [ORDER[3].id]: 76 },
            totalScore: 376,
        };
        localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(newer));

        // This tab, still on study 3, moves to study 4 with its own button.
        buttonNamed(view('view-study'), 'Next study').click();
        expect(storedState()).toMatchObject({ currentPage: studyPage(3), totalScore: 376 });
        expect(storedState().userRatings).toHaveProperty(ORDER[3].id, 5);
    });

    it('saves progress that the other tab had not seen', async () => {
        saveSession(3);
        await startApp();
        const behind = { ...storedState(), hasUsedBackButton: false };
        delete behind.userRatings[ORDER[2].id];
        saveInOtherTab({ ...behind, criterionTokens: storedState().criterionTokens });
        expect(storedState().userRatings).toHaveProperty(ORDER[2].id, 4);
        expect(storedState().totalScore).toBe(300);
    });

    it('shows the weights another tab has changed, and saves on top of them', async () => {
        saveSession(10, { currentPage: weightsPage(48), finishedFromPage: studyPage(10) });
        await startApp();
        const count = (key) => document.getElementById(`weight-${key}-count`).textContent;
        expect(count('methods')).toBe('0 tokens');

        const tokens = { title: 2, access: 0, source: 0, theory: 0, methods: 7, conclusion: 0 };
        saveInOtherTab({ ...storedState(), criterionTokens: tokens });
        expect(count('methods')).toBe('7 tokens');
        expect(document.querySelector('.weights-total__text').textContent).toBe(
            '9 of 20 tokens used'
        );

        view('view-weights').querySelector('[aria-label="Add a token to Title"]').click();
        expect(storedState().criterionTokens).toEqual({ ...tokens, title: 3 });
    });

    it('starts again when another tab starts a new participant', async () => {
        saveSession(3);
        await startApp();
        saveInOtherTab(null);
        expect(reload).toHaveBeenCalledTimes(1);
        // Nothing from this tab brings the old session back.
        control.options.patch({ joinedAt: fake.now });
        expect(localStorage.getItem(STORAGE_KEYS.state)).toBeNull();
    });

    it('starts again when another tab has begun a different session', async () => {
        saveSession(3);
        await startApp();
        const other = {
            ...createState({ sessionId: 'session_1800000000001_other1' }),
            currentPage: 1,
        };
        saveInOtherTab(other);
        expect(reload).toHaveBeenCalledTimes(1);
        control.options.patch({ joinedAt: fake.now });
        expect(storedState().sessionId).toBe(other.sessionId);
    });
});
