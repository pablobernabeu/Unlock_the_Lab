/**
 * Opt-in Firebase App Check with reCAPTCHA Enterprise, so that the database can
 * refuse requests that do not come from this site's pages (see 'Firebase App
 * Check' in docs/deployment.md). It is on only in builds made with
 * VITE_APPCHECK_SITE_KEY and never with the emulators, which do not check
 * tokens. src/lib/firebase.js imports the SDK only in builds with a site key.
 */

/**
 * @typedef {object} AppCheckSettings
 * @property {string} siteKey the reCAPTCHA Enterprise site key
 * @property {string|null} debugToken a debug token registered in the Firebase
 *   console, used instead of reCAPTCHA (development servers only)
 */

/**
 * Whether and how to start App Check, from the build's variables.
 * @param {object} env
 * @param {string} [env.siteKey] VITE_APPCHECK_SITE_KEY
 * @param {string} [env.debugToken] VITE_APPCHECK_DEBUG_TOKEN
 * @param {boolean} [env.useEmulators] true when the build talks to the local emulators
 * @param {boolean} [env.dev] true for development servers (`npm run dev:live`)
 * @returns {AppCheckSettings|null} null to leave App Check off
 */
export function appCheckSettings({ siteKey, debugToken, useEmulators = false, dev = false }) {
    const key = typeof siteKey === 'string' ? siteKey.trim() : '';
    if (useEmulators || !key) return null;
    // A debug token gets past App Check without reCAPTCHA, so a bundle that people
    // download must never contain one.
    const token = dev && typeof debugToken === 'string' ? debugToken.trim() : '';
    return { siteKey: key, debugToken: token || null };
}

/**
 * Starts App Check for one Firebase app. Call it before the app's database or
 * auth is first used: requests made earlier carry no token, and once App Check
 * is enforced the database refuses them.
 * @param {import('firebase/app').FirebaseApp} app
 * @param {AppCheckSettings|null} settings from appCheckSettings()
 * @param {(() => Promise<typeof import('firebase/app-check')>)|null} loadSdk imports the SDK
 * @returns {Promise<import('firebase/app-check').AppCheck|null>} null when App Check is off
 */
export async function startAppCheck(app, settings, loadSdk) {
    if (!settings || !loadSdk) return null;
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await loadSdk();
    // The SDK reads this global once, when the first app starts App Check.
    if (settings.debugToken) globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = settings.debugToken;
    // One provider per app: a provider keeps a reference to the app it serves.
    return initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(settings.siteKey),
        isTokenAutoRefreshEnabled: true,
    });
}
