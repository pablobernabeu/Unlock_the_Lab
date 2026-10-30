/**
 * The writing rules of the English content that can be checked mechanically:
 * study cards describe without judging, state their sample size and data
 * availability and hold no markup but <i>N</i>; the expert feedback is short
 * plain text; glossary terms are unique; the combining guide is complete.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CRITERIA, CRITERION_KEYS } from '../../../src/lib/criteria.js';

const CONTENT = new URL('../../../src/content/', import.meta.url);

function readContent(path) {
    return JSON.parse(readFileSync(new URL(path, CONTENT), 'utf8'));
}

const studies = readContent('en/studies.json');
const glossary = readContent('en/glossary.json');
const rubric = readContent('en/rubric.json');
const guide = readContent('en/guide.json');
const common = readContent('../i18n/en/common.json');

/** The card fields in the order the app shows them: the title, then the five sections. */
const CARD_FIELDS = CRITERIA.map(({ field }) => field);

/**
 * Verdicts and rubric labels: a card gives the facts that lead to a verdict, never the
 * verdict itself. 'Open' is not listed, because 'open data' states a fact.
 */
const VERDICT_WORDS = [
    'accurate',
    'clickbait',
    'modest',
    'impossible',
    'difficult',
    'suspicious',
    'unverified',
    'trusted',
    'predatory',
    'nonsense',
    'standard',
    'robust',
    'flawed',
    'acceptable',
    'rigorous',
    'overblown',
    'logical',
    'nuanced',
    'credible',
    'reputable',
    'respected',
    'top-tier',
    'high-quality',
    'low-quality',
    'gold standard',
    'sound',
    'solid',
    'weak',
    'strong',
    'misleading',
    'cherry-picked',
    'closed',
    'restricted',
    'unfounded',
    'use with caution',
];

/** Any verdict word as a whole word, in any case ('unsound' or 'strongly' do not match). */
const VERDICT_PATTERN = new RegExp(
    `(?<!\\p{L})(?:${VERDICT_WORDS.map((word) => word.replaceAll(' ', '\\s+')).join('|')})(?!\\p{L})`,
    'iu'
);

/** A sample size as the cards write it, for example <i>N</i>=2,000. */
const SAMPLE_SIZE = /<i>N<\/i>=\d{1,3}(?:,\d{3})*(?!\d)/;

/** Cards that report no study of their own, so they have no sample to size. */
const NO_STUDY_CARDS = ['STUDY-29', 'STUDY-32', 'STUDY-34', 'STUDY-40', 'STUDY-46', 'STUDY-48'];

/** Tags, angle brackets or character references. */
const MARKUP = /[<>]|&#?\w+;/;

function wordCount(text) {
    return text.trim().split(/\s+/).length;
}

/** Full stops, question marks and exclamation marks that end a sentence. */
function sentenceCount(text) {
    return text.match(/[.!?]['’)]*(?=\s|$)/g)?.length ?? 0;
}

/** Every card text, labelled with its study and field for failure messages. */
const cardTexts = studies.flatMap((study) =>
    CARD_FIELDS.map((field) => [`${study.id} ${field}`, study[field]])
);

describe('study cards', () => {
    it('hold the id, the six texts and the feedback, and nothing else', () => {
        for (const study of studies) {
            expect(Object.keys(study).sort(), study.id).toEqual(
                ['id', ...CARD_FIELDS, 'feedback'].sort()
            );
            for (const field of CARD_FIELDS) {
                expect(typeof study[field], `${study.id} ${field}`).toBe('string');
                expect(study[field].trim(), `${study.id} ${field}`).not.toBe('');
            }
        }
    });

    it('have unique titles', () => {
        const titles = studies.map(({ title }) => title);
        expect(new Set(titles).size).toBe(titles.length);
    });

    it('describe without verdict words or rubric labels', () => {
        const judged = cardTexts
            .filter(([, text]) => VERDICT_PATTERN.test(text))
            .map(([label, text]) => `${label}: ${text.match(VERDICT_PATTERN)[0]}`);
        expect(judged).toEqual([]);
    });

    it('use no markup but <i>N</i>, and none in titles', () => {
        for (const [label, text] of cardTexts) {
            expect(text.replaceAll('<i>N</i>', ''), label).not.toMatch(MARKUP);
        }
        for (const { id, title } of studies) expect(title, id).not.toMatch(MARKUP);
    });

    it('give one to three sentences in each section', () => {
        for (const study of studies) {
            for (const field of CARD_FIELDS.filter((field) => field !== 'title')) {
                const count = sentenceCount(study[field]);
                expect(count >= 1 && count <= 3, `${study.id} ${field}: ${count}`).toBe(true);
            }
        }
    });

    it('start a sentence in Methods & Data with the data availability label', () => {
        const label = readContent('../i18n/en/app.json').study.dataAvailability;
        expect(label).toBe('Data availability:');
        for (const { id, methods } of studies) {
            expect(methods.split(label), id).toHaveLength(2);
            expect(methods, id).toMatch(/(?:^|[.!?] )Data availability: \S/);
        }
    });

    it('state a sample size on every card except those that report no study', () => {
        const withoutSample = studies
            .filter(({ methods }) => !SAMPLE_SIZE.test(methods))
            .map(({ id }) => id);
        expect(withoutSample).toEqual(NO_STUDY_CARDS);
    });

    it('use single quotation marks and no em dashes', () => {
        for (const [label, text] of cardTexts) expect(text, label).not.toMatch(/["“”—]/);
    });
});

describe('expert feedback', () => {
    const notes = studies.flatMap(({ id, feedback }) =>
        Object.entries(feedback.criteria).map(([key, { note }]) => [`${id} ${key}`, note])
    );

    it('covers the six criteria of every study with a low, medium or high band', () => {
        for (const { id, feedback } of studies) {
            expect(Object.keys(feedback).sort(), id).toEqual(['criteria', 'summary']);
            expect(Object.keys(feedback.criteria), id).toEqual(CRITERION_KEYS);
            for (const [key, { band }] of Object.entries(feedback.criteria)) {
                expect(['low', 'medium', 'high'], `${id} ${key}`).toContain(band);
            }
        }
    });

    it('sums up each study in at most 60 words', () => {
        for (const { id, feedback } of studies) {
            expect(feedback.summary.trim(), id).not.toBe('');
            expect(wordCount(feedback.summary), id).toBeLessThanOrEqual(60);
        }
    });

    it('gives each criterion a note of one sentence and at most 30 words', () => {
        for (const [label, note] of notes) {
            expect(wordCount(note), label).toBeLessThanOrEqual(30);
            expect(sentenceCount(note), label).toBe(1);
            expect(note, label).toMatch(/[.!?]['’)]*$/);
        }
    });

    it('is plain text with single quotation marks and no em dashes', () => {
        const texts = [
            ...studies.map(({ id, feedback }) => [`${id} summary`, feedback.summary]),
            ...notes,
        ];
        for (const [label, text] of texts) {
            expect(text, label).not.toMatch(MARKUP);
            expect(text, label).not.toMatch(/["“”—]/);
        }
    });
});

describe('rubric', () => {
    it('has a Low, Medium and High anchor for each criterion, in the app’s order', () => {
        expect(rubric.map(({ name }) => name)).toEqual(
            CRITERION_KEYS.map((key) => common.criteria[key])
        );
        for (const criterion of rubric) {
            expect(Object.keys(criterion)).toEqual(['name', 'low', 'medium', 'high']);
        }
    });

    it('starts each anchor with a short label and a colon, which the app sets in bold', () => {
        for (const criterion of rubric) {
            for (const band of ['low', 'medium', 'high']) {
                const label = criterion[band].slice(0, criterion[band].indexOf(':'));
                expect(label, `${criterion.name} ${band}`).toMatch(/^[A-Z][\w &]{2,24}$/);
            }
        }
    });
});

describe('glossary', () => {
    it('has a term and a definition in every entry, with no term twice', () => {
        for (const entry of glossary) {
            expect(Object.keys(entry)).toEqual(['term', 'definition']);
            expect(entry.term.trim()).not.toBe('');
            expect(entry.definition.trim(), entry.term).not.toBe('');
        }
        const terms = glossary.map(({ term }) => term.toLowerCase());
        expect(terms.filter((term, index) => terms.indexOf(term) !== index)).toEqual([]);
    });
});

describe('combining guide', () => {
    it('has the combining rules, a worked example and the note on Access', () => {
        expect(Object.keys(guide)).toEqual(['combining', 'example', 'accessNote']);
        for (const [key, text] of Object.entries(guide)) {
            expect(typeof text, key).toBe('string');
            expect(text.trim(), key).not.toBe('');
        }
    });

    it('never says how the expert ratings weigh the criteria', () => {
        // Participants state their own weights at the end, which the workshop records.
        for (const [key, text] of Object.entries(guide)) {
            expect(text, key).not.toMatch(/\bexperts?\b|\bweigh/i);
        }
    });
});
