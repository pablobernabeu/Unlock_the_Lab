import { describe, expect, it } from 'vitest';
import {
    interpolate,
    isPluralForms,
    lookupMessage,
    parseAttrSpec,
    splitKey,
} from '../../../src/lib/i18n-core.js';

const messages = {
    common: {
        appName: 'Unlock the Lab',
        dialog: { ok: 'OK' },
        counts: { studies: { one: '{count} study', other: '{count} studies' } },
    },
};

describe('splitKey', () => {
    it('separates the namespace from the path', () => {
        expect(splitKey('app.welcome.title')).toEqual({
            namespace: 'app',
            path: ['welcome', 'title'],
        });
    });

    it('rejects keys without a namespace or with empty segments', () => {
        expect(splitKey('title')).toBeNull();
        expect(splitKey('app..title')).toBeNull();
        expect(splitKey('')).toBeNull();
        expect(splitKey(undefined)).toBeNull();
    });
});

describe('lookupMessage', () => {
    it('follows nested objects', () => {
        expect(lookupMessage(messages, 'common.dialog.ok')).toBe('OK');
        expect(lookupMessage(messages, 'common.appName')).toBe('Unlock the Lab');
    });

    it('returns undefined for missing keys and does not walk the prototype chain', () => {
        expect(lookupMessage(messages, 'common.dialog.cancel')).toBeUndefined();
        expect(lookupMessage(messages, 'app.anything')).toBeUndefined();
        expect(lookupMessage(messages, 'common.toString')).toBeUndefined();
        expect(lookupMessage(undefined, 'common.appName')).toBeUndefined();
    });

    it('returns plural forms as objects', () => {
        expect(isPluralForms(lookupMessage(messages, 'common.counts.studies'))).toBe(true);
        expect(isPluralForms(lookupMessage(messages, 'common.dialog'))).toBe(false);
    });
});

describe('parseAttrSpec', () => {
    it('reads attribute and key pairs', () => {
        expect(parseAttrSpec('aria-label:common.dialog.close; placeholder:app.name')).toEqual([
            ['aria-label', 'common.dialog.close'],
            ['placeholder', 'app.name'],
        ]);
    });

    it('ignores empty and malformed parts', () => {
        expect(parseAttrSpec('')).toEqual([]);
        expect(parseAttrSpec(null)).toEqual([]);
        expect(parseAttrSpec('title;:x;alt:;content:common.appName;')).toEqual([
            ['content', 'common.appName'],
        ]);
    });
});

describe('interpolate', () => {
    it('fills placeholders and leaves unknown ones', () => {
        expect(interpolate('{name} rated {count}', { name: 'Red Fox 07', count: 3 })).toBe(
            'Red Fox 07 rated 3'
        );
        expect(interpolate('Hello {who}', {})).toBe('Hello {who}');
        expect(interpolate('Hello {who}')).toBe('Hello {who}');
    });

    it('can convert values, for example to escape them', () => {
        expect(interpolate('<b>{name}</b>', { name: '<i>' }, (value) => `[${value}]`)).toBe(
            '<b>[<i>]</b>'
        );
    });
});
