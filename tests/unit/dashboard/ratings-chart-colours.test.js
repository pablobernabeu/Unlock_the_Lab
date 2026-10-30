/**
 * The ratings chart reads its colours from the CSS tokens and falls back to
 * fixed values when a token is missing. The fallbacks must be the tokens'
 * own values, so a change of palette in base.css (such as the darker low
 * quality band) cannot leave the chart on an older colour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const chart = read('src/dashboard/ratings-chart.js');
const css = read('src/styles/base.css').replace(/\/\*[\s\S]*?\*\//g, '');

/** The value of a custom property declared in base.css, or null. */
function token(name) {
    const match = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(css);
    return match ? match[1].trim().toLowerCase() : null;
}

const fallbacks = [...chart.matchAll(/cssColour\('(--[a-z-]+)',\s*'([^']+)'\)/g)].map(
    ([, name, fallback]) => ({ name, fallback: fallback.toLowerCase() })
);

describe('ratings chart colour fallbacks', () => {
    it('reads every quality band colour', () => {
        expect(fallbacks.map(({ name }) => name)).toEqual(
            expect.arrayContaining([
                '--color-quality-low',
                '--color-quality-medium',
                '--color-quality-high',
            ])
        );
    });

    it.each(fallbacks)('falls back to the value of $name in base.css', ({ name, fallback }) => {
        expect(fallback).toBe(token(name));
    });
});
