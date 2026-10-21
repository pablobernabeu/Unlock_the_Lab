// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { alertDialog, confirmDialog, promptDialog } from '../../../src/lib/dialog.js';
import { initI18n } from '../../../src/lib/i18n.js';

beforeAll(async () => {
    await initI18n();
});

let opener;

beforeEach(() => {
    opener = document.createElement('button');
    opener.textContent = 'Open';
    document.body.append(opener);
    opener.focus();
});

afterEach(() => {
    document.body.innerHTML = '';
    delete HTMLDialogElement.prototype.showModal;
    delete HTMLDialogElement.prototype.close;
});

const openDialog = () => document.querySelector('dialog');
const button = (label) =>
    [...openDialog().querySelectorAll('button')].find((b) => b.textContent === label);

describe('confirmDialog', () => {
    it('labels the dialog and resolves true on confirm', async () => {
        const result = confirmDialog({
            title: 'Finish now?',
            message: 'You have rated 10 studies.',
        });
        const dialog = openDialog();
        expect(dialog.hasAttribute('open')).toBe(true);
        expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toBe(
            'Finish now?'
        );
        expect(document.getElementById(dialog.getAttribute('aria-describedby')).textContent).toBe(
            'You have rated 10 studies.'
        );
        expect(document.activeElement).toBe(button('Confirm'));
        button('Confirm').click();
        await expect(result).resolves.toBe(true);
        expect(openDialog()).toBeNull();
        expect(document.activeElement).toBe(opener);
    });

    it('resolves false on cancel and on Escape', async () => {
        const cancelled = confirmDialog({ title: 'Leave?' });
        button('Cancel').click();
        await expect(cancelled).resolves.toBe(false);

        const escaped = confirmDialog({ title: 'Leave?' });
        openDialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await expect(escaped).resolves.toBe(false);

        const nativeCancel = confirmDialog({ title: 'Leave?' });
        openDialog().dispatchEvent(new Event('cancel', { cancelable: true }));
        await expect(nativeCancel).resolves.toBe(false);
        expect(document.activeElement).toBe(opener);
    });

    it('resolves false when other code closes it without a cancel event', async () => {
        const closed = confirmDialog({ title: 'Leave?' });
        openDialog().dispatchEvent(new Event('close'));
        await expect(closed).resolves.toBe(false);
        expect(openDialog()).toBeNull();
        expect(document.activeElement).toBe(opener);
    });

    it('focuses Cancel first and styles the action for destructive questions', async () => {
        const result = confirmDialog({
            title: 'Delete?',
            confirmLabel: 'Delete all',
            danger: true,
        });
        expect(document.activeElement).toBe(button('Cancel'));
        expect(button('Delete all').classList.contains('btn-danger')).toBe(true);
        button('Delete all').click();
        await expect(result).resolves.toBe(true);
    });

    it('uses showModal when the browser has it', async () => {
        HTMLDialogElement.prototype.showModal = vi.fn(function () {
            this.setAttribute('open', '');
        });
        HTMLDialogElement.prototype.close = vi.fn(function () {
            this.removeAttribute('open');
        });
        const result = confirmDialog({ title: 'Modal?' });
        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
        button('Confirm').click();
        await result;
        expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
    });

    it('renders text messages as text, never as markup', async () => {
        const result = confirmDialog({ title: '<b>t</b>', message: ['<img src=x>', 'Second'] });
        expect(openDialog().querySelector('img')).toBeNull();
        expect(openDialog().querySelectorAll('.dialog__message p')).toHaveLength(2);
        button('Cancel').click();
        await result;
    });
});

describe('alertDialog', () => {
    it('resolves when OK is pressed', async () => {
        const result = alertDialog({ title: 'Saved', message: 'Your link was copied.' });
        expect(document.activeElement).toBe(button('OK'));
        button('OK').click();
        await expect(result).resolves.toBeUndefined();
    });
});

describe('promptDialog', () => {
    it('enables confirm only when the expected text is typed', async () => {
        const result = promptDialog({
            title: 'Delete all data?',
            expected: 'DELETE',
            confirmLabel: 'Delete',
        });
        const input = openDialog().querySelector('input');
        expect(document.activeElement).toBe(input);
        expect(openDialog().querySelector(`label[for="${input.id}"]`).textContent).toBe(
            'Type DELETE to confirm'
        );
        const confirm = button('Delete');
        expect(confirm.disabled).toBe(true);
        input.value = 'delete';
        input.dispatchEvent(new Event('input'));
        expect(confirm.disabled).toBe(true);
        confirm.click();
        expect(openDialog()).not.toBeNull();
        input.value = 'DELETE';
        input.dispatchEvent(new Event('input'));
        expect(confirm.disabled).toBe(false);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await expect(result).resolves.toBe(true);
    });

    it('resolves false when cancelled', async () => {
        const result = promptDialog({ title: 'Delete?', expected: 'DELETE' });
        button('Cancel').click();
        await expect(result).resolves.toBe(false);
    });
});
