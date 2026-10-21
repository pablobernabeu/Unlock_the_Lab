import { describe, expect, it } from 'vitest';
import { CRITERION_KEYS, descriptionKey, labelKey } from '../../../src/lib/criteria.js';
import { lookupMessage, splitKey } from '../../../src/lib/i18n-core.js';
import { LOCALE_PATTERN } from '../../../src/lib/patterns.js';
import {
    ENFORCED_NAMESPACES,
    collectUsedKeys,
    isMessage,
    leafKeys,
    loadLocale,
    localeCodes,
    missingKeys,
    withoutComments,
} from './i18n-keys.js';

const english = loadLocale('en');
const used = collectUsedKeys();

describe('i18n key coverage', () => {
    it(`finds an English string for every key used in the ${ENFORCED_NAMESPACES.join(', ')} namespace(s)`, () => {
        expect(missingKeys({ used, english })).toEqual([]);
    });

    it('ignores keys in comments but not code that follows a glob pattern', () => {
        const source = [
            '/**',
            " * Example: t('common.example.inDoc')",
            ' */',
            "const files = import.meta.glob('../i18n/*/*.json');",
            "// t('common.example.inLineComment')",
            "const label = t('common.dialog.ok');",
            "/* t('common.example.inBlock') */",
        ].join('\n');
        const kept = withoutComments(source, 'page.js');
        expect(kept).toContain("t('common.dialog.ok')");
        expect(kept).not.toContain('common.example');
    });

    it('only uses well-formed keys (namespace.path)', () => {
        const malformed = [...used.keys()].filter((key) => !splitKey(key));
        expect(malformed).toEqual([]);
    });

    it('has labels and descriptions for every criterion', () => {
        for (const key of CRITERION_KEYS) {
            expect(isMessage(lookupMessage(english, labelKey(key))), labelKey(key)).toBe(true);
            expect(
                isMessage(lookupMessage(english, descriptionKey(key))),
                descriptionKey(key)
            ).toBe(true);
        }
    });

    it('has a label for every quality band', () => {
        for (const band of ['low', 'medium', 'high']) {
            expect(typeof lookupMessage(english, `common.quality.${band}`)).toBe('string');
        }
    });
});

describe('locale files', () => {
    it('only contain strings and plural forms with an "other" form', () => {
        for (const code of localeCodes()) {
            const invalid = leafKeys(loadLocale(code)).filter(
                (key) => !isMessage(lookupMessage(loadLocale(code), key))
            );
            expect(invalid, code).toEqual([]);
        }
    });

    it('use valid locale codes and no keys that English lacks', () => {
        const englishKeys = new Set(leafKeys(english));
        for (const code of localeCodes()) {
            expect(code).toMatch(LOCALE_PATTERN);
            if (code === 'en') continue;
            const extra = leafKeys(loadLocale(code)).filter((key) => !englishKeys.has(key));
            expect(extra, code).toEqual([]);
        }
    });

    it('contain no empty English strings', () => {
        const empty = leafKeys(english).filter((key) => lookupMessage(english, key) === '');
        expect(empty).toEqual([]);
    });
});
