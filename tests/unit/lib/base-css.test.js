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

/** Machado, Oliveira and Fernandes (2009) simulation matrices at severity 1, for linear sRGB. */
const DEFICIENCIES = {
    'normal vision': [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ],
    protanopia: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
    ],
    deuteranopia: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.01182, 0.04294, 0.968881],
    ],
    tritanopia: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.3039],
    ],
};

/** CIELAB (D65) of a colour as someone with `deficiency` sees it. */
function simulatedLab(hex, deficiency) {
    const linear = [0, 2, 4]
        .map((offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const [r, g, b] = DEFICIENCIES[deficiency].map((row) =>
        Math.min(1, Math.max(0, row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]))
    );
    const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIEDE2000 colour difference (Sharma, Wu and Dalal 2005). */
function ciede2000([l1, a1, b1], [l2, a2, b2]) {
    const rad = Math.PI / 180;
    const meanC = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
    const g = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)));
    const [ap1, ap2] = [(1 + g) * a1, (1 + g) * a2];
    const [cp1, cp2] = [Math.hypot(ap1, b1), Math.hypot(ap2, b2)];
    const hue = (a, b) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
    const [hp1, hp2] = [hue(ap1, b1), hue(ap2, b2)];
    const chromatic = cp1 * cp2 !== 0;
    let dh = chromatic ? hp2 - hp1 : 0;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
    const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh / 2) * rad);
    const meanL = (l1 + l2) / 2;
    const meanCp = (cp1 + cp2) / 2;
    let meanH = hp1 + hp2;
    if (chromatic) {
        if (Math.abs(hp1 - hp2) <= 180) meanH /= 2;
        else meanH = meanH < 360 ? (meanH + 360) / 2 : (meanH - 360) / 2;
    }
    const t =
        1 -
        0.17 * Math.cos((meanH - 30) * rad) +
        0.24 * Math.cos(2 * meanH * rad) +
        0.32 * Math.cos((3 * meanH + 6) * rad) -
        0.2 * Math.cos((4 * meanH - 63) * rad);
    const sl = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2);
    const sc = 1 + 0.045 * meanCp;
    const sh = 1 + 0.015 * meanCp * t;
    const rt =
        -Math.sin(2 * 30 * Math.exp(-(((meanH - 275) / 25) ** 2)) * rad) *
        2 *
        Math.sqrt(meanCp ** 7 / (meanCp ** 7 + 25 ** 7));
    const [lTerm, cTerm, hTerm] = [(l2 - l1) / sl, (cp2 - cp1) / sc, dH / sh];
    return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rt * cTerm * hTerm);
}

/** Rows of the colour-vision record, e.g. {deficiency: 'tritanopia', distance: 13.7, pair: 'low / medium'}. */
function recordedBandDistances() {
    const header = css.slice(0, css.indexOf('*/'));
    return [
        ...header.matchAll(/^\s*\*\s+(normal vision|\w+opia)\s+([\d.]+)\s+(\w+ \/ \w+)$/gm),
    ].map(([, deficiency, distance, pair]) => ({ deficiency, distance: Number(distance), pair }));
}

describe('ciede2000', () => {
    it('matches the reference pairs of Sharma, Wu and Dalal (2005)', () => {
        const pairs = [
            [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
            [[50, 0, 0], [50, -1, 2], 2.3669],
            [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
            [[50, 2.5, 0], [73, 25, -18], 27.1492],
            [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
            [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
        ];
        for (const [first, second, expected] of pairs) {
            expect(ciede2000(first, second)).toBeCloseTo(expected, 4);
        }
    });
});

describe('quality band colours with colour-vision deficiency', () => {
    const bands = ['low', 'medium', 'high'];
    const hex = (band) => tokens[`--color-quality-${band}`];

    it('records the smallest distance between two bands for each simulation', () => {
        const rows = recordedBandDistances();
        expect(rows.map((row) => row.deficiency)).toEqual(Object.keys(DEFICIENCIES));
        for (const { deficiency, distance, pair } of rows) {
            const distances = [];
            for (const [i, first] of bands.entries()) {
                for (const second of bands.slice(i + 1)) {
                    const value = ciede2000(
                        simulatedLab(hex(first), deficiency),
                        simulatedLab(hex(second), deficiency)
                    );
                    distances.push({ value, pair: `${first} / ${second}` });
                }
            }
            const smallest = distances.reduce((a, b) => (b.value < a.value ? b : a));
            expect(smallest.value.toFixed(1), deficiency).toBe(distance.toFixed(1));
            expect(smallest.pair, deficiency).toBe(pair);
            expect(smallest.value, deficiency).toBeGreaterThanOrEqual(10);
        }
    });

    it('keeps every band well apart from white', () => {
        for (const deficiency of Object.keys(DEFICIENCIES)) {
            for (const band of bands) {
                const distance = ciede2000(
                    simulatedLab(hex(band), deficiency),
                    simulatedLab('#ffffff', deficiency)
                );
                expect(distance, `${band}, ${deficiency}`).toBeGreaterThanOrEqual(44);
            }
        }
    });

    it('keeps low the darkest band and medium the lightest', () => {
        const lightness = (band) => simulatedLab(hex(band), 'normal vision')[0];
        expect(lightness('low')).toBeLessThan(lightness('high'));
        expect(lightness('high')).toBeLessThan(lightness('medium'));
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
