/**
 * Room links: the facilitator enters a code and gets the workshop link for
 * participants, the dashboard link filtered to the room and a QR code of the
 * workshop link, made in the browser with the 'qrcode' package.
 */
import { el, focusHeading, qs, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { normaliseRoom } from '../lib/room.js';
import { roomParticipants } from './counts.js';
import { qrFileName, roomLinks } from './links.js';
import { createStatus } from './ui.js';

/** Pixel size of the generated QR image: sharp when printed or projected. */
const QR_SIZE_PX = 1024;

let qrLibrary = null;

/** Loads the QR code library only when a room link is made. */
function loadQrCode() {
    qrLibrary ??= import('qrcode')
        .then((module) => module.default ?? module)
        .catch((error) => {
            qrLibrary = null;
            throw error;
        });
    return qrLibrary;
}

/**
 * Copies a link, or selects it for the person to copy when the clipboard
 * cannot be used (an older browser, or a page without clipboard permission).
 * @param {HTMLInputElement} input read-only field holding the link
 * @returns {Promise<boolean>} true when copied
 */
async function copyLink(input) {
    try {
        if (!navigator.clipboard?.writeText) throw new Error('No clipboard access');
        await navigator.clipboard.writeText(input.value);
        return true;
    } catch {
        input.focus();
        input.select();
        return false;
    }
}

/**
 * @param {HTMLElement} root the room links section
 * @param {ReturnType<import('./store.js').createStore>} store
 */
export function createRoomLinks(root, store) {
    const form = qs('[data-room-form]', root);
    const input = qs('#room-code', root);
    const error = qs('[data-room-error]', root);
    const result = qs('[data-room-result]', root);
    const heading = qs('[data-room-heading]', root);
    const links = {
        workshop: qs('[data-room-link="workshop"]', root),
        dashboard: qs('[data-room-link="dashboard"]', root),
    };
    const openDashboard = qs('[data-room-open-dashboard]', root);
    const qrSlot = qs('[data-room-qr]', root);
    const qrCaption = qs('[data-room-qr-caption]', root);
    const qrDownload = qs('[data-room-qr-download]', root);
    const copyStatus = createStatus(qs('[data-copy-status]', root));
    const qrStatus = createStatus(qs('[data-qr-status]', root));
    let currentRoom = null;

    function showError(message) {
        setText(error, message);
        input.setAttribute('aria-invalid', 'true');
        input.focus();
    }

    function clearError() {
        setText(error, '');
        input.removeAttribute('aria-invalid');
    }

    function renderUsage() {
        const usage = qs('[data-room-usage]', root);
        if (!currentRoom || !store.has('ratings', 'leaderboard', 'rankings', 'sessions')) {
            setText(usage, '');
            return;
        }
        const count = roomParticipants(store.values(), currentRoom);
        setText(
            usage,
            count === 0
                ? t('admin.rooms.unused')
                : t('admin.rooms.used', { count, room: currentRoom })
        );
    }

    async function renderQr(room, url) {
        qrSlot.replaceChildren();
        qrDownload.hidden = true;
        qrStatus.clear();
        try {
            const QRCode = await loadQrCode();
            const dataUrl = await QRCode.toDataURL(url, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: QR_SIZE_PX,
            });
            if (room !== currentRoom) return;
            qrSlot.append(
                el('img', {
                    class: 'admin-qr__image',
                    src: dataUrl,
                    alt: t('admin.rooms.qrAlt', { room }),
                    width: 240,
                    height: 240,
                })
            );
            qrDownload.href = dataUrl;
            qrDownload.download = qrFileName(room);
            qrDownload.hidden = false;
        } catch (failure) {
            console.error('[admin] QR code', failure);
            if (room === currentRoom) qrStatus.show(t('admin.rooms.qrFailed'), 'error');
        }
    }

    function showRoom(room) {
        currentRoom = room;
        const urls = roomLinks(location.origin, room);
        setText(heading, t('admin.rooms.resultHeading', { room }));
        links.workshop.value = urls.workshop;
        links.dashboard.value = urls.dashboard;
        openDashboard.href = urls.dashboard;
        setText(qrCaption, t('admin.rooms.qrCaption', { room }));
        copyStatus.clear();
        renderUsage();
        result.hidden = false;
        focusHeading(heading);
        renderQr(room, urls.workshop);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const room = normaliseRoom(input.value);
        if (!room) {
            showError(input.value.trim() ? t('common.room.invalid') : t('admin.rooms.missing'));
            return;
        }
        clearError();
        input.value = room;
        showRoom(room);
    });

    root.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-copy]');
        if (!button) return;
        const which = button.dataset.copy;
        const copied = await copyLink(links[which]);
        if (!copied) copyStatus.show(t('admin.rooms.copyFallback'), 'info');
        else if (which === 'workshop') copyStatus.show(t('admin.rooms.copiedWorkshop'), 'success');
        else copyStatus.show(t('admin.rooms.copiedDashboard'), 'success');
    });

    return {
        render: renderUsage,
        reset() {
            currentRoom = null;
            result.hidden = true;
            form.reset();
            clearError();
            copyStatus.clear();
            qrStatus.clear();
            qrSlot.replaceChildren();
        },
    };
}
