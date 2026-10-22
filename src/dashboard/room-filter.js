/**
 * The room filter: a select of the rooms seen in the data, kept in step with
 * the page URL (`?room=CODE`) so a filtered dashboard can be shared or projected.
 */
import { announce, el, setText } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { normaliseRoom } from '../lib/room.js';

/**
 * The page URL with `room` set, or removed for all rooms. Other parameters stay.
 * @param {string} href current URL
 * @param {string|null} room
 * @returns {string}
 */
export function urlWithRoom(href, room) {
    const url = new URL(href);
    if (room) url.searchParams.set('room', room);
    else url.searchParams.delete('room');
    return url.toString();
}

/**
 * Wires up the room select.
 * @param {object} options
 * @param {HTMLSelectElement} options.select
 * @param {HTMLElement} options.hint
 * @param {string|null} options.initialRoom from the URL
 * @param {(room: string|null) => void} options.onChange
 * @returns {{setRooms: (rooms: string[]) => void}}
 */
export function createRoomFilter({ select, hint, initialRoom, onChange }) {
    let current = initialRoom;
    let shown = null;

    function renderHint() {
        setText(
            hint,
            current
                ? t('dashboard.room.hintSelected', { room: current })
                : t('dashboard.room.hintAll')
        );
    }

    function setRooms(rooms) {
        // The room from the URL stays selectable even before (or without) any data from it.
        const codes = [...new Set([...rooms, current].filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'en', { numeric: true })
        );
        const signature = codes.join('|');
        if (signature === shown) return;
        shown = signature;
        select.replaceChildren(
            el('option', { value: '' }, t('dashboard.room.all')),
            ...codes.map((code) => el('option', { value: code }, code))
        );
        select.value = current ?? '';
    }

    function syncUrl() {
        const next = urlWithRoom(location.href, current);
        if (next !== location.href) history.replaceState(history.state, '', next);
    }

    select.addEventListener('change', () => {
        current = normaliseRoom(select.value);
        syncUrl();
        renderHint();
        announce(
            current
                ? t('dashboard.room.announceRoom', { room: current })
                : t('dashboard.room.announceAll')
        );
        onChange(current);
    });
    // The select filters as it changes, so the form never needs submitting.
    select.form?.addEventListener('submit', (event) => event.preventDefault());

    setRooms([]);
    renderHint();
    // A code typed in lower case is shown in its normal form; an invalid one is dropped.
    if (new URL(location.href).searchParams.has('room')) syncUrl();
    return { setRooms };
}
