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
const control = vi.hoisted(() => ({ options: null, session: null }));
vi.mock('../../../src/app/session.js', () => ({
    createSession: (options) => {
        control.options = options;
        control.session = {
            closed: false,
            start: vi.fn(async () => {}),
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
const { createState, studyPage, weightsPage } = await import('../../../src/app/state.js');

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

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
    localStorage.clear();
    const page = new DOMParser().parseFromString(INDEX_HTML, 'text/html');
    document.body.replaceWith(document.importNode(page.body, true));
    window.scrollTo = () => {};
    vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
    vi.useRealTimers();
});

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
        startParticipantApp({ content: { studies: STUDIES }, logo: { celebrate: () => {} } });
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
        startParticipantApp({ content: { studies: STUDIES }, logo: { celebrate: () => {} } });
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
        startParticipantApp({ content: { studies: STUDIES }, logo: { celebrate: () => {} } });

        buttonNamed(view('view-weights'), 'Save and see my results').click();
        await settle();
        expect(storedState()).toMatchObject({ rankingSubmitted: true, criterionTokens: first });
        expect(view('view-results').hidden).toBe(false);
        expect(document.querySelector('.toast')?.textContent).toContain('earlier weights');
    });

    it('does not save the old session again once a new participant is starting', async () => {
        saveSession(2, { joinedAt: null });
        startParticipantApp({ content: { studies: STUDIES }, logo: { celebrate: () => {} } });
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
});
