/**
 * Animation preference. Motion is allowed unless the device asks for reduced
 * motion or the person switched animations off with the toggle. The choice is
 * reflected as `data-motion="on|off"` on `<html>`, which base.css uses to stop
 * all animations and transitions.
 */
import { STORAGE_KEYS } from './config.js';
import { el } from './dom.js';
import { t } from './i18n.js';
import { safeGet, safeSet } from './storage.js';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const CHANGE_EVENT = 'utl:motionchange';

let toggleCount = 0;

/**
 * True when the device or browser asks for reduced motion.
 * @returns {boolean}
 */
export function systemPrefersReducedMotion() {
    return Boolean(globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches);
}

/**
 * True when the person has not switched animations off with the toggle.
 * @returns {boolean}
 */
export function userAllowsMotion() {
    return safeGet(STORAGE_KEYS.motion) !== 'off';
}

/**
 * True when decorative animation may run.
 * @returns {boolean}
 */
export function motionAllowed() {
    return userAllowsMotion() && !systemPrefersReducedMotion();
}

function applyMotionAttribute() {
    const html = globalThis.document?.documentElement;
    if (html) html.dataset.motion = motionAllowed() ? 'on' : 'off';
}

function notify() {
    applyMotionAttribute();
    globalThis.document?.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, { detail: { allowed: motionAllowed() } })
    );
}

/**
 * Saves the person's choice and updates the page.
 * @param {boolean} on
 * @returns {void}
 */
export function setMotion(on) {
    safeSet(STORAGE_KEYS.motion, on ? 'on' : 'off');
    notify();
}

/**
 * Calls `callback(allowed)` whenever the effective preference changes.
 * @param {(allowed: boolean) => void} callback
 * @returns {() => void} removes the listener
 */
export function onMotionChange(callback) {
    const listener = (event) => callback(event.detail.allowed);
    globalThis.document?.addEventListener(CHANGE_EVENT, listener);
    return () => globalThis.document?.removeEventListener(CHANGE_EVENT, listener);
}

/**
 * Applies the stored preference to `<html>` and follows changes to the system setting.
 * Call once at start-up.
 * @returns {void}
 */
export function initMotion() {
    applyMotionAttribute();
    globalThis.matchMedia?.(REDUCED_MOTION_QUERY).addEventListener?.('change', notify);
}

/**
 * Renders an 'Animations' switch (a native checkbox) into `container`. When
 * the system asks for reduced motion the switch is off and disabled, with a note.
 * @param {HTMLElement | null} container
 * @returns {HTMLInputElement | null}
 */
export function renderMotionToggle(container) {
    if (!container) return null;
    const id = `motion-toggle-${++toggleCount}`;
    const hintId = `${id}-hint`;
    const input = el('input', {
        id,
        type: 'checkbox',
        role: 'switch',
        class: 'motion-toggle__input',
        onChange: (event) => setMotion(event.target.checked),
    });
    const hint = el('span', { id: hintId, class: 'motion-toggle__hint' });

    const sync = () => {
        const systemReduced = systemPrefersReducedMotion();
        input.checked = motionAllowed();
        input.disabled = systemReduced;
        hint.textContent = systemReduced ? t('common.motion.reducedBySystem') : '';
        hint.hidden = !systemReduced;
        if (systemReduced) input.setAttribute('aria-describedby', hintId);
        else input.removeAttribute('aria-describedby');
    };
    sync();
    // Pages re-render their header, so a replaced switch stops listening instead of piling up.
    const stopListening = onMotionChange(() => {
        if (input.isConnected) sync();
        else stopListening();
    });

    container.replaceChildren(
        el(
            'div',
            { class: 'motion-toggle' },
            input,
            el('label', { for: id, class: 'motion-toggle__label' }, t('common.motion.label')),
            hint
        )
    );
    return input;
}
