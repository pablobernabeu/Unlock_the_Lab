/**
 * Links and file names for a facilitator's room code. Pure functions.
 */
import { roomUrl } from '../lib/room.js';
import { FILE_PREFIX } from './files.js';

/**
 * The workshop link to give participants and the dashboard link filtered to
 * the room.
 * @param {string} origin e.g. 'https://unlock-the-lab.web.app'
 * @param {string} room a normalised room code, e.g. 'OXFORD-1'
 * @returns {{workshop: string, dashboard: string}}
 */
export function roomLinks(origin, room) {
    return {
        workshop: roomUrl(origin, room, '/'),
        dashboard: roomUrl(origin, room, '/dashboard.html'),
    };
}

/**
 * File name for a room's QR code image.
 * @param {string} room a normalised room code
 * @returns {string} e.g. 'unlock-the-lab-room-OXFORD-1-qr.png'
 */
export function qrFileName(room) {
    return `${FILE_PREFIX}-room-${room}-qr.png`;
}
