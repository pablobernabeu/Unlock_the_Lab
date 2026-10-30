// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createNotices } from '../../../src/app/notices.js';

let notices;

beforeEach(() => {
    document.body.innerHTML = `
        <main id="main" tabindex="-1">
            <div id="app-notice" hidden></div>
            <section class="view" id="view-a" hidden><h1>Other view</h1></section>
            <section class="view" id="view-b"><h1>Study 2 of 48</h1></section>
        </main>`;
    notices = createNotices(document.getElementById('app-notice'));
});

const button = (name) =>
    [...document.querySelectorAll('#app-notice button')].find(
        (candidate) => candidate.textContent === name
    );

describe('createNotices', () => {
    it('moves focus to the view heading when a focused notice is dismissed', () => {
        notices.show('resume', { text: 'You are continuing a session.', dismissible: true });
        const dismiss = document.querySelector('#app-notice .btn-link');
        dismiss.focus();
        dismiss.click();
        expect(document.querySelector('[data-notice]')).toBeNull();
        expect(document.getElementById('app-notice').hidden).toBe(true);
        expect(document.activeElement.textContent).toBe('Study 2 of 48');
    });

    it('keeps focus on the notice when it is replaced, for example after a failed retry', () => {
        const retry = { label: 'Try again', onClick: () => {} };
        notices.show('connection', { text: 'Not connected.', actions: [retry] });
        button('Try again').focus();
        notices.show('connection', { text: 'Still not connected.', actions: [retry] });
        expect(document.activeElement).toBe(button('Try again'));
        expect(document.activeElement.isConnected).toBe(true);
    });

    it('moves focus to the heading when a focused notice is cleared after a retry worked', () => {
        notices.show('connection', {
            text: 'Not connected.',
            actions: [{ label: 'Try again', onClick: () => {} }],
        });
        button('Try again').focus();
        notices.clear('connection');
        expect(document.activeElement.textContent).toBe('Study 2 of 48');
    });

    it('leaves focus alone when it was elsewhere', () => {
        const heading = document.querySelector('#view-b h1');
        notices.show('resume', { text: 'You are continuing a session.', dismissible: true });
        const outside = document.createElement('button');
        document.body.append(outside);
        outside.focus();
        notices.clear('resume');
        expect(document.activeElement).toBe(outside);
        expect(heading.hasAttribute('tabindex')).toBe(false);
    });
});
