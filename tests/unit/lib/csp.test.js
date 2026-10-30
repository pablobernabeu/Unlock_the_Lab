import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// The Content Security Policy must let App Check and reCAPTCHA Enterprise work in builds made
// with VITE_APPCHECK_SITE_KEY, and allow no more of Google than they need.

const hosting = JSON.parse(
    readFileSync(new URL('../../../firebase.json', import.meta.url))
).hosting;
const policy = hosting.headers
    .find(({ source }) => source === '**')
    .headers.find(({ key }) => key === 'Content-Security-Policy').value;
const directives = Object.fromEntries(
    policy
        .split(';')
        .map((part) => part.trim().split(/\s+/))
        .map(([name, ...sources]) => [name, sources])
);

/** The URLs the installed App Check SDK uses, read from its own code. */
const sdk = readFileSync(createRequire(import.meta.url).resolve('@firebase/app-check'), 'utf8');
const sdkConstant = (name) => sdk.match(new RegExp(`const ${name} = '([^']+)'`))[1];
const APP_CHECK_ENDPOINT = sdkConstant('BASE_ENDPOINT');
const RECAPTCHA_ENTERPRISE_URL = sdkConstant('RECAPTCHA_ENTERPRISE_URL');

/**
 * Whether a CSP host source with an optional path (no wildcards in the path) allows a URL,
 * as in CSP Level 3: a path ending in '/' matches by prefix, any other path exactly.
 */
function sourceAllows(source, href) {
    const match = source.match(/^(https?|wss?):\/\/(\*\.)?([^/]+)(\/.*)?$/);
    if (!match) return false;
    const [, scheme, wildcard, host, path = ''] = match;
    const url = new URL(href);
    if (url.protocol !== `${scheme}:`) return false;
    const hostMatches = wildcard ? url.host.endsWith(`.${host}`) : url.host === host;
    if (!hostMatches) return false;
    if (path === '') return true;
    const urlPath = decodeURIComponent(url.pathname);
    return path.endsWith('/') ? urlPath.startsWith(path) : urlPath === path;
}

const allows = (directive, href) =>
    directives[directive].some((source) => sourceAllows(source, href));

async function webConfig() {
    vi.resetModules();
    for (const name of ['PROJECT_ID', 'APP_ID']) vi.stubEnv(`VITE_FIREBASE_${name}`, '');
    return (await import('../../../src/lib/firebase-config.js')).firebaseConfig;
}

describe('the Content Security Policy for App Check', () => {
    it("lets the SDK exchange tokens for this project's web app only", async () => {
        const { projectId, appId } = await webConfig();
        const exchange = (project, method) =>
            `${APP_CHECK_ENDPOINT}/projects/${project}/apps/${appId}:${method}?key=x`;
        expect(allows('connect-src', exchange(projectId, 'exchangeRecaptchaEnterpriseToken'))).toBe(
            true
        );
        expect(allows('connect-src', exchange(projectId, 'exchangeDebugToken'))).toBe(true);
        expect(allows('connect-src', exchange('another-project', 'exchangeDebugToken'))).toBe(
            false
        );
    });

    it('lets reCAPTCHA Enterprise load its scripts and frames', () => {
        expect(allows('script-src', `${RECAPTCHA_ENTERPRISE_URL}?render=explicit`)).toBe(true);
        expect(
            allows('script-src', 'https://www.gstatic.com/recaptcha/releases/abc/recaptcha__en.js')
        ).toBe(true);
        expect(allows('frame-src', 'https://www.google.com/recaptcha/enterprise/anchor?k=x')).toBe(
            true
        );
        expect(
            allows('frame-src', 'https://recaptcha.google.com/recaptcha/enterprise/bframe')
        ).toBe(true);
    });

    it('allows nothing else from those Google hosts', () => {
        expect(allows('script-src', 'https://www.google.com/maps/api/js')).toBe(false);
        expect(allows('script-src', 'https://www.gstatic.com/firebasejs/app.js')).toBe(false);
        expect(allows('frame-src', 'https://www.google.com/')).toBe(false);
        expect(allows('connect-src', 'https://www.google.com/recaptcha/api2/reload')).toBe(false);
        const googleSources = Object.values(directives)
            .flat()
            .filter((source) => /google\.com|gstatic\.com|firebaseappcheck/.test(source));
        expect(googleSources.length).toBe(5);
        for (const source of googleSources)
            expect(source, source).toMatch(/^https:\/\/[^*/]+\/.+\/$/);
    });

    it('still forbids inline scripts', () => {
        expect(directives['script-src']).not.toContain("'unsafe-inline'");
        expect(directives['script-src']).not.toContain("'unsafe-eval'");
    });
});
