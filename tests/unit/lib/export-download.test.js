// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { downloadFile } from '../../../src/lib/export.js';

describe('downloadFile', () => {
    it('clicks a temporary download link and revokes the URL later', () => {
        vi.useFakeTimers();
        URL.createObjectURL = vi.fn(() => 'blob:fake');
        URL.revokeObjectURL = vi.fn();
        const clicks = [];
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(function () {
                clicks.push({ href: this.href, download: this.download });
            });

        downloadFile('ratings.csv', 'a,b\r\n', 'text/csv;charset=utf-8');

        expect(click).toHaveBeenCalledTimes(1);
        expect(clicks[0]).toEqual({ href: 'blob:fake', download: 'ratings.csv' });
        expect(URL.createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
        expect(document.querySelector('a[download]')).toBeNull();
        vi.advanceTimersByTime(1000);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
        vi.useRealTimers();
    });
});
