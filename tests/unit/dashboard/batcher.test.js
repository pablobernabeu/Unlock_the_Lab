import { describe, expect, it, vi } from 'vitest';
import { BATCH_WINDOW_MS, createBatcher } from '../../../src/dashboard/batcher.js';

function manualScheduler() {
    const waits = [];
    const frames = [];
    return {
        wait: vi.fn((callback, ms) => waits.push({ callback, ms })),
        frame: vi.fn((callback) => frames.push(callback)),
        runWaits: () => waits.splice(0).forEach(({ callback }) => callback()),
        runFrames: () => frames.splice(0).forEach((callback) => callback()),
    };
}

describe('createBatcher', () => {
    it('collects changes for one window and renders them together in a frame', () => {
        const scheduler = manualScheduler();
        const render = vi.fn();
        const batcher = createBatcher(render, scheduler);

        batcher.mark('ratings');
        batcher.mark('leaderboard', 'ratings');
        expect(scheduler.wait).toHaveBeenCalledTimes(1);
        expect(scheduler.wait.mock.calls[0][1]).toBe(BATCH_WINDOW_MS);
        expect(render).not.toHaveBeenCalled();

        scheduler.runWaits();
        expect(render).not.toHaveBeenCalled();
        scheduler.runFrames();
        expect(render).toHaveBeenCalledTimes(1);
        expect([...render.mock.calls[0][0]].sort()).toEqual(['leaderboard', 'ratings']);
    });

    it('starts a new window for changes after a render', () => {
        const scheduler = manualScheduler();
        const render = vi.fn();
        const batcher = createBatcher(render, scheduler);
        batcher.mark('active');
        scheduler.runWaits();
        scheduler.runFrames();
        batcher.mark('clock');
        expect(scheduler.wait).toHaveBeenCalledTimes(2);
        scheduler.runWaits();
        scheduler.runFrames();
        expect(render).toHaveBeenCalledTimes(2);
        expect([...render.mock.calls[1][0]]).toEqual(['clock']);
    });

    it('renders pending changes at once on flush and skips the empty scheduled render', () => {
        const scheduler = manualScheduler();
        const render = vi.fn();
        const batcher = createBatcher(render, scheduler);
        batcher.mark('room');
        batcher.flush();
        expect(render).toHaveBeenCalledTimes(1);
        scheduler.runWaits();
        scheduler.runFrames();
        expect(render).toHaveBeenCalledTimes(1);
        batcher.flush();
        expect(render).toHaveBeenCalledTimes(1);
    });

    it('uses timers and animation frames by default', async () => {
        vi.useFakeTimers();
        try {
            const render = vi.fn();
            const batcher = createBatcher(render, { delay: 50 });
            batcher.mark('ratings');
            await vi.advanceTimersByTimeAsync(49);
            expect(render).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(20);
            expect(render).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
