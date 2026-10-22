# Changelog

## 2.0.0 (unreleased)

A rewrite of the app, its data handling and the repository. Ratings stored by version 1 remain valid; `docs/data.md` lists the fields that version 2 adds.

### Participant app

- Expert feedback after every study: the expert rating, a short summary and a note on each of the six criteria. Each rating records whether feedback was shown (`feedbackShown`).
- The scoring is unchanged but now explained: the welcome page describes the target, and each study shows the target, how it was worked out and the participants' own average.
- The leaderboard ranks by average score per study among participants who rated at least 10 studies, instead of by summed points.
- Workshop rooms (`?room=CODE`) with their own leaderboard view; targets still use everyone's ratings.
- Results page with a review of every rated study, a chart with a table alternative and the criterion weights.
- Accessible to keyboard and screen-reader users (WCAG 2.2 AA, checked with axe), with reduced-motion support, an animation switch and no browser pop-ups.
- Answers count only once they are saved; failures can be retried. Sessions pause after 30 minutes without activity and resume where they stopped. 'Start as a new participant' supports shared computers.
- Sessions in progress from version 1 resume with the same study order, answers and scores.
- Interface text and content can be translated; English is the only language so far.

### Dashboard and facilitator panel

- The dashboard computes statistics from participant ratings only, with t-based 95% confidence intervals, takes expert ratings from the same source as the app (version 1 showed outdated expert ratings for seven studies), filters by room and keeps sorting and focus while updating. The invalid 'Agreement %' measure is gone.
- All administrative functions moved to the facilitator panel (`/admin.html`): room links with QR codes, CSV and JSON exports, ending all sessions (which now works) and a guarded delete.

### Data and research

- Each rating also stores `contentVersion`, `target`, `score`, `trial`, `locale` and, where used, `room`; sessions get a `/sessions` record. Timestamps come from the server.
- Content version 2 corrects errors in the study cards and glossary (outdated critiques of title claims, a Sci-Hub recommendation, factual slips) without changing the expert ratings.
- `analysis/` adds a reproducible Quarto report on the backups.
- Daily backups go to the `data` branch, include the criterion weights (`/rankings`) and sessions, and are committed only when the data change. The v1 backups in `data/` are frozen.

### Security and privacy

- Database rules bind every write to the session's owner, validate every field, bound leaderboard updates and allow only the nickname vocabulary. Administrators come from an allowlist (`/admins`) instead of any email/password account.
- Usernames are never inserted as HTML (version 1 allowed stored cross-site scripting).
- Google Analytics removed. Content Security Policy and security headers added.

### Repository

- Code licensed under MIT; content stays CC BY 4.0. `CITATION.cff` added.
- Vite 8, Firebase 13 and Chart.js bundled from npm; build output is no longer committed.
- Unit, database-rules, end-to-end and accessibility tests run in CI, which deploys the site and the database rules from `main` and publishes a preview for each pull request.

## 1.0.0 (2026-03)

First release, with 48 studies, a real-time leaderboard and an analytics dashboard.
