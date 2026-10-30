// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import englishGuide from '../../../src/content/en/guide.json' with { type: 'json' };
import { openHelpDialog } from '../../../src/app/views/help-dialog.js';
import { renderAccessNote, renderRatingGuide } from '../../../src/app/views/reference.js';
import { loadContent, mergeTranslation } from '../../../src/lib/content.js';
import { initI18n } from '../../../src/lib/i18n.js';

const GUIDE_FIELDS = ['combining', 'example', 'accessNote'];

beforeAll(async () => {
    await initI18n({ namespaces: ['app'] });
});

describe('guide.json', () => {
    it('has the three plain-text fields the app shows', () => {
        expect(Object.keys(englishGuide).sort()).toEqual([...GUIDE_FIELDS].sort());
        for (const field of GUIDE_FIELDS) {
            expect(typeof englishGuide[field], field).toBe('string');
            expect(englishGuide[field].trim(), field).not.toBe('');
            expect(englishGuide[field], field).not.toContain('<');
        }
    });

    it('is loaded with the other content, in English for a locale without a translation', async () => {
        expect((await loadContent('en')).guide).toEqual(englishGuide);
        expect((await loadContent('xx')).guide).toEqual(englishGuide);
    });

    it('takes a partial translation field by field', () => {
        const translated = { combining: 'Cyfuno', example: '' };
        expect(mergeTranslation(englishGuide, translated)).toEqual({
            ...englishGuide,
            combining: 'Cyfuno',
        });
    });
});

describe('renderRatingGuide and renderAccessNote', () => {
    it('show the advice, the worked example and the Access note under headings, as text', () => {
        const guide = {
            combining: 'Start from <b>most</b>.',
            example: 'Take a study.',
            accessNote: 'Openness.',
        };
        const advice = renderRatingGuide(guide);
        expect(advice.querySelector('b')).toBeNull();
        expect([...advice.children].map((child) => [child.tagName, child.textContent])).toEqual([
            ['P', 'Start from <b>most</b>.'],
            ['H3', 'A worked example'],
            ['P', 'Take a study.'],
        ]);
        expect(renderRatingGuide(guide, { level: 4 }).querySelector('h4')).not.toBeNull();

        const note = renderAccessNote(guide);
        expect(note.querySelector('h3').textContent).toBe('About the Access criterion');
        expect(note.querySelector('p').textContent).toBe('Openness.');
    });

    it('leave out what the guide lacks', () => {
        expect(renderAccessNote({})).toBeNull();
        expect(renderAccessNote(undefined)).toBeNull();
        expect(
            renderRatingGuide({ example: 'Only an example.' }).querySelector('p').textContent
        ).toBe('Only an example.');
        expect(renderRatingGuide({}).children).toHaveLength(0);
    });
});

describe('the help dialog', () => {
    it('has a tab for the rating guide and shows the Access note with the rubric', async () => {
        HTMLDialogElement.prototype.showModal ??= function showModal() {
            this.open = true;
        };
        const content = await loadContent('en');
        openHelpDialog(content, null);
        const dialog = document.querySelector('.help-dialog');
        const tabs = [...dialog.querySelectorAll('[role="tab"]')];
        expect(tabs.map((tab) => tab.textContent)).toEqual([
            'Glossary',
            'Rubric',
            'Overall rating',
        ]);
        expect(dialog.querySelector('#help-rubric').textContent).toContain(englishGuide.accessNote);
        const panel = dialog.querySelector('#help-rating');
        expect(panel.getAttribute('aria-labelledby')).toBe('help-rating-tab');
        expect(panel.hidden).toBe(true);
        expect(panel.textContent).toContain(englishGuide.combining);
        expect(panel.textContent).toContain(englishGuide.example);

        tabs[2].click();
        expect(panel.hidden).toBe(false);
        expect(tabs[2].getAttribute('aria-selected')).toBe('true');
        expect(dialog.querySelector('#help-glossary').hidden).toBe(true);
    });
});
