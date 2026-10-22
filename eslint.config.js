import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'dist/**',
            'dist-e2e/**',
            'node_modules/**',
            'analysis/**',
            'coverage/**',
            'playwright-report/**',
            'test-results/**',
            'blob-report/**',
            '.firebase/**',
            '.tmp-*/**',
        ],
    },
    js.configs.recommended,
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'error',
        },
        rules: {
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            'no-var': 'error',
            'prefer-const': 'error',
            'object-shorthand': 'error',
        },
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                __APP_VERSION__: 'readonly',
            },
        },
    },
    {
        files: ['tests/**/*.js', 'scripts/**/*.{js,mjs}', 'tools/**/*.js', '*.config.js', '*.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        // Unit tests run some files under jsdom, and Playwright specs pass
        // functions to the browser, so tests may use browser globals too.
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
];
