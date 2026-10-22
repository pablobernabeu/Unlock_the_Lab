/**
 * Admin panel (admin.html). Email and password sign-in runs on a separate
 * Firebase app named 'admin', so it never replaces a participant's anonymous
 * user in the same browser, and lasts only for the browser tab. Access needs
 * an /admins/{uid} entry: the same check the database rules make for every
 * admin write. Anyone else is told why and signed out.
 */
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { APP_VERSION } from '../lib/config.js';
import { el, ensureLiveRegions, focusHeading, qs, setText } from '../lib/dom.js';
import { createAdminApp } from '../lib/firebase.js';
import { applyTranslations, initI18n, t } from '../lib/i18n.js';
import { renderLocaleSwitcher } from '../lib/locale-switcher.js';
import { initMotion } from '../lib/motion.js';
import { isAdmin } from './data.js';
import { isPermissionDenied } from './errors.js';
import { createLoginForm } from './login.js';
import { createPanel } from './panel.js';
import { createStatus, whileBusy } from './ui.js';

/** Wait before checking /admins again after a refused first read. */
const ADMIN_CHECK_RETRY_MS = 1000;

const page = {
    heading: qs('[data-page-heading]'),
    status: createStatus(qs('[data-app-status]')),
    actions: qs('[data-app-actions]'),
    login: qs('[data-login]'),
    loginHeading: qs('#login-heading'),
    panel: qs('[data-panel]'),
    account: qs('[data-account-email]'),
    signOut: qs('[data-sign-out]'),
};

/** Shows the sign-in form, the panel or neither (while checking or after an error). */
function showView(view) {
    page.login.hidden = view !== 'login';
    page.panel.hidden = view !== 'panel';
}

/**
 * Offers buttons under the page status, such as 'Try again'.
 * @param {Array<{label: string, run: () => Promise<unknown>, primary?: boolean}>} actions
 */
function showActions(actions) {
    page.actions.replaceChildren(
        ...actions.map(({ label, run, primary }) =>
            el(
                'button',
                {
                    type: 'button',
                    class: `btn ${primary ? 'btn-primary' : 'btn-secondary'}`,
                    onClick: (event) => whileBusy(event.currentTarget, run),
                },
                label
            )
        )
    );
    page.actions.hidden = actions.length === 0;
}

function renderStaticCopy() {
    setText(qs('[data-footer-version]'), t('common.footer.version', { version: APP_VERSION }));
    renderLocaleSwitcher(qs('[data-locale-switcher]'));
}

/**
 * True when the account is listed under /admins. A refused first read can
 * mean the database has not seen the new sign-in yet, so it is tried once more.
 */
async function checkAdmin(db, uid) {
    try {
        return await isAdmin(db, uid);
    } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, ADMIN_CHECK_RETRY_MS));
        return isAdmin(db, uid).catch((retryError) => {
            if (isPermissionDenied(retryError)) return false;
            throw retryError;
        });
    }
}

/**
 * Follows the admin app's sign-in state: the form when signed out, the panel
 * for administrators, an explanation and sign-out for anyone else.
 */
function startAccess({ auth, db }) {
    const panel = createPanel(page.panel, { db });
    const login = createLoginForm(page.login, {
        signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    });
    let generation = 0;
    let notice = null;

    async function signOutWith(nextNotice) {
        notice = nextNotice;
        try {
            await signOut(auth);
        } catch (error) {
            console.error('[admin] sign-out', error);
            notice = null;
            page.status.show(t('common.errors.generic'), 'error');
        }
    }

    function showLogin() {
        panel.stop();
        showActions([]);
        login.reset();
        showView('login');
        const shown = notice;
        notice = null;
        if (shown?.kind === 'notAdmin') login.showNotAdmin(shown.uid);
        if (shown?.kind === 'signedOut') page.status.show(t('admin.account.signedOut'), 'success');
        else page.status.clear();
        if (shown) focusHeading(page.loginHeading);
    }

    function showPanel(user) {
        page.status.clear();
        showActions([]);
        setText(page.account, t('admin.account.signedInAs', { email: user.email ?? user.uid }));
        showView('panel');
        panel.start();
        focusHeading(page.heading);
    }

    function showCheckFailed(user) {
        page.status.show(t('admin.status.checkFailed'), 'error');
        showActions([
            { label: t('common.errors.retry'), run: () => handleUser(user), primary: true },
            { label: t('admin.account.signOut'), run: () => signOutWith(null) },
        ]);
    }

    async function handleUser(user) {
        const current = ++generation;
        if (!user) {
            showLogin();
            return;
        }
        panel.stop();
        showView(null);
        showActions([]);
        page.status.show(t('admin.status.checking'));
        let admin;
        try {
            admin = !user.isAnonymous && (await checkAdmin(db, user.uid));
        } catch (error) {
            console.error('[admin] access check', error);
            if (current === generation) showCheckFailed(user);
            return;
        }
        if (current !== generation) return;
        if (admin) showPanel(user);
        else await signOutWith({ kind: 'notAdmin', uid: user.uid });
    }

    page.signOut.addEventListener('click', () =>
        whileBusy(page.signOut, () => signOutWith({ kind: 'signedOut' }))
    );
    onAuthStateChanged(auth, handleUser);
}

async function connect() {
    showActions([]);
    page.status.show(t('admin.status.starting'));
    let firebase;
    try {
        firebase = await createAdminApp();
    } catch (error) {
        console.error('[admin] Firebase', error);
        page.status.show(t('admin.status.loadFailed'), 'error');
        showActions([{ label: t('common.errors.retry'), run: connect, primary: true }]);
        return;
    }
    startAccess(firebase);
}

async function start() {
    initMotion();
    ensureLiveRegions();
    try {
        await initI18n({ namespaces: ['admin'] });
        applyTranslations();
    } catch (error) {
        // The English text prerendered into the page stays in place.
        console.warn('[i18n] Could not load translations', error);
    }
    renderStaticCopy();
    await connect();
}

start();
