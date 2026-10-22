// The Quarto analysis reads constants, patterns and criterion keys straight
// from the app's source with regular expressions (analysis/R/repo.R), and CI
// runs no R. These checks apply the same expressions to the same files, so a
// change that would stop the report from rendering fails here instead.
// Change analysis/R/repo.R and this file together.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as config from '../../../src/lib/config.js';
import { CRITERION_KEYS } from '../../../src/lib/criteria.js';
import * as patterns from '../../../src/lib/patterns.js';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

const repoR = read('analysis/R/repo.R');

/** The quoted names in the `c(...)` that repo.R passes to `reader` for `file`. */
function namesRead(reader, file) {
    const start = repoR.indexOf(`${reader}(file.path(lib, '${file}'), c(`);
    expect(start, `repo.R calls ${reader} for ${file}`).toBeGreaterThan(-1);
    const list = repoR.slice(start, repoR.indexOf('))', start));
    return [...list.matchAll(/'([A-Z0-9_]+)'/g)].map(([, name]) => name);
}

/** Lines of `source` that match `pattern` (repo.R matches line by line). */
function matchingLines(source, pattern) {
    return source.split(/\r?\n/).filter((line) => pattern.test(line));
}

describe('analysis/R/repo.R can read the app source', () => {
    it('reads each numeric constant from exactly one line of config.js, with its value', () => {
        const source = read('src/lib/config.js');
        const names = namesRead('read_js_numbers', 'config.js');
        expect(names).toEqual(
            expect.arrayContaining(['SEED_WEIGHT', 'SCORE_PENALTY', 'STUDY_COUNT'])
        );
        for (const name of names) {
            const pattern = new RegExp(`^\\s*export const ${name} = ([0-9][0-9_]*(\\.[0-9]+)?);`);
            const lines = matchingLines(source, pattern);
            expect(lines, name).toHaveLength(1);
            const value = Number(pattern.exec(lines[0])[1].replaceAll('_', ''));
            expect(value, name).toBe(config[name]);
        }
    });

    it('reads each pattern from exactly one line of patterns.js, with its source', () => {
        const source = read('src/lib/patterns.js');
        const names = namesRead('read_js_patterns', 'patterns.js');
        expect(names).toEqual(expect.arrayContaining(['USERNAME_PATTERN', 'STUDY_ID_PATTERN']));
        for (const name of names) {
            const pattern = new RegExp(`^\\s*export const ${name} = /(.*)/[a-z]*;\\s*$`);
            const lines = matchingLines(source, pattern);
            expect(lines, name).toHaveLength(1);
            expect(pattern.exec(lines[0])[1], name).toBe(patterns[name].source);
        }
    });

    it('reads the criterion keys of criteria.js in their order', () => {
        const keys = [...read('src/lib/criteria.js').matchAll(/key: '([a-z]+)'/g)].map(
            ([, key]) => key
        );
        expect(keys).toEqual([...CRITERION_KEYS]);
        expect(keys).toEqual(['title', 'access', 'source', 'theory', 'methods', 'conclusion']);
    });
});
