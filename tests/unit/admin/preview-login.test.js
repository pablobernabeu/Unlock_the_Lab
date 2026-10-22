// @vitest-environment jsdom
/**
 * The facilitator panel on a pull-request preview build: previews use the
 * live database, so the panel must never sign anyone in there.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { qs } from '../../../src/lib/dom.js';

// A path rather than a file URL: under jsdom, import.meta.url is not a file URL.
const PAGE = readFileSync(resolve(process.cwd(), 'admin.html'), 'utf8');
const BODY = PAGE.slice(PAGE.indexOf('<body>') + '<body>'.length, PAGE.indexOf('</body>'));

const PREVIEW_MESSAGE =
    'The facilitator panel is disabled on preview builds because they use the live database. ' +
    'Use the facilitator panel on the live site instead.';

/** Everything the page asks of Firebase, recorded instead of done. */
const calls = vi.hoisted(() => ({ createAdminApp: 0, signIn: [], authListeners: [] }));

vi.mock('firebase/auth', () => ({
    onAuthStateChanged: (auth, listener) => {
        calls.authListeners.push(listener);
        return () => {};
    },
    signInWithEmailAndPassword: async (auth, email, password) => {
        calls.signIn.push({ email, password });
        return {};
    },
    signOut: async () => {},
}));
vi.mock('../../../src/lib/firebase.js', () => ({
    createAdminApp: async () => {
        calls.createAdminApp += 1;
        return { auth: {}, db: {} };
    },
}));
vi.mock('../../../src/admin/data.js', () => ({ isAdmin: async () => false }));
vi.mock('../../../src/admin/panel.js', () => ({
    createPanel: () => ({ start() {}, stop() {} }),
}));

/** Loads admin.html's script afresh, as a page load would. */
async function loadPage() {
    vi.resetModules();
    await import('../../../src/admin/main.js');
}

function submitLogin() {
    qs('#admin-email').value = 'facilitator@example.com';
    qs('#admin-password').value = 'secret';
    qs('[data-login-form]').dispatchEvent(new Event('submit', { cancelable: true }));
}

beforeEach(() => {
    document.body.innerHTML = BODY;
    calls.createAdminApp = 0;
    calls.signIn.length = 0;
    calls.authListeners.length = 0;
});

describe('admin sign-in', () => {
    it('signs in through the form on a normal build', async () => {
        await loadPage();
        await vi.waitFor(() => expect(calls.authListeners).toHaveLength(1));
        calls.authListeners[0](null);
        expect(qs('[data-login]').hidden).toBe(false);
        submitLogin();
        await vi.waitFor(() => expect(calls.signIn).toHaveLength(1));
        expect(calls.signIn[0].email).toBe('facilitator@example.com');
    });

    it('refuses to sign in on a preview build, and says why', async () => {
        vi.stubEnv('VITE_DEPLOY_TARGET', 'preview');
        await loadPage();
        const status = qs('[data-app-status]');
        await vi.waitFor(() => expect(status.textContent).toBe(PREVIEW_MESSAGE));
        expect(status.dataset.tone).toBe('error');
        expect(status.getAttribute('role')).toBe('status');

        // No sign-in service, no restored sign-in and no form to use.
        expect(calls.createAdminApp).toBe(0);
        expect(calls.authListeners).toHaveLength(0);
        expect(qs('[data-login]').hidden).toBe(true);
        expect(qs('[data-panel]').hidden).toBe(true);
        submitLogin();
        await new Promise((done) => setTimeout(done, 20));
        expect(calls.signIn).toHaveLength(0);
        expect(calls.createAdminApp).toBe(0);
    });
});
