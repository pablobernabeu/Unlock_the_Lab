// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../src/lib/config.js';
import { initI18n } from '../../../src/lib/i18n.js';
import {
    initMotion,
    motionAllowed,
    onMotionChange,
    renderMotionToggle,
    setMotion,
    systemPrefersReducedMotion,
} from '../../../src/lib/motion.js';

function mockReducedMotion(matches) {
    const listeners = new Set();
    const query = {
        matches,
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
    };
    window.matchMedia = vi.fn(() => query);
    return {
        change(value) {
            query.matches = value;
            listeners.forEach((listener) => listener({ matches: value }));
        },
    };
}

beforeAll(async () => {
    await initI18n();
});

afterEach(() => {
    localStorage.clear();
    delete window.matchMedia;
    document.body.innerHTML = '';
    delete document.documentElement.dataset.motion;
});

describe('motionAllowed', () => {
    it('is true by default, also where matchMedia is missing', () => {
        expect(systemPrefersReducedMotion()).toBe(false);
        expect(motionAllowed()).toBe(true);
    });

    it('respects the system setting and the stored choice', () => {
        mockReducedMotion(true);
        expect(motionAllowed()).toBe(false);
        mockReducedMotion(false);
        localStorage.setItem(STORAGE_KEYS.motion, 'off');
        expect(motionAllowed()).toBe(false);
    });
});

describe('setMotion and initMotion', () => {
    it('store the choice, set data-motion on <html> and notify listeners', () => {
        const listener = vi.fn();
        const stop = onMotionChange(listener);
        initMotion();
        expect(document.documentElement.dataset.motion).toBe('on');
        setMotion(false);
        expect(localStorage.getItem(STORAGE_KEYS.motion)).toBe('off');
        expect(document.documentElement.dataset.motion).toBe('off');
        expect(listener).toHaveBeenLastCalledWith(false);
        setMotion(true);
        expect(document.documentElement.dataset.motion).toBe('on');
        stop();
        setMotion(false);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('follow changes to the system setting', () => {
        const media = mockReducedMotion(false);
        initMotion();
        expect(document.documentElement.dataset.motion).toBe('on');
        media.change(true);
        expect(document.documentElement.dataset.motion).toBe('off');
    });
});

describe('renderMotionToggle', () => {
    it('renders a labelled switch that turns animation off and on', () => {
        const container = document.createElement('div');
        document.body.append(container);
        const input = renderMotionToggle(container);
        expect(input.getAttribute('role')).toBe('switch');
        expect(input.checked).toBe(true);
        expect(container.querySelector(`label[for="${input.id}"]`).textContent).toBe('Animations');
        input.click();
        expect(motionAllowed()).toBe(false);
        expect(input.checked).toBe(false);
        input.click();
        expect(motionAllowed()).toBe(true);
    });

    it('is off and disabled, with a note, when the system asks for reduced motion', () => {
        mockReducedMotion(true);
        const container = document.createElement('div');
        const input = renderMotionToggle(container);
        expect(input.checked).toBe(false);
        expect(input.disabled).toBe(true);
        const hint = container.querySelector(`#${input.getAttribute('aria-describedby')}`);
        expect(hint.textContent).toBe('Off because your device is set to reduce motion.');
    });

    it('stops listening once the switch is replaced', () => {
        const container = document.createElement('div');
        document.body.append(container);
        const removeListener = vi.spyOn(document, 'removeEventListener');
        const old = renderMotionToggle(container);
        const current = renderMotionToggle(container);
        setMotion(false);
        expect(current.checked).toBe(false);
        expect(old.checked).toBe(true);
        expect(removeListener).toHaveBeenCalledWith('utl:motionchange', expect.any(Function));
    });

    it('renders nothing without a container', () => {
        expect(renderMotionToggle(null)).toBeNull();
    });
});
