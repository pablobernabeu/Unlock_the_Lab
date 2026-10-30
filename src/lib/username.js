/**
 * Pseudonymous usernames such as 'Curious Otter 42', generated as in v1.
 * Every generated name matches USERNAME_PATTERN, which the database rules enforce.
 */

/** The v1 adjectives. USERNAME_PATTERN lists the same words; change both together. */
// prettier-ignore
export const ADJECTIVES = Object.freeze([
    'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal',
    'Brave', 'Wise', 'Swift', 'Tall', 'Happy', 'Clever', 'Bright', 'Quick',
    'Mighty', 'Gentle', 'Bold', 'Cheerful', 'Curious', 'Friendly', 'Kind', 'Peaceful',
]);

/** The v1 animals. USERNAME_PATTERN lists the same words; change both together. */
// prettier-ignore
export const ANIMALS = Object.freeze([
    'Fox', 'Raccoon', 'Owl', 'Sparrow', 'Robin', 'Falcon', 'Eagle', 'Hawk',
    'Rabbit', 'Squirrel', 'Deer', 'Bear', 'Wolf', 'Otter', 'Badger', 'Hedgehog',
    'Dolphin', 'Seal', 'Penguin', 'Panda', 'Koala', 'Tiger', 'Lion', 'Leopard',
]);

/** v1 reserved this placeholder so it is never assigned to a participant. */
const RESERVED_NAMES = Object.freeze(['Anonymous']);

/** v1 tried this many random names before falling back to a numeric suffix. */
const MAX_ATTEMPTS = 500;

/** The pattern allows suffixes of up to three digits. */
const MAX_SUFFIX = 999;

function pick(list, rng) {
    return list[Math.floor(rng() * list.length)];
}

/**
 * A random name: adjective, animal and a two-digit number (00-99).
 * @param {() => number} [rng] returns values in [0, 1)
 * @returns {string}
 */
export function generateUsername(rng = Math.random) {
    const adjective = pick(ADJECTIVES, rng);
    const animal = pick(ANIMALS, rng);
    const number = String(Math.floor(rng() * 100)).padStart(2, '0');
    return `${adjective} ${animal} ${number}`;
}

/**
 * A name not in `existingNames`. After MAX_ATTEMPTS clashes it appends '-1',
 * '-2' and so on to a random name, as v1 did.
 * @param {Iterable<string>} existingNames names already on the leaderboard
 * @param {() => number} [rng]
 * @returns {string}
 */
export function generateUniqueUsername(existingNames, rng = Math.random) {
    const taken = new Set([...(existingNames ?? []), ...RESERVED_NAMES]);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const candidate = generateUsername(rng);
        if (!taken.has(candidate)) return candidate;
    }

    for (;;) {
        const base = generateUsername(rng);
        for (let suffix = 1; suffix <= MAX_SUFFIX; suffix++) {
            const candidate = `${base}-${suffix}`;
            if (!taken.has(candidate)) return candidate;
        }
    }
}

/**
 * Comparison form of a username for lookups: lower case without spaces, so
 * 'red fox 07', 'Red  Fox 07' and 'RedFox07' all match 'Red Fox 07'.
 * @param {unknown} name
 * @returns {string}
 */
export function normaliseUsername(name) {
    return typeof name === 'string' ? name.toLowerCase().replace(/\s+/g, '') : '';
}
