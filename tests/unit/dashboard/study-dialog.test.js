// @vitest-environment jsdom
/**
 * The dashboard's study dialog against the real dashboard.html markup: the
 * study texts may hold trusted markup from our content files, but the expert
 * feedback is plain text, as in the participant app.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createStudyDialog } from '../../../src/dashboard/study-dialog.js';
import { qs, qsa } from '../../../src/lib/dom.js';
import { initI18n } from '../../../src/lib/i18n.js';

// A path rather than a file URL: under jsdom, import.meta.url is not a file URL.
const PAGE = readFileSync(resolve(process.cwd(), 'dashboard.html'), 'utf8');
const BODY = PAGE.slice(PAGE.indexOf('<body>') + '<body>'.length, PAGE.indexOf('</body>'));

const ROW = {
    id: 'STUDY-7',
    expertRating: 2,
    band: 'low',
    n: 3,
    mean: 3,
    sd: 1,
    lower: 0.5,
    upper: 5.5,
    meanPrediction: 4,
};

function study(feedback) {
    return {
        id: 'STUDY-7',
        title: 'Effects in <i>N</i> = 12 pupils',
        access: 'Open access',
        source: 'A journal',
        overview: 'Builds on <i>prior</i> work.',
        methods: 'Twelve pupils',
        conclusion: 'It works',
        expertRating: 2,
        feedback,
    };
}

function open(feedback) {
    const dialog = qs('[data-study-dialog]');
    createStudyDialog(dialog).open({
        study: study(feedback),
        row: ROW,
        target: { target: 2.05, n: 3 },
        room: null,
    });
    return dialog;
}

beforeAll(async () => {
    await initI18n({ namespaces: ['dashboard'] });
});

beforeEach(() => {
    document.body.innerHTML = BODY;
    // jsdom has no modal dialogs.
    if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = function showModal() {
            this.open = true;
        };
    }
});

afterEach(() => {
    document.body.innerHTML = '';
});

const feedbackSection = (dialog) => qs('#study-dialog-feedback-heading', dialog).closest('section');

describe('study dialog', () => {
    it('shows the expert feedback summary and notes as text, never as markup', () => {
        const dialog = open({
            summary: 'Only <i>N</i> = 12 pupils.',
            criteria: {
                methods: { band: 'low', note: 'No <b>control</b> group.' },
                title: { band: 'medium', note: 'A fair <img src=x onerror=alert(1)> title.' },
            },
        });
        const section = feedbackSection(dialog);
        expect(section.querySelector('i, b, img')).toBeNull();
        const paragraphs = qsa('p', section).map((p) => p.textContent);
        expect(paragraphs).toContain('Only <i>N</i> = 12 pupils.');
        expect(paragraphs).toContain('No <b>control</b> group.');
        expect(paragraphs).toContain('A fair <img src=x onerror=alert(1)> title.');
    });

    it('keeps the trusted markup of the study texts', () => {
        const dialog = open({ summary: 'Plain.', criteria: {} });
        const text = qs('#study-dialog-text-heading', dialog).closest('section');
        expect(qsa('i', text).map((node) => node.textContent)).toEqual(['prior']);
    });

    it('says so when a study has no expert feedback', () => {
        const section = feedbackSection(open(undefined));
        expect(qs('p', section).textContent).toBe('There is no expert feedback for this study.');
        expect(qs('ul', section)).toBeNull();
    });
});
