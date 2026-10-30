/**
 * The CI builds and Firebase App Check (docs/deployment.md, step 2 under
 * 'Firebase App Check'): the `check` and `deploy` jobs pass the repository
 * variable VITE_APPCHECK_SITE_KEY to `npm run build`, and the `preview` job
 * leaves it out, because a reCAPTCHA key works only on the site's domains.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8');

/** The text of each job under `jobs:`, by job id. */
function jobs(source) {
    const body = source.slice(source.indexOf('\njobs:\n'));
    const result = {};
    for (const [, id, text] of body.matchAll(/^ {2}([a-z-]+):\n((?:(?: {4}.*)?\n)*)/gm)) {
        result[id] = text;
    }
    return result;
}

/** The `npm run build` step of a job, from its `- run:` line to the next step. */
function buildStep(job) {
    const match = /^ {6}- run: npm run build\n((?: {8}.*\n)*)/m.exec(job);
    return match ? match[1] : null;
}

const SITE_KEY = 'VITE_APPCHECK_SITE_KEY: ${{ vars.VITE_APPCHECK_SITE_KEY }}';

describe('the site key in the CI builds', () => {
    const all = jobs(workflow);

    it('finds the jobs and their build steps', () => {
        for (const id of ['check', 'deploy', 'preview']) {
            expect(buildStep(all[id] ?? ''), id).not.toBeNull();
        }
    });

    it.each(['check', 'deploy'])('gives the %s build the site key', (id) => {
        expect(buildStep(all[id])).toContain(SITE_KEY);
    });

    it('leaves it out of the preview build', () => {
        expect(all.preview).not.toContain('VITE_APPCHECK_SITE_KEY');
    });
});
