// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableLogoAnimation } from '../../../src/app/logo-animation.js';

const ICON = '/unlock-lab-icon.svg';
const INVERTED = '/unlock-lab-icon-inverted.svg';

let logo;
let animation;

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.documentElement.dataset.motion = 'on';
    logo = document.createElement('img');
    logo.setAttribute('src', ICON);
    logo.alt = '';
    document.body.append(logo);
    animation = enableLogoAnimation(logo);
});

afterEach(() => {
    animation.destroy();
    logo.remove();
    vi.useRealTimers();
});

describe('enableLogoAnimation', () => {
    it('flips to the inverted image and back', () => {
        logo.click();
        vi.advanceTimersByTime(700);
        expect(logo.getAttribute('src')).toBe(INVERTED);
        vi.advanceTimersByTime(4000);
        expect(logo.getAttribute('src')).toBe(ICON);
        expect(document.querySelector('.droplet-container')).toBeNull();
    });

    it('restores the normal image when a celebration starts during a flip', () => {
        logo.click();
        // The flip is showing the inverted image when the celebration starts.
        vi.advanceTimersByTime(700);
        animation.celebrate();
        vi.advanceTimersByTime(10000);
        expect(logo.getAttribute('src')).toBe(ICON);
    });

    it('does nothing while animations are switched off', () => {
        localStorage.setItem('utl.motion', 'off');
        logo.click();
        animation.celebrate();
        vi.advanceTimersByTime(700);
        expect(logo.getAttribute('src')).toBe(ICON);
        expect(document.querySelector('.droplet')).toBeNull();
    });
});
