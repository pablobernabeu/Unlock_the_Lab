// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { localeName, renderLocaleSwitcher } from '../../../src/lib/locale-switcher.js';
import { initI18n } from '../../../src/lib/i18n.js';

afterEach(() => {
    document.body.innerHTML = '';
});

describe('renderLocaleSwitcher', () => {
    it('renders nothing while English is the only locale', () => {
        const container = document.createElement('div');
        expect(renderLocaleSwitcher(container)).toBeNull();
        expect(container.children).toHaveLength(0);
    });

    it('renders a labelled select once a second locale exists', async () => {
        await initI18n();
        const container = document.createElement('div');
        document.body.append(container);
        const select = renderLocaleSwitcher(container, { locales: ['en', 'cy'] });
        expect(container.querySelector(`label[for="${select.id}"]`).textContent).toBe('Language');
        expect(
            [...select.options].map((option) => [option.value, option.lang, option.textContent])
        ).toEqual([
            ['en', 'en', 'English'],
            ['cy', 'cy', 'Cymraeg'],
        ]);
        expect(select.value).toBe('en');
    });

    it('switches only when the button is pressed, not while choosing (WCAG 3.2.2)', async () => {
        await initI18n();
        const container = document.createElement('div');
        document.body.append(container);
        const apply = vi.fn();
        const select = renderLocaleSwitcher(container, { locales: ['en', 'cy'], apply });
        select.value = 'cy';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        expect(apply).not.toHaveBeenCalled();
        const button = container.querySelector('button[type="submit"]');
        expect(button.textContent).toBe('Change language');
        button.click();
        expect(apply).toHaveBeenCalledWith('cy');
    });
});

describe('localeName', () => {
    it('names languages in their own language', () => {
        expect(localeName('en')).toBe('English');
        expect(localeName('fr')).toBe('Français');
        expect(localeName('not a locale')).toBe('not a locale');
    });
});
