// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../../../src/lib/i18n.js';
import { initToasts, showToast } from '../../../src/lib/toast.js';

beforeAll(async () => {
    await initI18n();
});

afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
});

describe('showToast', () => {
    it('shows messages in a polite status region', () => {
        initToasts();
        showToast('Link copied', { tone: 'success' });
        const region = document.querySelector('.toast-region');
        expect(region.getAttribute('role')).toBe('status');
        expect(region.getAttribute('aria-live')).toBe('polite');
        const toast = region.querySelector('.toast');
        expect(toast.classList.contains('toast--success')).toBe(true);
        expect(toast.querySelector('.toast__message').textContent).toBe('Link copied');
        expect(toast.querySelector('button').getAttribute('aria-label')).toBe('Dismiss message');
        expect(document.querySelectorAll('.toast-region')).toHaveLength(1);
    });

    it('disappears after the duration, pausing while hovered', () => {
        vi.useFakeTimers();
        showToast('Saved', { duration: 1000 });
        const toast = document.querySelector('.toast');
        toast.dispatchEvent(new Event('mouseenter'));
        vi.advanceTimersByTime(5000);
        expect(toast.isConnected).toBe(true);
        toast.dispatchEvent(new Event('mouseleave'));
        vi.advanceTimersByTime(1000);
        expect(toast.isConnected).toBe(false);
    });

    it('stays while focused or hovered, however the two overlap', () => {
        vi.useFakeTimers();
        showToast('Saved', { duration: 1000 });
        const toast = document.querySelector('.toast');
        const close = toast.querySelector('button');
        toast.dispatchEvent(new Event('mouseenter'));
        close.focus();
        close.blur();
        // Focus left but the pointer is still over the toast.
        vi.advanceTimersByTime(5000);
        expect(toast.isConnected).toBe(true);
        toast.dispatchEvent(new Event('mouseleave'));
        toast.dispatchEvent(new Event('mouseenter'));
        vi.advanceTimersByTime(5000);
        expect(toast.isConnected).toBe(true);
        toast.dispatchEvent(new Event('mouseleave'));
        vi.advanceTimersByTime(999);
        expect(toast.isConnected).toBe(true);
        vi.advanceTimersByTime(1);
        expect(toast.isConnected).toBe(false);
    });

    it('can be dismissed with the button or the returned function', () => {
        const dismiss = showToast('One', { duration: 0 });
        showToast('Two', { duration: 0 });
        document.querySelectorAll('.toast button')[1].click();
        expect(document.querySelectorAll('.toast')).toHaveLength(1);
        dismiss();
        expect(document.querySelectorAll('.toast')).toHaveLength(0);
    });

    it('treats messages as text', () => {
        showToast('<img src=x onerror=alert(1)>');
        expect(document.querySelector('.toast img')).toBeNull();
    });
});
