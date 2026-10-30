#!/usr/bin/env node
// Backs up the participant data in the Realtime Database through its public REST API
// (GET requests only). Used by .github/workflows/backup.yml; see docs/data.md.
//
//   node scripts/backup.mjs --out <dir> [--dry-run] [--allow-empty]
//
// FIREBASE_DATABASE_URL overrides the database, for example the local emulator
// (the app keeps its data in the namespace named after the production instance):
//   FIREBASE_DATABASE_URL='http://127.0.0.1:9000/?ns=unlock-the-lab-workshop-default-rtdb' node scripts/backup.mjs --out tmp
//
// Once App Check is enforced for the database, set FIREBASE_APPCHECK_DEBUG_TOKEN to a debug
// token registered for the web app: the script exchanges it for an App Check token and sends
// that with every read (see 'Firebase App Check' in docs/deployment.md).
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const DEFAULT_DATABASE_URL =
    'https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app';

/** The web app that App Check tokens are issued for: public values from src/lib/firebase-config.js. */
export const APP_CHECK_APP = Object.freeze({
    projectId: 'unlock-the-lab-workshop',
    appId: '1:604889899913:web:d46afe88111e8bcb7d3758',
    apiKey: 'AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4',
});

/** The App Check API, as the Firebase web SDK calls it (@firebase/app-check). */
export const APP_CHECK_ENDPOINT = 'https://content-firebaseappcheck.googleapis.com/v1';

/** The live site, sent as the referrer so that a browser key restricted to it still works. */
export const SITE_URL = 'https://unlock-the-lab.web.app/';

// /active is left out on purpose: it is short-lived presence data.
export const NODES = ['ratings', 'leaderboard', 'rankings', 'sessions'];
export const INFO_FILE = 'backup-info.json';

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000];
const REQUEST_TIMEOUT_MS = 30_000;

const USAGE = `Usage: node scripts/backup.mjs --out <dir> [--dry-run] [--allow-empty]

  --out <dir>     directory for ${NODES.map((node) => `${node}.json`).join(', ')} and ${INFO_FILE}
  --dry-run       fetch and compare, but write nothing
  --allow-empty   allow an empty node to replace a backup file that holds data

Reads from FIREBASE_DATABASE_URL (default ${DEFAULT_DATABASE_URL}). With
FIREBASE_APPCHECK_DEBUG_TOKEN set, every read carries an App Check token.`;

/** Natural key order ('STUDY-2' before 'STUDY-10'), with code-unit order as the tiebreak. */
export function compareKeys(a, b) {
    const partsA = a.match(/\d+|\D+/g) ?? [];
    const partsB = b.match(/\d+|\D+/g) ?? [];
    const length = Math.min(partsA.length, partsB.length);
    for (let i = 0; i < length; i += 1) {
        const difference = compareParts(partsA[i], partsB[i]);
        if (difference !== 0) return difference;
    }
    return partsA.length - partsB.length || compareCodeUnits(a, b);
}

function compareParts(a, b) {
    const bothNumeric = /^\d/.test(a) && /^\d/.test(b);
    if (!bothNumeric) return compareCodeUnits(a, b);
    const trimmedA = a.replace(/^0+(?=\d)/, '');
    const trimmedB = b.replace(/^0+(?=\d)/, '');
    return trimmedA.length - trimmedB.length || compareCodeUnits(trimmedA, trimmedB);
}

function compareCodeUnits(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}

/**
 * A copy of a JSON value with every object's keys in compareKeys order.
 * @param {unknown} value
 * @returns {unknown}
 */
export function sortKeysDeep(value) {
    if (Array.isArray(value)) return value.map(sortKeysDeep);
    if (value === null || typeof value !== 'object') return value;
    const sorted = {};
    for (const key of Object.keys(value).sort(compareKeys)) {
        sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
}

/** Pretty JSON with sorted keys, so that unchanged data always produces identical files. */
export function serialise(value) {
    return `${JSON.stringify(sortKeysDeep(value ?? null), null, 2)}\n`;
}

/**
 * True for what the database returns for a missing or empty node.
 * @param {unknown} value
 * @returns {boolean} true for null, undefined, {} and []
 */
export function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    return typeof value === 'object' && Object.keys(value).length === 0;
}

/** True when a backup file holds data. Unreadable content counts as data, to be safe. */
export function fileHasData(text) {
    if (text === null || text.trim() === '') return false;
    try {
        return !isEmptyValue(JSON.parse(text));
    } catch {
        return true;
    }
}

/** Records per node: ratings are nested by study, the other nodes are keyed by session. */
export function countRecords(node, value) {
    if (isEmptyValue(value) || typeof value !== 'object') return 0;
    if (node !== 'ratings') return Object.keys(value).length;
    return Object.values(value).reduce((total, study) => {
        return total + (study && typeof study === 'object' ? Object.keys(study).length : 0);
    }, 0);
}

/** A key that the Firebase web SDK cannot read (see reservedKeyPaths). */
export const RESERVED_KEY = 'hasOwnProperty';

/**
 * Paths of every key named 'hasOwnProperty', at any depth. The Firebase web SDK calls
 * obj.hasOwnProperty(key) on server data, so one such key makes the dashboard, the facilitator
 * panel and the workshop treat the whole node as empty. REST reads, and so the backup, are not
 * affected. The v1 rules let anyone add one; the v2 rules allow none.
 */
export function reservedKeyPaths(node, value) {
    const found = [];
    const walk = (current, at) => {
        if (current === null || typeof current !== 'object') return;
        for (const [key, child] of Object.entries(current)) {
            if (key === RESERVED_KEY) found.push(`${at}/${key}`);
            walk(child, `${at}/${key}`);
        }
    };
    walk(value, `/${node}`);
    return found;
}

/**
 * Decides what a backup run writes. Pure: `fetched` maps node names to database values and
 * `existing` maps file names to their current text (missing files are absent or null).
 */
export function planBackup({
    fetched,
    existing = {},
    allowEmpty = false,
    now = new Date(),
    skipped = [],
}) {
    const counts = {};
    const refused = [];
    const writes = [];

    for (const node of NODES) {
        // A node the database refused to serve keeps its previous backup file untouched.
        if (skipped.includes(node)) {
            counts[node] = null;
            continue;
        }
        const file = `${node}.json`;
        const text = serialise(fetched[node]);
        const previous = existing[file] ?? null;
        counts[node] = countRecords(node, fetched[node]);
        if (previous === text) continue;
        if (isEmptyValue(fetched[node]) && fileHasData(previous) && !allowEmpty) refused.push(node);
        writes.push({ file, text });
    }

    const changed = writes.map((write) => write.file);
    if (writes.length > 0) {
        writes.push({
            file: INFO_FILE,
            text: serialise({ lastBackup: now.toISOString(), counts }),
        });
    }
    return { counts, changed, refused, writes };
}

/**
 * The REST URL of a top-level node, keeping any query such as an emulator's `?ns=`.
 * @param {string} baseUrl the database URL
 * @param {string} node e.g. 'ratings'
 * @returns {URL}
 */
export function nodeUrl(baseUrl, node) {
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${node}.json`;
    return url;
}

class HttpError extends Error {
    constructor(status, body) {
        super(`HTTP ${status}${body ? `: ${body.slice(0, 200)}` : ''}`);
        this.status = status;
    }
}

/** fetchNode wraps the HTTP error, so look at the cause as well. */
function isPermissionDenied(error) {
    const http = error instanceof HttpError ? error : error?.cause;
    return http instanceof HttpError && (http.status === 401 || http.status === 403);
}

// Client errors such as 401 'Permission denied' will not go away by retrying.
function isRetryable(error) {
    if (!(error instanceof HttpError)) return true;
    return error.status === 408 || error.status === 429 || error.status >= 500;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `task`, retrying network failures, timeouts, 408, 429 and 5xx responses after each
 * of `delays`; other HTTP errors fail at once.
 * @template T
 * @param {() => Promise<T>} task
 * @param {object} labels
 * @param {string} labels.failed what could not be done, e.g. 'read /ratings'
 * @param {string} labels.doing the same as a gerund, e.g. 'Reading /ratings'
 * @param {{delays: number[], sleep: (ms: number) => Promise<void>, logger: Pick<Console, 'warn'>}} options
 * @returns {Promise<T>}
 */
async function withRetries(task, { failed, doing }, { delays, sleep, logger }) {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await task();
        } catch (error) {
            if (!isRetryable(error) || attempt > delays.length) {
                throw new Error(`Could not ${failed} (attempt ${attempt}): ${error.message}`, {
                    cause: error,
                });
            }
            const delay = delays[attempt - 1];
            logger.warn(`${doing} failed (${error.message}); retrying in ${delay / 1000} s.`);
            await sleep(delay);
        }
    }
}

/**
 * Exchanges a registered App Check debug token for an App Check token, with the request
 * that the Firebase web SDK makes in debug mode. Retries as fetchNode does.
 * @param {string} debugToken
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {{projectId: string, appId: string, apiKey: string}} [options.app]
 * @param {number[]} [options.delays] ms to wait before each retry
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @param {Pick<Console, 'warn'>} [options.logger]
 * @returns {Promise<string>} the App Check token, for the X-Firebase-AppCheck header
 */
export async function exchangeDebugToken(debugToken, options = {}) {
    const {
        fetchImpl = fetch,
        app = APP_CHECK_APP,
        delays = RETRY_DELAYS_MS,
        sleep = wait,
        logger = console,
    } = options;
    const url =
        `${APP_CHECK_ENDPOINT}/projects/${app.projectId}/apps/${app.appId}:exchangeDebugToken` +
        `?key=${app.apiKey}`;
    try {
        return await withRetries(
            async () => {
                const response = await fetchImpl(url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json', referer: SITE_URL },
                    body: JSON.stringify({ debug_token: debugToken }),
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
                if (!response.ok) throw new HttpError(response.status, await response.text());
                const { token } = await response.json();
                if (typeof token !== 'string' || token === '') {
                    throw new Error('the response held no token');
                }
                return token;
            },
            { failed: 'get an App Check token', doing: 'Getting an App Check token' },
            { delays, sleep, logger }
        );
    } catch (error) {
        throw new Error(
            `${error.message}. Check that FIREBASE_APPCHECK_DEBUG_TOKEN is registered as a ` +
                'debug token of the web app (docs/deployment.md).',
            { cause: error }
        );
    }
}

/**
 * Reads one node, retrying network failures, timeouts, 408, 429 and 5xx
 * responses after each of `delays`; other HTTP errors fail at once.
 * @param {string} baseUrl the database URL
 * @param {string} node e.g. 'ratings'
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number[]} [options.delays] ms to wait before each retry
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @param {Pick<Console, 'warn'>} [options.logger]
 * @param {string|null} [options.appCheckToken] sent as X-Firebase-AppCheck when given
 * @returns {Promise<unknown>} the node's value (null when it is empty)
 */
export async function fetchNode(baseUrl, node, options = {}) {
    const {
        fetchImpl = fetch,
        delays = RETRY_DELAYS_MS,
        sleep = wait,
        logger = console,
        appCheckToken = null,
    } = options;
    const url = nodeUrl(baseUrl, node);
    const headers = { accept: 'application/json' };
    if (appCheckToken) headers['x-firebase-appcheck'] = appCheckToken;

    return withRetries(
        async () => {
            const response = await fetchImpl(url, {
                headers,
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (!response.ok) throw new HttpError(response.status, await response.text());
            return await response.json();
        },
        { failed: `read /${node}`, doing: `Reading /${node}` },
        { delays, sleep, logger }
    );
}

async function readExisting(outDir) {
    const existing = {};
    for (const file of [...NODES.map((node) => `${node}.json`), INFO_FILE]) {
        try {
            existing[file] = await readFile(path.join(outDir, file), 'utf8');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            existing[file] = null;
        }
    }
    return existing;
}

async function writeAtomically(file, text) {
    const temporary = `${file}.tmp`;
    await writeFile(temporary, text, 'utf8');
    await rename(temporary, file);
}

/**
 * Parses the command line; unknown options throw.
 * @param {string[]} argv the arguments after the script name
 * @returns {{outDir: string|undefined, dryRun: boolean, allowEmpty: boolean, help: boolean}}
 */
export function parseOptions(argv) {
    const { values } = parseArgs({
        args: argv,
        options: {
            out: { type: 'string' },
            'dry-run': { type: 'boolean', default: false },
            'allow-empty': { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
        strict: true,
        allowPositionals: false,
    });
    return {
        outDir: values.out,
        dryRun: values['dry-run'],
        allowEmpty: values['allow-empty'],
        help: values.help,
    };
}

/** Runs one backup and resolves to the process exit code. */
export async function runBackup({
    outDir,
    baseUrl = DEFAULT_DATABASE_URL,
    dryRun = false,
    allowEmpty = false,
    fetchImpl = fetch,
    delays = RETRY_DELAYS_MS,
    now = new Date(),
    logger = console,
    appCheckDebugToken = null,
}) {
    const host = new URL(baseUrl).host;
    logger.log(`Reading ${NODES.join(', ')} from ${host}${dryRun ? ' (dry run)' : ''}.`);
    let appCheckToken = null;
    if (appCheckDebugToken) {
        appCheckToken = await exchangeDebugToken(appCheckDebugToken, { fetchImpl, delays, logger });
        logger.log('Sending an App Check token from FIREBASE_APPCHECK_DEBUG_TOKEN.');
    }

    const fetched = {};
    const skipped = [];
    let refusal = null;
    for (const node of NODES) {
        try {
            fetched[node] = await fetchNode(baseUrl, node, {
                fetchImpl,
                delays,
                logger,
                appCheckToken,
            });
        } catch (error) {
            // The version 1 rules do not let anyone read /sessions, so until the version 2
            // rules are deployed that node is refused while the others can still be saved.
            if (!isPermissionDenied(error)) throw error;
            skipped.push(node);
            refusal = error;
            logger.log(
                `::warning::Reading /${node} was refused (${error.message}), so its backup ` +
                    'is left as it was. Check that the current database rules are deployed.'
            );
        }
    }
    if (skipped.length === NODES.length) throw refusal;

    const plan = planBackup({
        fetched,
        existing: await readExisting(outDir),
        allowEmpty,
        now,
        skipped,
    });
    for (const node of NODES) {
        logger.log(
            `  ${node}: ${skipped.includes(node) ? 'not read' : `${plan.counts[node]} records`}`
        );
    }
    // '::warning::' makes GitHub Actions show the line as an annotation on the run.
    for (const keyPath of NODES.flatMap((node) => reservedKeyPaths(node, fetched[node]))) {
        logger.log(
            `::warning::${keyPath} stops the web app from reading its node. ` +
                'Remove it as docs/deployment.md explains.'
        );
    }

    if (plan.refused.length > 0) {
        logger.error(
            `Refusing to replace existing backups of ${plan.refused.join(', ')} with empty data. ` +
                'If the data really was deleted, run again with --allow-empty (in GitHub, run the ' +
                "'Backup data' workflow by hand with 'Allow empty nodes' ticked). Nothing was written."
        );
        return 1;
    }
    if (plan.changed.length === 0) {
        logger.log('No changes since the last backup.');
        return 0;
    }
    if (dryRun) {
        logger.log(
            `Would write ${plan.writes.map((write) => write.file).join(', ')} to ${outDir}.`
        );
        return 0;
    }

    await mkdir(outDir, { recursive: true });
    for (const { file, text } of plan.writes) {
        await writeAtomically(path.join(outDir, file), text);
    }
    logger.log(`Wrote ${plan.writes.map((write) => write.file).join(', ')} to ${outDir}.`);
    return 0;
}

async function main(argv) {
    let options;
    try {
        options = parseOptions(argv);
    } catch (error) {
        console.error(`${error.message}\n\n${USAGE}`);
        return 1;
    }
    if (options.help) {
        console.log(USAGE);
        return 0;
    }
    if (!options.outDir) {
        console.error(`Missing --out.\n\n${USAGE}`);
        return 1;
    }

    const baseUrl = process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL;
    if (!/^https?:$/.test(new URL(baseUrl).protocol)) {
        console.error(`FIREBASE_DATABASE_URL must be an http(s) URL, not ${baseUrl}`);
        return 1;
    }
    const appCheckDebugToken = process.env.FIREBASE_APPCHECK_DEBUG_TOKEN?.trim() || null;
    return runBackup({ ...options, baseUrl, appCheckDebugToken });
}

// Exit explicitly so that no open handle can keep a scheduled job running.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main(process.argv.slice(2)).then(
        (code) => process.exit(code),
        (error) => {
            console.error(`Backup failed: ${error.message}`);
            process.exit(1);
        }
    );
}
