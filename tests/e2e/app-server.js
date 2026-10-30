// The server for the end-to-end build (playwright.config.js). It uses its own
// port and folder (dist-e2e/), not those of `vite preview` (4173, dist/), so a
// production build left running there is never mistaken for the test build.

/** Port of scripts/serve-dist.mjs serving the test build. */
export const APP_PORT = 4317;

export const APP_URL = `http://127.0.0.1:${APP_PORT}`;

/** The database emulator origin, which only a test server adds to the CSP. */
const EMULATOR_ORIGIN = 'http://127.0.0.1:9000';

/**
 * Fails unless APP_URL serves the test build. Locally Playwright reuses
 * whatever already answers on the port, and a production build there would
 * send the tests' sign-ins and writes to the live database. Only
 * `serve-dist.mjs --emulators` (which serves dist-e2e/) adds the emulator
 * origins to the Content Security Policy.
 * @returns {Promise<void>}
 */
export async function assertTestBuildServed() {
    let response;
    try {
        response = await fetch(`${APP_URL}/`);
    } catch (error) {
        throw new Error(`Nothing answered on ${APP_URL}: ${error.message}`, { cause: error });
    }
    const policy = response.headers.get('content-security-policy') ?? '';
    if (!policy.split(/[\s;]+/).includes(EMULATOR_ORIGIN)) {
        throw new Error(
            `Port ${APP_PORT} is not serving the end-to-end test build (its Content Security ` +
                `Policy does not allow ${EMULATOR_ORIGIN}). Stop whatever serves that port and ` +
                'run the tests again.'
        );
    }
}
