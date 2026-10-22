/**
 * The v1 logo easter egg: the flask flips over, droplets pour out and it
 * refills; a rainbow celebration plays after a score of 90 or more and at the
 * study milestone. Everything here is decorative and runs only while motion
 * is allowed (lib/motion.js); with motion off nothing moves, including the
 * idle shake. Styles live in src/styles/app.css.
 */
import { motionAllowed } from '../lib/motion.js';

const DROP_TYPES = [
    'droplet',
    'droplet-star',
    'droplet-heart',
    'droplet-sparkle',
    'droplet-bubble',
];
const ANIMATION_MS = 4000;
const UPSIDE_DOWN_AT_MS = 600;
const REFILL_AT_MS = 2500;
const RESTORE_IMAGE_AT_MS = 3800;
const HOVER_DELAY_MS = 900;
const SHAKE_EVERY_MS = 8000;
const SHAKE_FOR_MS = 2000;
const ICON = 'unlock-lab-icon.svg';
const INVERTED_ICON = 'unlock-lab-icon-inverted.svg';

function randomDropClass(kind) {
    if (kind === 'celebration') return 'droplet droplet-celebration';
    return `droplet ${DROP_TYPES[Math.floor(Math.random() * DROP_TYPES.length)]}`;
}

function addDrop(container, { className, left, top, size, delayMs }) {
    const drop = document.createElement('div');
    drop.className = className;
    drop.style.left = `${left}px`;
    drop.style.top = `${top}px`;
    drop.style.width = `${size}vw`;
    drop.style.height = `${size * 1.2}vw`;
    if (delayMs) drop.style.animationDelay = `${delayMs}ms`;
    container.append(drop);
    return drop;
}

/** Drops spilling from a point (the logo's corner, or the top of the screen for a celebration). */
function spill(container, { x, y, kind, staggered }) {
    const celebration = kind === 'celebration';
    const count = celebration ? 15 : 8;
    for (let i = 0; i < count; i++) {
        const spread = celebration ? window.innerWidth * 1.5 : 20;
        addDrop(container, {
            className: randomDropClass(kind),
            left: x + (Math.random() - 0.5) * spread,
            top: y + (Math.random() - 0.5) * (celebration ? 40 : 20),
            size: celebration ? 1.5 + Math.random() : 1 + Math.random() * 0.5,
            delayMs: staggered ? i * (celebration ? 40 : 50) : 0,
        });
    }
}

/** Drops raining from the top of the screen back into the logo. */
function refill(container, logo) {
    const rect = logo.getBoundingClientRect();
    const targetX = rect.left + rect.width;
    for (let i = 0; i < 12; i++) {
        const drop = addDrop(container, {
            className: `${randomDropClass('mixed')} droplet-refill`,
            left: targetX + (Math.random() - 0.5) * window.innerWidth * 0.4,
            top: 0,
            size: 2 + Math.random() * 0.5,
            delayMs: i * 45,
        });
        drop.style.setProperty('--travel-distance', `${rect.top + (Math.random() - 0.5) * 20}px`);
    }
}

/**
 * Makes a logo image playful: a click (or a long hover) flips it, and
 * `celebrate()` plays the rainbow version.
 * @param {HTMLImageElement|null} logo
 * @param {object} [options]
 * @param {boolean} [options.idleShake] gentle idle shake with a stronger shake every 8 s
 * @returns {{celebrate: () => void, destroy: () => void}}
 */
export function enableLogoAnimation(logo, { idleShake = false } = {}) {
    if (!logo) return { celebrate() {}, destroy() {} };
    let animating = false;
    let hoverTimer = null;
    // Read once: a celebration can start while a flip shows the inverted image, and must not
    // restore that image at its end.
    const originalSrc = logo.getAttribute('src');
    const timers = new Set();
    const containers = new Set();

    const later = (fn, ms) => {
        const id = setTimeout(() => {
            timers.delete(id);
            fn();
        }, ms);
        timers.add(id);
    };

    function play(kind = 'mixed') {
        const celebration = kind === 'celebration';
        if (!motionAllowed() || (animating && !celebration) || !logo.isConnected) return;
        animating = true;
        const container = document.createElement('div');
        container.className = 'droplet-container';
        container.setAttribute('aria-hidden', 'true');
        document.body.append(container);
        containers.add(container);
        logo.classList.add('logo-flipping');

        const rect = logo.getBoundingClientRect();
        spill(container, {
            x: celebration ? window.innerWidth / 2 : rect.left + rect.width,
            y: celebration ? 0 : rect.top,
            kind,
            staggered: true,
        });
        later(() => {
            logo.setAttribute('src', originalSrc.replace(ICON, INVERTED_ICON));
            const flipped = logo.getBoundingClientRect();
            spill(container, {
                x: celebration ? window.innerWidth / 2 : flipped.left,
                y: celebration ? 0 : flipped.top + flipped.height,
                kind,
                staggered: false,
            });
        }, UPSIDE_DOWN_AT_MS);
        if (!celebration) later(() => refill(container, logo), REFILL_AT_MS);
        later(() => logo.setAttribute('src', originalSrc), RESTORE_IMAGE_AT_MS);
        later(() => {
            logo.classList.remove('logo-flipping');
            container.remove();
            containers.delete(container);
            animating = false;
        }, ANIMATION_MS);
    }

    const onClick = () => {
        clearTimeout(hoverTimer);
        play();
    };
    const onPointerEnter = (event) => {
        if (event.pointerType !== 'mouse' || animating) return;
        hoverTimer = setTimeout(() => play(), HOVER_DELAY_MS);
    };
    const onPointerLeave = () => clearTimeout(hoverTimer);
    logo.addEventListener('click', onClick);
    logo.addEventListener('pointerenter', onPointerEnter);
    logo.addEventListener('pointerleave', onPointerLeave);

    let shakeInterval = null;
    if (idleShake) {
        logo.classList.add('logo-idle');
        shakeInterval = setInterval(() => {
            const visible = !document.hidden && logo.offsetParent !== null;
            if (animating || !visible || !motionAllowed()) return;
            logo.classList.add('logo-shake-intense');
            later(() => logo.classList.remove('logo-shake-intense'), SHAKE_FOR_MS);
        }, SHAKE_EVERY_MS);
    }

    return {
        celebrate: () => play('celebration'),
        destroy() {
            clearInterval(shakeInterval);
            clearTimeout(hoverTimer);
            for (const id of timers) clearTimeout(id);
            timers.clear();
            for (const container of containers) container.remove();
            containers.clear();
            logo.classList.remove('logo-flipping', 'logo-shake-intense');
            logo.removeEventListener('click', onClick);
            logo.removeEventListener('pointerenter', onPointerEnter);
            logo.removeEventListener('pointerleave', onPointerLeave);
        },
    };
}
