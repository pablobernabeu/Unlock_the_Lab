import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../../src/styles/base.css', import.meta.url), 'utf8');

function luminance(hex) {
    const channels = [0, 2, 4].map(
        (offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255
    );
    const [r, g, b] = channels.map((c) =>
        c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
}

/** Colour tokens defined in the :root block, e.g. {'--color-text': '#1e293b'}. */
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const tokens = Object.fromEntries(
    [...rootBlock.matchAll(/^\s*(--color-[\w-]+):\s*(#[0-9a-f]{6});/gim)].map(([, name, hex]) => [
        name,
        hex.toLowerCase(),
    ])
);

/** Rows of the contrast comment, with the threshold of the section they are in. */
function recordedPairs() {
    const header = css.slice(0, css.indexOf('*/'));
    const rows = [];
    let threshold = null;
    for (const line of header.split('\n')) {
        if (/needs? 4\.5:1/.test(line)) threshold = 4.5;
        else if (/need 3:1/.test(line)) threshold = 3;
        else if (/Decorative only/.test(line)) threshold = null;
        const match = line.match(
            /^\s*\*\s+(\S+)\s+(#[0-9a-f]{6}) on (\S+)\s+(#[0-9a-f]{6})\s+([\d.]+):1/i
        );
        if (match && threshold) {
            const [, foreground, foregroundHex, background, backgroundHex, ratio] = match;
            rows.push({
                foreground,
                foregroundHex,
                background,
                backgroundHex,
                ratio: Number(ratio),
                threshold,
            });
        }
    }
    return rows;
}

describe('base.css colour contrast record', () => {
    const rows = recordedPairs();

    it('records the token pairs', () => {
        expect(rows.length).toBeGreaterThan(40);
    });

    it('matches the token values, the computed ratios and the WCAG AA thresholds', () => {
        for (const row of rows) {
            const label = `${row.foreground} on ${row.background}`;
            if (row.foreground.startsWith('--'))
                expect(tokens[row.foreground], label).toBe(row.foregroundHex.toLowerCase());
            if (row.background.startsWith('--'))
                expect(tokens[row.background], label).toBe(row.backgroundHex.toLowerCase());
            const ratio = contrast(
                row.foregroundHex.toLowerCase(),
                row.backgroundHex.toLowerCase()
            );
            expect(ratio.toFixed(2), label).toBe(row.ratio.toFixed(2));
            expect(ratio, label).toBeGreaterThanOrEqual(row.threshold);
        }
    });
});

describe('base.css essentials', () => {
    it('keeps the v1 brand colours as tokens', () => {
        expect(tokens['--color-brand']).toBe('#20b2aa');
        expect(tokens['--color-accent']).toBe('#667eea');
        expect(tokens['--color-purple']).toBe('#764ba2');
    });

    it('has a visible focus ring, skip link and visually hidden helper', () => {
        expect(css).toMatch(/:focus-visible\s*{\s*outline: 3px solid var\(--color-focus\)/);
        expect(css).toContain('.skip-link:focus');
        expect(css).toContain('.visually-hidden');
    });

    it('stops animations for reduced motion and for data-motion="off"', () => {
        expect(css).toMatch(
            /@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?animation-duration: 0\.01ms !important/
        );
        expect(css).toMatch(
            /:root\[data-motion='off'\] \*[\s\S]*?transition-duration: 0\.01ms !important/
        );
    });
});
