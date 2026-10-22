import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInactivityMonitor } from '../../../src/app/inactivity.js';

const MINUTE = 60 * 1000;

let target;
let onWarning;
let onTimeout;
let monitor;

beforeEach(() => {
    vi.useFakeTimers();
    target = new EventTarget();
    onWarning = vi.fn();
    onTimeout = vi.fn();
    monitor = createInactivityMonitor({
        timeoutMs: 30 * MINUTE,
        warningMs: 5 * MINUTE,
        onWarning,
        onTimeout,
        target,
        now: () => Date.now(),
    });
});

afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
});

describe('createInactivityMonitor', () => {
    it('warns 5 minutes before the pause and pauses after 30 minutes without activity', () => {
        monitor.start();
        vi.advanceTimersByTime(25 * MINUTE - 1);
        expect(onWarning).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onWarning).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(5 * MINUTE);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('restarts the countdown on activity', () => {
        monitor.start();
        vi.advanceTimersByTime(20 * MINUTE);
        target.dispatchEvent(new Event('keydown'));
        vi.advanceTimersByTime(20 * MINUTE);
        expect(onWarning).not.toHaveBeenCalled();
        vi.advanceTimersByTime(10 * MINUTE);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('ignores activity in quick succession (at most one restart every 5 seconds)', () => {
        monitor.start();
        vi.advanceTimersByTime(1000);
        target.dispatchEvent(new Event('pointermove'));
        vi.advanceTimersByTime(25 * MINUTE - 1000);
        expect(onWarning).toHaveBeenCalledTimes(1);
    });

    it('stops listening after the pause and after stop()', () => {
        monitor.start();
        vi.advanceTimersByTime(30 * MINUTE);
        target.dispatchEvent(new Event('keydown'));
        vi.advanceTimersByTime(30 * MINUTE);
        expect(onTimeout).toHaveBeenCalledTimes(1);

        monitor.start();
        monitor.stop();
        vi.advanceTimersByTime(60 * MINUTE);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('once the warning is showing, only reset() restarts the countdown (no second warning)', () => {
        monitor.start();
        vi.advanceTimersByTime(25 * MINUTE);
        expect(onWarning).toHaveBeenCalledTimes(1);
        // Pointer movement over the open warning must not restart the countdown: the warning
        // says the session pauses in 5 minutes, and a restart would open a second warning later.
        target.dispatchEvent(new Event('pointermove'));
        vi.advanceTimersByTime(5 * MINUTE);
        expect(onTimeout).toHaveBeenCalledTimes(1);
        expect(onWarning).toHaveBeenCalledTimes(1);
    });

    it('accepts activity again after Continue (reset) dismissed the warning', () => {
        monitor.start();
        vi.advanceTimersByTime(25 * MINUTE);
        monitor.reset();
        vi.advanceTimersByTime(20 * MINUTE);
        target.dispatchEvent(new Event('keydown'));
        vi.advanceTimersByTime(20 * MINUTE);
        expect(onWarning).toHaveBeenCalledTimes(1);
        expect(onTimeout).not.toHaveBeenCalled();
    });

    it("reset() restarts the countdown, as the warning's Continue button does", () => {
        monitor.start();
        vi.advanceTimersByTime(26 * MINUTE);
        monitor.reset();
        vi.advanceTimersByTime(29 * MINUTE);
        expect(onTimeout).not.toHaveBeenCalled();
    });
});
