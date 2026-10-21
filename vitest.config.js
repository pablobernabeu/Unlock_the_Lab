import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Unit tests only. Rules tests (tests/rules) need the emulators and have their
// own config; end-to-end tests (tests/e2e) run under Playwright.
// Tests that need a DOM opt in with a `// @vitest-environment jsdom` docblock.
export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    test: {
        include: ['tests/unit/**/*.test.js'],
        environment: 'node',
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
    },
});
