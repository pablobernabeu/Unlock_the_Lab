import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import i18nPrerender from './tools/vite-plugin-i18n.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

// Modes: `vite` (development) and `vite build --mode test` use the Firebase
// emulators (.env.development, .env.test); `vite build` targets production;
// `vite --mode live` is a development server against production (.env.live).
// Test builds go to dist-e2e/, so they never replace the production build in
// dist/ that Firebase Hosting publishes.
export default defineConfig(({ mode }) => ({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [i18nPrerender()],
    build: {
        outDir: mode === 'test' ? 'dist-e2e' : 'dist',
        assetsDir: 'assets',
        // Browsers that have supported a feature set for 30 months (Vite's default, stated for clarity).
        target: 'baseline-widely-available',
        sourcemap: true,
        rolldownOptions: {
            input: {
                main: resolve(root, 'index.html'),
                dashboard: resolve(root, 'dashboard.html'),
                admin: resolve(root, 'admin.html'),
                notFound: resolve(root, '404.html'),
            },
        },
    },
    server: {
        port: 3000,
        strictPort: true,
    },
    preview: {
        port: 4173,
        strictPort: true,
    },
}));
