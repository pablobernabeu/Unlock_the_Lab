/**
 * Descriptive statistics for the dashboard and results pages. Pure functions;
 * values that cannot be estimated are null rather than NaN.
 */
import { CRITERION_KEYS, isValidAllocation } from './criteria.js';

/** Above this many degrees of freedom the normal limit is used. */
const NORMAL_LIMIT_DF = 100000;
const Z_975 = 1.959964;

function finiteValues(values) {
    return Array.isArray(values) ? values.filter(Number.isFinite) : [];
}

/**
 * Arithmetic mean.
 * @param {number[]} values non-finite entries are ignored
 * @returns {number | null} null for an empty list
 */
export function mean(values) {
    const usable = finiteValues(values);
    if (usable.length === 0) return null;
    return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

/**
 * Sample standard deviation (n − 1 denominator).
 * @param {number[]} values non-finite entries are ignored
 * @returns {number | null} null when there are fewer than two values
 */
export function sd(values) {
    const usable = finiteValues(values);
    if (usable.length < 2) return null;
    const centre = mean(usable);
    const squares = usable.reduce((sum, value) => sum + (value - centre) ** 2, 0);
    return Math.sqrt(squares / (usable.length - 1));
}

const tCriticalCache = new Map();

/**
 * P(|T| < t) for Student's t with integer `df`, from the exact closed form
 * (Abramowitz & Stegun, 1964, eqs. 26.7.3 and 26.7.4).
 */
function centralProbability(t, df) {
    const theta = Math.atan(t / Math.sqrt(df));
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const cos2 = cosTheta * cosTheta;
    let sum = 0;
    if (df % 2 === 1) {
        let term = cosTheta;
        for (let k = 1; 2 * k + 1 <= df; k++) {
            sum += term;
            term *= (cos2 * (2 * k)) / (2 * k + 1);
        }
        return (2 / Math.PI) * (theta + sinTheta * sum);
    }
    let term = 1;
    for (let k = 1; 2 * k <= df; k++) {
        sum += term;
        term *= (cos2 * (2 * k - 1)) / (2 * k);
    }
    return sinTheta * sum;
}

/**
 * Two-sided 95% critical value of Student's t, i.e. R's `qt(0.975, df)`.
 * Found by bisection on the exact CDF, which matches R to six decimals
 * (ported unchanged from the v1 dashboard).
 * @param {number} df positive integer degrees of freedom
 * @returns {number} NaN for invalid df
 */
export function tCritical95(df) {
    if (!Number.isInteger(df) || df < 1) return NaN;
    if (df > NORMAL_LIMIT_DF) return Z_975;
    if (tCriticalCache.has(df)) return tCriticalCache.get(df);

    let lo = 0;
    let hi = 64; // qt(0.975, 1) = 12.71 is the largest value needed
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (centralProbability(mid, df) < 0.95) lo = mid;
        else hi = mid;
    }
    const t = (lo + hi) / 2;
    tCriticalCache.set(df, t);
    return t;
}

/**
 * Mean with a 95% t confidence interval. The interval is not clamped to the
 * rating scale, so with few values it can run past 1 or 7.
 * @param {number[]} values non-finite entries are ignored
 * @returns {{n: number, mean: number|null, sd: number|null, se: number|null,
 *   lower: number|null, upper: number|null}} spread and bounds are null when n < 2
 */
export function meanCI(values) {
    const usable = finiteValues(values);
    const n = usable.length;
    const centre = mean(usable);
    const spread = sd(usable);
    if (spread === null) return { n, mean: centre, sd: null, se: null, lower: null, upper: null };

    const se = spread / Math.sqrt(n);
    const halfWidth = tCritical95(n - 1) * se;
    return {
        n,
        mean: centre,
        sd: spread,
        se,
        lower: centre - halfWidth,
        upper: centre + halfWidth,
    };
}

/**
 * Mean share of tokens per criterion with 95% t intervals, from `/rankings`
 * allocations. Only valid allocations (integers 0-20 summing to 20) count.
 * Shares are proportions (0-1); bounds are clamped to 0-1 because shares are
 * compositional and a symmetric interval can otherwise leave the range.
 * @param {Array<Record<string, unknown>> | Record<string, Record<string, unknown>>} allocations
 *   an array of entries or a raw `/rankings` node
 * @param {string[]} [keys] criterion keys
 * @returns {{n: number, criteria: Array<{key: string, mean: number|null, sd: number|null,
 *   se: number|null, lower: number|null, upper: number|null}>}}
 */
export function shareCI(allocations, keys = CRITERION_KEYS) {
    const entries = Array.isArray(allocations) ? allocations : Object.values(allocations ?? {});
    const valid = entries.filter((entry) => isValidAllocation(entry, keys));
    const criteria = keys.map((key) => {
        const shares = valid.map((entry) => entry[key] / sumOf(entry, keys));
        const ci = meanCI(shares);
        return {
            key,
            mean: ci.mean,
            sd: ci.sd,
            se: ci.se,
            lower: ci.lower === null ? null : clamp01(ci.lower),
            upper: ci.upper === null ? null : clamp01(ci.upper),
        };
    });
    return { n: valid.length, criteria };
}

function sumOf(entry, keys) {
    return keys.reduce((total, key) => total + entry[key], 0);
}

function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}
