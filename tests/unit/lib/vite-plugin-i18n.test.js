import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18nPrerender, { loadMessages, prerenderHtml } from '../../../tools/vite-plugin-i18n.js';
import { ROOT, loadLocale } from './i18n-keys.js';

const messages = {
    common: {
        appName: 'Unlock the Lab',
        risky: 'Tom & Jerry <script>alert(1)</script> "quoted"',
        rich: 'Read the <a href="https://example.org/?a=1&amp;b=2">licence</a>',
        counts: { studies: { one: '{count} study', other: '{count} studies' } },
    },
};

const temporaryDirectories = [];

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0))
        rmSync(directory, { recursive: true, force: true });
});

function localeDirectory(files) {
    const directory = mkdtempSync(join(tmpdir(), 'utl-i18n-'));
    temporaryDirectories.push(directory);
    for (const [name, content] of Object.entries(files))
        writeFileSync(join(directory, name), content);
    return directory;
}

/** Runs the plugin's hooks the way Vite does. */
function runPlugin({ command, directory, html }) {
    const plugin = i18nPrerender({ localeDir: directory });
    const logger = { warn: vi.fn() };
    plugin.configResolved({ root: '/', command, logger });
    const output = plugin.transformIndexHtml.handler(html, {
        filename: '/page.html',
        path: '/page.html',
    });
    return { output, logger, plugin };
}

describe('prerenderHtml', () => {
    it('fills text, trusted HTML and attributes', () => {
        const { html, missing } = prerenderHtml(
            `<title data-i18n="common.appName">x</title>
<p data-i18n="common.risky">old</p>
<p data-i18n-html="common.rich">old</p>
<input data-i18n-attr="placeholder:common.risky; aria-label:common.appName">`,
            messages
        );
        expect(missing).toEqual([]);
        expect(html).toContain('<title data-i18n="common.appName">Unlock the Lab</title>');
        expect(html).toContain('Tom &amp; Jerry &lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('Read the <a href="https://example.org/?a=1&amp;b=2">licence</a>');
        expect(html).toContain(
            'placeholder="Tom &amp; Jerry &lt;script&gt;alert(1)&lt;/script&gt; &quot;quoted&quot;"'
        );
        expect(html).toContain('aria-label="Unlock the Lab"');
    });

    it('keeps the attributes for the runtime translator', () => {
        const { html } = prerenderHtml('<h1 data-i18n="common.appName"></h1>', messages);
        expect(html).toBe('<h1 data-i18n="common.appName">Unlock the Lab</h1>');
    });

    it('lists every missing key and leaves those elements alone', () => {
        const { html, missing } = prerenderHtml(
            `<h1 data-i18n="common.nope">Fallback</h1>
<p data-i18n-html="app.missing">x</p>
<span data-i18n="common.counts.studies">n</span>
<input data-i18n-attr="placeholder:common.alsoMissing">
<input data-i18n-attr="nonsense">`,
            messages
        );
        expect(html).toContain('<h1 data-i18n="common.nope">Fallback</h1>');
        expect(missing).toEqual([
            'common.nope',
            'common.counts.studies (plural forms need a count; set it at run time)',
            'app.missing',
            'common.alsoMissing',
            "(malformed data-i18n-attr 'nonsense')",
        ]);
    });

    it('leaves pages without i18n attributes unchanged', () => {
        const page = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>T &amp; x</title>
<style>a > b { content: "<x>"; }</style>
<script type="module">if (a < b && c > d) { console.log('</div>'); }</script>
<script type="module" src="/src/app/main.js"></script></head>
<body>
<!-- a comment with <tags> -->
<input type="checkbox" checked disabled>
<p class=unquoted data-x='single' title="a &quot;q&quot;">Text &nbsp; &copy; &lt;b&gt; more</p>
<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0L10 10"></path></svg>
<pre>  keep
   spacing  </pre>
<textarea>  raw <b> text </textarea>
<template id="row"><li><span>item</span></li></template>
</body>
</html>
`;
        expect(prerenderHtml(page, messages).html).toBe(page);
    });

    it('edits only the translated parts and keeps all other markup byte for byte', () => {
        // node-html-parser would rebuild this select without its second option.
        const page = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title data-i18n="common.appName">x</title>
    </head>
    <body>
        <img
            class="logo"
            src="/unlock-lab-icon.svg"
            alt=""
        />
        <select><option value=1>One<option value=2 selected>Two</select>
        <ul><li>First<li>Second</ul>
        <p>Unclosed <em>emphasis
        <nav
            class="cluster"
            data-i18n-attr="aria-label:common.appName"
            aria-label="Main"
        >
            <a href=/dashboard/ data-i18n-attr="title:common.appName">Dashboard</a>
        </nav>
    </body>
</html>
`;
        const expected = page
            .replace(
                '<title data-i18n="common.appName">x</title>',
                '<title data-i18n="common.appName">Unlock the Lab</title>'
            )
            .replace('aria-label="Main"', 'aria-label="Unlock the Lab"')
            .replace('<a href=/dashboard/', '<a title="Unlock the Lab" href=/dashboard/');
        const { html, missing } = prerenderHtml(page, messages);
        expect(missing).toEqual([]);
        expect(html).toBe(expected);
    });

    it('requires an explicit end tag on elements it fills', () => {
        const page = '<ul><li data-i18n="common.appName">x<li>y</ul>';
        const { html, missing } = prerenderHtml(page, messages);
        expect(html).toBe(page);
        expect(missing).toEqual(['(<li data-i18n="common.appName"> needs an explicit end tag)']);
    });

    it('refuses strings with placeholders, which only t() can fill', () => {
        const { html, missing } = prerenderHtml('<p data-i18n="common.version">x</p>', {
            common: { version: 'Version {version}' },
        });
        expect(html).toBe('<p data-i18n="common.version">x</p>');
        expect(missing).toEqual(['common.version (has placeholders; set it at run time)']);
    });

    it('lets an outer element win over translated elements inside it, as at run time', () => {
        const { html } = prerenderHtml(
            '<div data-i18n-html="common.rich"><span data-i18n="common.appName">x</span></div>',
            messages
        );
        expect(html).toBe(
            '<div data-i18n-html="common.rich">Read the <a href="https://example.org/?a=1&amp;b=2">licence</a></div>'
        );
    });

    it('fills elements inside templates', () => {
        const { html } = prerenderHtml(
            '<template id="t"><li><span data-i18n="common.appName">x</span></li></template>',
            messages
        );
        expect(html).toContain('<span data-i18n="common.appName">Unlock the Lab</span>');
    });
});

describe('loadMessages', () => {
    it('reads one namespace per JSON file', () => {
        const directory = localeDirectory({
            'common.json': '{"appName": "A"}',
            'app.json': '{"welcome": {"title": "B"}}',
            'notes.txt': 'ignored',
        });
        expect(loadMessages(directory)).toEqual({
            app: { welcome: { title: 'B' } },
            common: { appName: 'A' },
        });
    });

    it('names the file when JSON is invalid', () => {
        const directory = localeDirectory({ 'common.json': '{"appName": ' });
        expect(() => loadMessages(directory)).toThrow(/common\.json is not valid JSON/);
    });
});

describe('i18nPrerender plugin', () => {
    const page = '<h1 data-i18n="common.appName">x</h1><p data-i18n="common.missing">y</p>';

    it('fails the build with the list of missing keys', () => {
        const directory = localeDirectory({ 'common.json': '{"appName": "A"}' });
        expect(() => runPlugin({ command: 'build', directory, html: page })).toThrow(
            /page\.html: missing English strings[\s\S]*common\.missing/
        );
    });

    it('warns on the dev server and still renders the page', () => {
        const directory = localeDirectory({ 'common.json': '{"appName": "A"}' });
        const { output, logger } = runPlugin({ command: 'serve', directory, html: page });
        expect(output).toContain('<h1 data-i18n="common.appName">A</h1>');
        expect(output).toContain('<p data-i18n="common.missing">y</p>');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('common.missing'));
    });

    it('runs before Vite processes the HTML', () => {
        expect(i18nPrerender().transformIndexHtml.order).toBe('pre');
    });
});

describe('real pages', () => {
    it('404.html has every string it needs', () => {
        const html = readFileSync(join(ROOT, '404.html'), 'utf8');
        const { html: rendered, missing } = prerenderHtml(html, loadLocale('en'));
        expect(missing).toEqual([]);
        expect(rendered).toContain('<script type="module" src="/src/lib/static-page.js"></script>');
        expect(rendered).toContain('<link rel="stylesheet" href="/src/styles/base.css"');
        expect(rendered).toMatch(/<h1 data-i18n="common.notFound.heading">Page not found<\/h1>/);
    });
});
