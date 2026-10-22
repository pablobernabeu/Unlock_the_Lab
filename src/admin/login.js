/**
 * The sign-in form: labelled email and password fields, errors tied to their
 * fields, and no time limit.
 */
import { el, qs, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { signInErrorKey } from './errors.js';
import { whileBusy } from './ui.js';

/**
 * @param {HTMLElement} root the sign-in section
 * @param {object} options
 * @param {(email: string, password: string) => Promise<unknown>} options.signIn
 */
export function createLoginForm(root, { signIn }) {
    const form = qs('[data-login-form]', root);
    const fields = { email: qs('#admin-email', form), password: qs('#admin-password', form) };
    const submit = qs('[data-login-submit]', form);
    const formError = qs('[data-form-error]', form);
    const alert = qs('[data-login-alert]', root);

    function setFieldError(name, message) {
        setText(qs(`[data-field-error="${name}"]`, form), message);
        if (message) fields[name].setAttribute('aria-invalid', 'true');
        else fields[name].removeAttribute('aria-invalid');
    }

    function clearErrors() {
        setFieldError('email', '');
        setFieldError('password', '');
        setText(formError, '');
    }

    /** @returns {boolean} true when both fields are filled in */
    function validate() {
        const missing = [];
        if (!fields.email.value.trim()) missing.push(['email', t('admin.login.emailMissing')]);
        if (!fields.password.value) missing.push(['password', t('admin.login.passwordMissing')]);
        for (const [name, message] of missing) setFieldError(name, message);
        if (missing.length > 0) fields[missing[0][0]].focus();
        return missing.length === 0;
    }

    async function attempt() {
        clearErrors();
        alert.replaceChildren();
        if (!validate()) return;
        try {
            await signIn(fields.email.value.trim(), fields.password.value);
            fields.password.value = '';
        } catch (error) {
            fields.password.value = '';
            setText(formError, t(signInErrorKey(error?.code)));
            fields.password.focus();
        }
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        whileBusy(submit, attempt, t('admin.login.submitting'));
    });

    return {
        /** Empties the form and any messages. */
        reset() {
            form.reset();
            clearErrors();
            alert.replaceChildren();
        },
        /**
         * Explains that the account that just signed in is not an administrator.
         * @param {string} uid shown so the owner can add it to /admins
         */
        showNotAdmin(uid) {
            alert.replaceChildren(
                el(
                    'div',
                    { class: 'info-box info-box--danger' },
                    el('p', { class: 'info-box__title' }, t('admin.login.notAdminTitle')),
                    el('p', null, t('admin.login.notAdminText')),
                    el('p', null, t('admin.login.notAdminUid', { uid }))
                )
            );
        },
    };
}
