/**
 * Validation patterns shared with database.rules.json. The rules must use the
 * same regular expressions; tests/unit/lib/patterns.test.js checks that they do.
 */

/**
 * Generated usernames such as 'Red Fox 07', or 'Red Fox 07-2' from the v1 fallback. Only the
 * adjectives and animals of username.js are accepted, so nobody can put free text on the
 * public leaderboard; tests/unit/lib/username.test.js checks that the lists agree.
 */
// One line, because analysis/R/repo.R reads each pattern from its own line.
// prettier-ignore
export const USERNAME_PATTERN = /^(Red|Blue|Green|Yellow|Purple|Orange|Pink|Teal|Brave|Wise|Swift|Tall|Happy|Clever|Bright|Quick|Mighty|Gentle|Bold|Cheerful|Curious|Friendly|Kind|Peaceful) (Fox|Raccoon|Owl|Sparrow|Robin|Falcon|Eagle|Hawk|Rabbit|Squirrel|Deer|Bear|Wolf|Otter|Badger|Hedgehog|Dolphin|Seal|Penguin|Panda|Koala|Tiger|Lion|Leopard) [0-9]{2}(-[0-9]{1,3})?$/;

/** Facilitator room codes such as 'OXFORD-1'. */
export const ROOM_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

/** Session ids as generated since v1: 'session_' + Date.now() + '_' + random base-36. */
export const SESSION_ID_PATTERN = /^session_[0-9]{10,14}_[a-z0-9]{1,12}$/;

/** Study ids STUDY-1 to STUDY-99 (48 are in use). */
export const STUDY_ID_PATTERN = /^STUDY-[1-9][0-9]?$/;

/** BCP 47 language tags as stored on sessions and ratings, such as 'en' or 'pt-BR'. */
export const LOCALE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/** Package versions as stored on sessions, such as '2.0.0'. */
export const APP_VERSION_PATTERN = /^[0-9A-Za-z.+-]{1,32}$/;
