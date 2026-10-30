# Changelog

## 2.1.0 (unreleased)

Content version 3: new study texts, rubric and expert ratings. Ratings record their content version, so analyses can keep the versions apart (`docs/data.md`, 'Content versions').

### Content

- Every study card is rewritten. Cards describe what the authors did, where and how the study appeared and what they claim, without judging it, so that participants judge the quality themselves. Every empirical study states its sample size, and the near-duplicate cards (studies 12, 23 and 25, and the six cards that report no real study: 29, 32, 34, 40, 46 and 48) are now distinct. Titles are reworded so that each is clearly accurate, slightly overstated or sensational. Each study keeps its id, topic and design.
- The expert feedback is rewritten for the new cards.
- The rubric's anchors are revised. Access is rated by who can read the paper, and Theory's middle band rates soundness. Some labels change: for Access, Impossible and Difficult become Closed and Restricted; for Source, Unverified becomes Use with caution; for Theory, Nonsense and Standard become Unfounded and Sound but limited. The interface's description of Theory now asks whether a study builds soundly on earlier research.
- A new guide (`src/content/en/guide.json`) explains how to combine the six criteria into one rating, with a worked example and a note that Access concerns openness, not whether the findings are correct.
- The glossary gains entries for the terms the new cards use and drops some that they no longer need.
- 13 expert ratings change where a panel of three AI raters, who applied the version 2 rubric to the draft cards without seeing the version 2 ratings or feedback, supported a change after a fixed rule reconciled their ratings with those of version 2: STUDY-7 (2 to 1), STUDY-13 (5 to 4), STUDY-14 (5 to 6), STUDY-15 (3 to 2), STUDY-23 (3 to 2), STUDY-25 (3 to 2), STUDY-27 (5 to 7), STUDY-30 (4 to 5), STUDY-31 (6 to 7), STUDY-37 (6 to 7), STUDY-43 (6 to 5), STUDY-44 (2 to 1) and STUDY-45 (5 to 7). `src/content/expert-ratings-history.json` keeps the expert ratings of every content version.

### Participant app

- The guide page and the 'Glossary and rubric' dialog show the new guide: the Access note follows the rubric, and the advice on reaching one rating has its own tab.
- A target now uses only the ratings made with the current content version, plus the expert rating as before; ratings of earlier versions describe different texts. The welcome page says so. On the results page, the comparison with other participants also uses ratings of the same content version, and each answer is compared with the expert rating of the version it was given to, with a note on answers given to an earlier version.

### Dashboard

- A content-version filter, set to the current version by default, applies to the ratings chart, the statistics table and the study details. An earlier version is compared with its own expert ratings; with all versions, each study is compared with the average of the expert ratings that its participants saw. The choice is kept in the link (`?version=2` or `?version=all`).

### Analysis

- Each rating is compared with the expert rating of its content version, read from `src/content/expert-ratings-history.json`, and reconstructed targets follow the rule of the app that made the rating. A new parameter, `content_version`, restricts the analysis to one version.

### Workshop handouts

- The handouts are rendered from content version 3. The evaluation guide adds the Access note after the rubric and the advice on combining the criteria into one rating with its worked example, and the sample studies are chosen by the same rule from the new expert ratings and feedback.

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
- The browser's Back and Forward buttons move between the pages by the same rules as the app's own buttons, and two tabs of one session stay in step without losing answers.
- Interface text and content can be translated; English is the only language so far.

### Dashboard and facilitator panel

- The dashboard computes statistics from participant ratings only, with t-based 95% confidence intervals, takes expert ratings from the same source as the app (version 1 showed outdated expert ratings for seven studies), filters by room and keeps sorting and focus while updating. The invalid 'Agreement %' measure is gone.
- All administrative functions moved to the facilitator panel (`/admin.html`): room links with QR codes, CSV and JSON exports, ending all sessions (which now works) and a guarded delete.

### Data and research

- Each rating also stores `contentVersion`, `target`, `score`, `trial`, `locale` and, where used, `room`; sessions get a `/sessions` record. Timestamps come from the server.
- Content version 2 corrects errors in the study cards and glossary (outdated critiques of title claims, a Sci-Hub recommendation, factual slips) without changing the expert ratings.
- `analysis/` adds a reproducible Quarto report on the backups.
- Daily backups go to the `data` branch and include the criterion weights (`/rankings`) and sessions. They are committed only when the data change. The v1 backups in `data/` are frozen.

### Security and privacy

- Database rules bind every write to the session's owner, validate every field, bound leaderboard updates and allow only the nickname vocabulary. Administrators come from an allowlist (`/admins`) instead of any email/password account.
- Usernames are never inserted as HTML (version 1 allowed stored cross-site scripting).
- Google Analytics removed. Content Security Policy and security headers added.
- Firebase App Check with reCAPTCHA Enterprise is ready to switch on (`docs/deployment.md`); the backups can then read with an App Check token.

### Repository

- Code licensed under MIT; content stays CC BY 4.0. `CITATION.cff` added.
- The workshop handouts (an evaluation guide with the rubric and glossary, and six sample studies with an answer key) are rebuilt with Quarto from the app's content files, as Word and PDF, replacing the version 1 handouts.
- Vite 8, Firebase 13 and Chart.js bundled from npm; build output is no longer committed.
- Unit, database-rules, end-to-end and accessibility tests run in CI, which deploys the site and the database rules from `main` and publishes a preview for each pull request from a branch of this repository. Development requires Node.js 24.12 or later.

## 1.0.0 (2026-03)

First release, with 48 studies, a real-time leaderboard and an analytics dashboard.
