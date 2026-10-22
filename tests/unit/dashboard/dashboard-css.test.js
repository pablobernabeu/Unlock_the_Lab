/**
 * dashboard.css in forced-colours mode (Windows contrast themes), where the
 * browser replaces author backgrounds with the page colour and drops shadows:
 * the criterion bars must keep their fills and intervals, as the app's token
 * bars do (src/styles/app.css).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/dashboard.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    ''
);

/** The text inside every `@media (forced-colors: active)` block. */
function forcedColourBlocks(source) {
    const blocks = [];
    const opener = /@media\s*\(\s*forced-colors\s*:\s*active\s*\)\s*\{/g;
    for (const match of source.matchAll(opener)) {
        let depth = 1;
        let index = match.index + match[0].length;
        const start = index;
        while (depth > 0 && index < source.length) {
            if (source[index] === '{') depth += 1;
            if (source[index] === '}') depth -= 1;
            index += 1;
        }
        blocks.push(source.slice(start, index - 1));
    }
    return blocks.join('\n');
}

/** Declarations of the rules in `block` whose selector list includes `selector`. */
function declarationsFor(block, selector) {
    const declarations = {};
    for (const [, selectors, body] of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const list = selectors.split(',').map((item) => item.trim());
        if (!list.includes(selector)) continue;
        for (const declaration of body.split(';')) {
            const [property, ...value] = declaration.split(':');
            if (property.trim()) declarations[property.trim()] = value.join(':').trim();
        }
    }
    return declarations;
}

const SYSTEM_COLOURS = /^(Canvas|CanvasText|Highlight|HighlightText|LinkText|ButtonText)$/;

describe('criterion bars in forced colours', () => {
    const block = forcedColourBlocks(css);

    it('outlines the track so the scale stays visible', () => {
        expect(declarationsFor(block, '.criterion__track').border).toMatch(/CanvasText$/);
    });

    it('keeps the fill in a system colour', () => {
        const fill = declarationsFor(block, '.criterion__fill');
        expect(fill['forced-color-adjust']).toBe('none');
        expect(fill.background).toMatch(SYSTEM_COLOURS);
    });

    it('keeps the interval line, its end caps and its halo in system colours', () => {
        const whisker = declarationsFor(block, '.criterion__whisker');
        expect(whisker['forced-color-adjust']).toBe('none');
        expect(whisker.background).toBe('CanvasText');
        expect(whisker['box-shadow']).toMatch(/\bCanvas$/);
        for (const cap of ['.criterion__whisker::before', '.criterion__whisker::after']) {
            expect(declarationsFor(block, cap).background, cap).toBe('CanvasText');
        }
    });
});
