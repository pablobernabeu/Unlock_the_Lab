/**
 * Language selector. It renders nothing while English is the only locale, so
 * it appears by itself once a translation is added under src/i18n/<code>/.
 */
import { el } from './dom.js';
import { availableLocales, getLocale, setLocale, t } from './i18n.js';

let instanceCount = 0;

/**
 * The name of a language in that language, e.g. 'Cymraeg' for 'cy'.
 * @param {string} code
 * @returns {string}
 */
export function localeName(code) {
    try {
        const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
        return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
    } catch {
        return code;
    }
}

/**
 * Renders a labelled `<select>` with a 'Change language' button into
 * `container` when more than one locale exists. Changing the language saves
 * it and reloads the page, so it waits for the button: a select that acted on
 * `change` would reload as soon as a keyboard user arrows through the options
 * (WCAG 3.2.2 On Input).
 * @param {HTMLElement | null} container
 * @param {object} [options]
 * @param {string[]} [options.locales] defaults to availableLocales()
 * @param {(code: string) => void} [options.apply] defaults to setLocale
 * @returns {HTMLSelectElement | null} the select, or null when nothing was rendered
 */
export function renderLocaleSwitcher(
    container,
    { locales = availableLocales(), apply = setLocale } = {}
) {
    if (!container || locales.length < 2) return null;

    const id = `locale-switcher-${++instanceCount}`;
    const current = getLocale();
    const select = el(
        'select',
        { id, class: 'locale-switcher__select' },
        locales.map((code) =>
            el('option', { value: code, lang: code, selected: code === current }, localeName(code))
        )
    );
    const onSubmit = (event) => {
        event.preventDefault();
        if (select.value !== current) apply(select.value);
    };
    container.replaceChildren(
        el(
            'form',
            { class: 'locale-switcher', onSubmit },
            el('label', { for: id }, t('common.language.label')),
            select,
            el(
                'button',
                { type: 'submit', class: 'btn btn-secondary btn-small' },
                t('common.language.apply')
            )
        )
    );
    return select;
}
