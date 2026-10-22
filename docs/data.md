# Data dictionary

Unlock the Lab stores its data in a Firebase Realtime Database (project `unlock-the-lab-workshop`, instance in `europe-west1`). Every node except `/admins` is publicly readable, which is what lets the dashboard and the backups work without credentials. Nothing in the database names a participant: sessions are identified by random identifiers and an automatically generated nickname such as 'Curious Hawk 71'.

The rules in `database.rules.json` enforce the shapes below for new writes. Records written by version 1 of the app (before content version 2) lack some fields; the notes on each node say which. All timestamps are milliseconds since the Unix epoch (UTC), written by the server since version 2; version 1 wrote the browser's clock.

## Identifiers

| Identifier  | Format                                | Notes                                                                                                                                                                                        |
| ----------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId` | `session_<ms>_<random>`               | Created in the browser when a participant starts; `<ms>` is the client time at creation. Kept in local storage, so a reload resumes the same session.                                        |
| `uid`       | Firebase Auth uid                     | Anonymous account of the browser that owns the session. One browser keeps the same uid across sessions, so several sessions can share a uid (for example, a shared classroom computer).      |
| `studyId`   | `STUDY-1` to `STUDY-48`               | Stable across content versions. Texts are in `src/content/en/studies.json`, expert ratings in `src/content/expert-ratings.json`. Pilot backups also use ids such as `STUDY-001` (see below). |
| `room`      | 2-20 characters, `A-Z`, `0-9` and `-` | Optional workshop code from the `?room=` link.                                                                                                                                               |

## `/sessions/{sessionId}`

One record per session, created when the session starts (or when a version 1 session is resumed). Absent for sessions that never resumed after the version 2 release.

| Field            | Type             | Meaning                                                               |
| ---------------- | ---------------- | --------------------------------------------------------------------- |
| `uid`            | string           | Owner of the session.                                                 |
| `createdAt`      | number           | Server time of creation.                                              |
| `contentVersion` | integer          | Content version in use when the session started.                      |
| `appVersion`     | string           | App version, from `package.json`.                                     |
| `locale`         | string           | Interface language, e.g. `en`.                                        |
| `feedbackMode`   | `each` or `end`  | Whether expert feedback is shown after each study or only at the end. |
| `room`           | string, optional | Workshop code.                                                        |

## `/ratings/{studyId}/{sessionId}`

One record per study a participant rated. Written once and never changed.

| Field            | Type             | Meaning                                                                  | Version 1 records                                                                                            |
| ---------------- | ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `rating`         | integer 1-7      | The participant's own quality rating.                                    | Present. Readers also accept a bare number in place of the object, as version 1 did; no backup contains one. |
| `prediction`     | integer 1-7      | The participant's prediction of the crowd's average rating.              | Present, except in a few pilot records (see below).                                                          |
| `responseTime`   | number, optional | Milliseconds from the first display of the study to submission.          | Present, but restarted on every reload or return to the study.                                               |
| `timestamp`      | number           | Server time of submission.                                               | Client time.                                                                                                 |
| `uid`            | string           | Owner of the session.                                                    | Missing in the earliest records.                                                                             |
| `contentVersion` | integer          | Content version of the study text and expert rating the participant saw. | Missing (treat as version 1).                                                                                |
| `feedbackShown`  | boolean          | Whether expert feedback was displayed after this rating.                 | Missing (no feedback existed).                                                                               |
| `target`         | number 1-7       | The scoring target at submission (see below).                            | Missing; can be reconstructed from earlier ratings.                                                          |
| `score`          | integer 0-100    | Prediction score for this study.                                         | Missing.                                                                                                     |
| `trial`          | integer 1-48     | Position of this rating in the participant's sequence.                   | Missing; reconstruct from the session's seeded study order or from timestamps.                               |
| `locale`         | string           | Interface language.                                                      | Missing.                                                                                                     |
| `room`           | string, optional | Workshop code.                                                           | Missing.                                                                                                     |

### Scoring

For a prediction `p` on a study whose expert rating is `e`, with `n` earlier ratings from other participants summing to `S`:

```
target = (S + 100 × e) / (n + 100)
score  = max(0, 100 − round(12 × |p − target|))
```

The expert rating counts as 100 participants (`SEED_WEIGHT` in `src/lib/config.js`), so while fewer than a few hundred people have rated a study the target stays close to the expert rating. The participant's own rating is not part of the target.

## `/leaderboard/{sessionId}`

Running totals, updated after every successful rating write.

| Field         | Type             | Meaning                                                           |
| ------------- | ---------------- | ----------------------------------------------------------------- |
| `score`       | integer          | Sum of the session's prediction scores.                           |
| `papersRated` | integer 0-48     | Number of studies rated.                                          |
| `timestamp`   | number           | Server time of the last update. Version 1: client time.           |
| `uid`         | string           | Owner of the session (missing in some version 1 entries).         |
| `userName`    | string           | Generated nickname (empty in a few version 1 entries; see below). |
| `room`        | string, optional | Workshop code.                                                    |

Mean accuracy is `score / papersRated`. Leaderboards rank entries with at least 10 rated studies by mean accuracy.

Nicknames are an adjective, an animal and two digits, such as 'Curious Hawk 71', from the fixed lists of 24 adjectives and 24 animals in `src/lib/username.js` (the same as version 1). If 500 random names in a row are all taken, the app adds a suffix such as `-2`. The rules refuse any other name, so nobody can put their own text on the public leaderboard.

## `/rankings/{sessionId}`

The criterion weights a participant gave after rating: 20 tokens across six criteria. Written once. Version 1 collected these too, but its backups did not include them.

| Field                                                          | Type                         | Meaning                                                                                                                |
| -------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `title`, `access`, `source`, `theory`, `methods`, `conclusion` | integers 0-20, summing to 20 | Tokens per criterion. `theory` corresponds to the study card's 'Theory' section (the `overview` field in the content). |
| `userName`                                                     | string                       | Generated nickname, as on the leaderboard.                                                                             |
| `timestamp`                                                    | number                       | Server time. Version 1: client time.                                                                                   |
| `uid`                                                          | string                       | Owner of the session.                                                                                                  |
| `room`                                                         | string, optional             | Workshop code.                                                                                                         |

## `/active/{sessionId}`

Presence for the 'active now' figures. Removed automatically when the browser disconnects or the session pauses, and not backed up.

| Field        | Type             | Meaning                                                                             |
| ------------ | ---------------- | ----------------------------------------------------------------------------------- |
| `joinedAt`   | number           | Server time the current page load joined.                                           |
| `lastActive` | number           | Server time of the latest heartbeat (every minute while the participant is active). |
| `uid`        | string           | Owner of the session.                                                               |
| `room`       | string, optional | Workshop code.                                                                      |

## `/control/sessionsEndedAt`

Server time at which an administrator last ended all active sessions. Open pages whose `joinedAt` is earlier close their session.

## `/admins/{uid}`

`true` for each administrator account. Set by hand in the Firebase console (see `docs/deployment.md`); readable only by that account.

## Pilot data before 19 February 2026

Backups up to 18 February 2026 (commit `59d8f12` on `main`) come from a pilot whose data were wiped on 19 February 2026. They differ from everything after it:

- study ids such as `STUDY-001` appear alongside `STUDY-1`;
- ratings carry extra fields, `listId` and `rubricVersion`, and some have no `prediction`;
- leaderboard entries carry a `listId`, and some names have no digits (such as 'Orange Bear').

These records are not comparable with later data and are no longer in the database, so current backups do not contain them. If you load one of these old backups into the analysis, note that it drops the zero-padded ids (through `STUDY_ID_PATTERN`) but keeps the other pilot records.

## Backups and exports

A GitHub Actions workflow (`.github/workflows/backup.yml`) copies `/ratings`, `/leaderboard`, `/rankings` and `/sessions` once a day into the `data` branch of the repository, one JSON file per node with keys sorted, plus `backup-info.json` with the time and record counts. It commits only when the data have changed. Backups taken before version 2 are in the history of `data/` on `main`, up to the merge of version 2.

The admin panel exports the same nodes as CSV (one row per record, columns as in the tables above plus `sessionId` and, for ratings, `studyId`) and as JSON. The analysis in `analysis/` reads either source; see `analysis/README.md`.
