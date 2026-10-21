import { defineConfig } from 'vitest/config';

// Security rules tests. They need the database emulator, so run them with
// `npm run test:rules`, which wraps vitest in `firebase emulators:exec`.
export default defineConfig({
    test: {
        include: ['tests/rules/**/*.test.js'],
        environment: 'node',
        testTimeout: 20_000,
        hookTimeout: 30_000,
    },
});
