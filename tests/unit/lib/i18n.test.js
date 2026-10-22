// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../src/lib/config.js';
import {
    availableLocales,
    catalogueFromGlob,
    createI18n,
    initI18n,
    resolveLocale,
    t,
} from '../../../src/lib/i18n.js';

const english = {
    common: {
        appName: 'Unlock the Lab',
        greeting: 'Hello {name}',
        rich: 'Rated by <strong>{name}</strong>',
        counts: { studies: { one: '{count} study', other: '{count} studies' } },
        onlyEnglish: 'Only in English',
        dialog: { close: 'Close' },
    },
    app: { title: 'Welcome' },
};

const welsh = {
    common: {
        appName: 'Datgloi’r Labordy',
        greeting: 'Helo {name}',
        counts: {
            studies: {
                one: '{count} astudiaeth',
                two: '{count} astudiaeth (2)',
                other: '{count} astudiaeth',
            },
        },
        onlyEnglish: '',
    },
};

function fixtureCatalogue() {
    const loader = (data) => vi.fn(() => Promise.resolve(data));
    return {
        en: { common: loader(english.common), app: loader(english.app) },
        cy: { common: loader(welsh.common) },
    };
}

function makeTranslator({ search = '', languages = [], navigate = vi.fn() } = {}) {
    const catalogue = fixtureCatalogue();
    const i18n = createI18n({
        catalogue,
        getSearch: () => search,
        getLanguages: () => languages,
        navigate,
    });
    return { i18n, catalogue, navigate };
}

afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');
    document.body.innerHTML = '';
});

describe('resolveLocale', () => {
    const available = ['en', 'cy', 'pt-BR'];

    it('prefers ?lang=, then the stored choice, then the browser languages', () => {
        expect(
            resolveLocale({ requested: 'cy', stored: 'en', languages: ['pt-BR'], available })
        ).toBe('cy');
        expect(
            resolveLocale({ requested: null, stored: 'cy', languages: ['pt-BR'], available })
        ).toBe('cy');
        expect(resolveLocale({ languages: ['de-DE', 'pt-BR'], available })).toBe('pt-BR');
    });

    it('matches regional variants and case-insensitively', () => {
        expect(resolveLocale({ languages: ['cy-GB'], available })).toBe('cy');
        expect(resolveLocale({ languages: ['pt'], available })).toBe('pt-BR');
        expect(resolveLocale({ requested: 'PT_br', available })).toBe('pt-BR');
    });

    it('falls back to English for unavailable locales', () => {
        expect(resolveLocale({ requested: 'xx', stored: 'yy', languages: ['de'], available })).toBe(
            'en'
        );
        expect(resolveLocale({ available: ['en'] })).toBe('en');
    });
});

describe('catalogueFromGlob', () => {
    it('groups files by locale and namespace', () => {
        const loader = () => Promise.resolve({});
        expect(
            catalogueFromGlob({
                '../i18n/en/common.json': loader,
                '../i18n/en/app.json': loader,
                '../i18n/cy/common.json': loader,
            })
        ).toEqual({ en: { common: loader, app: loader }, cy: { common: loader } });
    });
});

describe('createI18n', () => {
    it('defaults to English and loads common plus the requested namespaces', async () => {
        const { i18n, catalogue } = makeTranslator();
        expect(await i18n.initI18n({ namespaces: ['app'] })).toBe('en');
        expect(i18n.t('app.title')).toBe('Welcome');
        expect(catalogue.en.common).toHaveBeenCalledTimes(1);
        expect(catalogue.cy.common).not.toHaveBeenCalled();
        expect(document.documentElement.lang).toBe('en');
        expect(document.documentElement.dir).toBe('ltr');
    });

    it('interpolates parameters and chooses plural forms', async () => {
        const { i18n } = makeTranslator();
        await i18n.initI18n();
        expect(i18n.t('common.greeting', { name: 'Red Fox 07' })).toBe('Hello Red Fox 07');
        expect(i18n.t('common.counts.studies', { count: 1 })).toBe('1 study');
        expect(i18n.t('common.counts.studies', { count: 12 })).toBe('12 studies');
        expect(i18n.t('common.counts.studies')).toBe('{count} studies');
    });

    it('uses the requested locale with English as the fallback per key', async () => {
        const { i18n } = makeTranslator({ search: '?lang=cy' });
        expect(await i18n.initI18n({ namespaces: ['app'] })).toBe('cy');
        expect(i18n.t('common.appName')).toBe('Datgloi’r Labordy');
        expect(i18n.t('common.onlyEnglish')).toBe('Only in English');
        expect(i18n.t('app.title')).toBe('Welcome');
        expect(i18n.t('common.counts.studies', { count: 2 })).toBe('2 astudiaeth (2)');
        expect(document.documentElement.lang).toBe('cy');
    });

    it('uses the stored choice and the browser languages', async () => {
        localStorage.setItem(STORAGE_KEYS.locale, 'cy');
        const stored = makeTranslator();
        expect(await stored.i18n.initI18n()).toBe('cy');
        localStorage.clear();
        const browser = makeTranslator({ languages: ['cy-GB', 'en'] });
        expect(await browser.i18n.initI18n()).toBe('cy');
    });

    it('returns the key and warns once for missing translations', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { i18n } = makeTranslator();
        await i18n.initI18n();
        expect(i18n.t('common.nothing')).toBe('common.nothing');
        expect(i18n.t('common.nothing')).toBe('common.nothing');
        expect(i18n.t('common.dialog')).toBe('common.dialog');
        expect(warn).toHaveBeenCalledTimes(2);
        expect(i18n.hasTranslation('common.nothing')).toBe(false);
        expect(i18n.hasTranslation('common.appName')).toBe(true);
    });

    it('escapes parameters in trusted HTML strings', async () => {
        const { i18n } = makeTranslator();
        await i18n.initI18n();
        expect(i18n.tHtml('common.rich', { name: '<img src=x onerror=alert(1)>' })).toBe(
            'Rated by <strong>&lt;img src=x onerror=alert(1)&gt;</strong>'
        );
    });

    it('fills data-i18n, data-i18n-html and data-i18n-attr elements', async () => {
        const { i18n } = makeTranslator({ search: '?lang=cy' });
        await i18n.initI18n();
        document.body.innerHTML = `
            <section id="root" data-i18n-attr="aria-label:common.appName">
                <h1 data-i18n="common.appName">Unlock the Lab</h1>
                <p data-i18n-html="common.onlyEnglish">x</p>
                <button data-i18n-attr="aria-label:common.dialog.close;title:common.appName"></button>
                <span data-i18n="common.missing">Kept</span>
            </section>`;
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const root = document.getElementById('root');
        i18n.applyTranslations(root);
        expect(root.getAttribute('aria-label')).toBe('Datgloi’r Labordy');
        expect(root.querySelector('h1').textContent).toBe('Datgloi’r Labordy');
        expect(root.querySelector('p').innerHTML).toBe('Only in English');
        expect(root.querySelector('button').getAttribute('aria-label')).toBe('Close');
        expect(root.querySelector('button').title).toBe('Datgloi’r Labordy');
        expect(root.querySelector('span').textContent).toBe('Kept');
    });

    it('lists English first and saves a new locale before reloading', async () => {
        const { i18n, navigate } = makeTranslator();
        expect(i18n.availableLocales()).toEqual(['en', 'cy']);
        expect(i18n.setLocale('xx')).toBe(false);
        expect(navigate).not.toHaveBeenCalled();
        expect(i18n.setLocale('cy')).toBe(true);
        expect(localStorage.getItem(STORAGE_KEYS.locale)).toBe('cy');
        expect(navigate).toHaveBeenCalledWith(window.location.href);
    });

    it('updates an explicit ?lang= parameter when switching', () => {
        window.history.replaceState(null, '', '/?lang=en&room=OX-1');
        const { i18n, navigate } = makeTranslator();
        i18n.setLocale('cy');
        expect(new URL(navigate.mock.calls[0][0]).search).toBe('?lang=cy&room=OX-1');
        window.history.replaceState(null, '', '/');
    });

    it('keeps English when a translation file fails to load', async () => {
        const catalogue = fixtureCatalogue();
        catalogue.cy.common = () => Promise.reject(new Error('offline'));
        const i18n = createI18n({ catalogue, getSearch: () => '?lang=cy', getLanguages: () => [] });
        await i18n.initI18n();
        expect(i18n.t('common.appName')).toBe('Unlock the Lab');
    });

    it('formats numbers and dates for the locale, with British conventions for English', async () => {
        const { i18n } = makeTranslator();
        await i18n.initI18n();
        expect(i18n.formatNumber(1234.5)).toBe('1,234.5');
        expect(
            i18n.formatDate(Date.UTC(2026, 9, 21, 12), { dateStyle: 'long', timeZone: 'UTC' })
        ).toBe('21 October 2026');
        expect(
            i18n.formatDate(new Date(Date.UTC(2026, 9, 21, 12)), {
                dateStyle: 'long',
                timeZone: 'UTC',
            })
        ).toBe('21 October 2026');
    });

    it('shows a dash for missing dates instead of 1970 or now', async () => {
        const { i18n } = makeTranslator();
        await i18n.initI18n();
        for (const missing of [null, undefined, Number.NaN, new Date('nonsense'), '2026-10-21']) {
            expect(i18n.formatDate(missing)).toBe('–');
        }
    });
});

describe('default translator', () => {
    it('loads the real English files', async () => {
        expect(availableLocales()[0]).toBe('en');
        await initI18n();
        expect(t('common.appName')).toBe('Unlock the Lab');
        expect(t('common.counts.studies', { count: 1 })).toBe('1 study');
    });
});
