// @vitest-environment jsdom
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { renderExpertFeedback, renderFeedbackPanel } from '../../../src/app/views/feedback.js';
import { loadContent } from '../../../src/lib/content.js';
import { CRITERION_KEYS } from '../../../src/lib/criteria.js';
import { initI18n } from '../../../src/lib/i18n.js';

const CONTENT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/content');
const LOCALES = readdirSync(CONTENT).filter((name) => statSync(join(CONTENT, name)).isDirectory());

beforeAll(async () => {
    await initI18n({ namespaces: ['app'] });
});

describe('renderExpertFeedback', () => {
    it('shows the feedback as text, never as markup', () => {
        const study = {
            expertRating: 2,
            feedback: {
                summary: 'Only <i>N</i> = 12 pupils.',
                criteria: { methods: { band: 'low', note: 'No <b>control</b> group.' } },
            },
        };
        const panel = renderExpertFeedback(study);
        expect(panel.querySelector('i, b')).toBeNull();
        expect(panel.querySelector('.expert-feedback__summary').textContent).toBe(
            'Only <i>N</i> = 12 pupils.'
        );
        expect(panel.querySelector('.criterion-notes__note').textContent).toBe(
            'No <b>control</b> group.'
        );
    });
});

describe('renderFeedbackPanel', () => {
    const study = { id: 'STUDY-13', expertRating: 4, feedback: { summary: 'A summary.' } };
    const result = { rating: 5, prediction: 5, score: 100, target: 5, crowd: { n: 1, mean: 5 } };
    const makeUp = (panel) =>
        [...panel.querySelectorAll('.feedback__facts li')].find((line) =>
            line.textContent.startsWith('How the target was worked out')
        ).textContent;

    it("describes the target with the study's expert rating", () => {
        const panel = renderFeedbackPanel({ study, result, showExpert: false, actions: [] });
        expect(makeUp(panel)).toContain("the expert's rating of 4");
    });

    it('describes an earlier answer with the expert rating its target was made from', () => {
        const panel = renderFeedbackPanel({
            study,
            result: { ...result, expertRating: 5 },
            showExpert: false,
            actions: [],
        });
        expect(makeUp(panel)).toContain("the expert's rating of 5");
    });
});

// The app (and the dashboard's study dialog) show the expert feedback as plain text.
describe.each(LOCALES)('expert feedback in the %s content', (locale) => {
    it('has a summary and a band and note for every criterion, all plain text', async () => {
        const { studies } = await loadContent(locale);
        expect(studies.length).toBeGreaterThan(0);
        for (const { id, feedback } of studies) {
            expect(typeof feedback?.summary, id).toBe('string');
            expect(feedback.summary.trim(), id).not.toBe('');
            expect(feedback.summary, id).not.toContain('<');
            expect(Object.keys(feedback.criteria).sort(), id).toEqual([...CRITERION_KEYS].sort());
            for (const [key, { band, note }] of Object.entries(feedback.criteria)) {
                expect(['low', 'medium', 'high'], `${id} ${key}`).toContain(band);
                expect(typeof note, `${id} ${key}`).toBe('string');
                expect(note.trim(), `${id} ${key}`).not.toBe('');
                expect(note, `${id} ${key}`).not.toContain('<');
            }
        }
    });
});
