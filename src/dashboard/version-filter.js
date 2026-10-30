/**
 * The content-version filter: which version's ratings the chart, the
 * statistics table and the study details show. It is kept in step with the
 * page URL (`?version=2`, or `?version=all` for every version); the current
 * version, the default, needs no parameter.
 */
import { CONTENT_VERSION } from '../lib/config.js';
import { CONTENT_VERSIONS } from '../lib/content.js';
import { announce, el, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

/** The `version` parameter and option value for every version together. */
export const ALL_VERSIONS = 'all';

/**
 * The version a `version` parameter selects.
 * @param {string|null} value
 * @param {object} [options]
 * @param {number[]} [options.versions] known content versions
 * @param {number} [options.current]
 * @returns {number|null} a known version, null for all versions, the current version otherwise
 */
export function versionFromParam(
    value,
    { versions = CONTENT_VERSIONS, current = CONTENT_VERSION } = {}
) {
    if (value === ALL_VERSIONS) return null;
    const version = Number(value);
    return versions.includes(version) && String(version) === value ? version : current;
}

/**
 * The page URL with `version` set, or removed for the current version. Other parameters stay.
 * @param {string} href current URL
 * @param {number|null} version null for all versions
 * @param {number} [current]
 * @returns {string}
 */
export function urlWithVersion(href, version, current = CONTENT_VERSION) {
    const url = new URL(href);
    if (version === current) url.searchParams.delete('version');
    else url.searchParams.set('version', version === null ? ALL_VERSIONS : String(version));
    return url.toString();
}

function optionLabel(version) {
    if (version === null) return t('dashboard.version.all');
    if (version === CONTENT_VERSION) return t('dashboard.version.current', { version });
    return t('dashboard.version.earlier', { version });
}

function hintText(version) {
    let selected;
    if (version === null) selected = t('dashboard.version.hintAll');
    else if (version === CONTENT_VERSION) selected = t('dashboard.version.hintCurrent');
    else selected = t('dashboard.version.hintEarlier', { version });
    return `${selected} ${t('dashboard.version.hintScope')}`;
}

/**
 * Wires up the version select: the newest version first, then every version together.
 * @param {object} options
 * @param {HTMLSelectElement} options.select
 * @param {HTMLElement} options.hint
 * @param {number|null} options.initialVersion from the URL (see versionFromParam)
 * @param {(version: number|null) => void} options.onChange null for all versions
 * @returns {void}
 */
export function createVersionFilter({ select, hint, initialVersion, onChange }) {
    let current = initialVersion;
    const value = (version) => (version === null ? ALL_VERSIONS : String(version));

    select.replaceChildren(
        ...[...CONTENT_VERSIONS]
            .reverse()
            .map((version) => el('option', { value: value(version) }, optionLabel(version))),
        el('option', { value: ALL_VERSIONS }, optionLabel(null))
    );
    select.value = value(current);

    function syncUrl() {
        const next = urlWithVersion(location.href, current);
        if (next !== location.href) history.replaceState(history.state, '', next);
    }

    select.addEventListener('change', () => {
        current = versionFromParam(select.value);
        syncUrl();
        setText(hint, hintText(current));
        announce(
            current === null
                ? t('dashboard.version.announceAll')
                : t('dashboard.version.announce', { version: current })
        );
        onChange(current);
    });

    setText(hint, hintText(current));
    // An unknown version in the link is dropped, which leaves the current one.
    if (new URL(location.href).searchParams.has('version')) syncUrl();
}
