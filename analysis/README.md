# Analysis of the workshop data

This folder holds a reproducible report on the data that Unlock the Lab collects. It compares participants' quality ratings with the expert ratings, estimates how reliable the study means are, examines predictions and how they are scored, looks for learning across trials and summarises criterion weights, response times, rooms and content versions. The report is written in [Quarto](https://quarto.org) with R. Every number in its text is computed from the data when it is rendered, and the wording of its conclusions follows the estimates, so the same source can be rendered again as data accumulate.

The report reads the scoring constants, validation patterns, study titles and expert ratings from the app's own source (`src/lib/config.js`, `src/lib/patterns.js`, `src/lib/criteria.js` and `src/content/`), so it always matches the app it sits next to.

## Requirements

- R 4.3 or later with the packages jsonlite, dplyr, tidyr, purrr, tibble, readr, ggplot2, scales, lme4, lmerTest, ordinal, boot, patchwork, knitr and rmarkdown:

    ```r
    install.packages(c('jsonlite', 'dplyr', 'tidyr', 'purrr', 'tibble', 'readr', 'ggplot2',
                       'scales', 'lme4', 'lmerTest', 'ordinal', 'boot', 'patchwork', 'knitr',
                       'rmarkdown'))
    ```

- Quarto (the report was developed with Quarto 1.10 and R 4.3).
- git, to fetch the backups, or Node.js 20.19 or later, to read the database directly.

## Getting the data

The data are not kept in this folder: `analysis/data/` is ignored by git. `fetch-data.sh` puts a snapshot there in one of three ways.

```sh
cd analysis
./fetch-data.sh                # latest backup from the repository's 'data' branch
./fetch-data.sh --live         # fresh read of the database with scripts/backup.mjs
./fetch-data.sh --from DIR     # copy the node files from a local directory
```

The default uses the backups that the 'Backup data' workflow commits to the `data` branch every day. It clones that branch into a temporary directory, so your checkout is not changed. `--live` reads the public database through its REST API with GET requests only; it never writes. Set `FIREBASE_DATABASE_URL` to read an emulator instead, such as `http://127.0.0.1:9000/?ns=unlock-the-lab-workshop-default-rtdb` for the one `npm run dev` uses. `--from` copies `ratings.json`, `leaderboard.json`, `rankings.json`, `sessions.json`, `active.json` and `backup-info.json` from a directory, such as a checkout of the `data` branch at an earlier commit:

```sh
git fetch origin data
git worktree add ../../utl-data-2026-06 <commit>
./fetch-data.sh --from ../../utl-data-2026-06
```

Each run replaces the previous snapshot, so files from different sources are never mixed, and writes `data/fetch-info.json` to record where the data came from. The report cites it.

Snapshots from v1 backups (the `data/` folder on `main` before v2) hold `/ratings`, `/leaderboard` and `/active` only, because v1 never backed up `/rankings` or `/sessions`. The report then skips the criterion weights and says why.

## Rendering

```sh
cd analysis
quarto render report.qmd
```

This writes `report.html`, a single self-contained file (also ignored by git). Code is folded under each result, and 'Code' at the top of the page shows the full source.

The exclusion rules and a few settings are parameters, which can be changed without editing the report:

```sh
quarto render report.qmd -P rt_floor_s:3 -P exclude_pre_revision:true
```

| Parameter                 | Default  | Meaning                                                                        |
| ------------------------- | -------- | ------------------------------------------------------------------------------ |
| `data_dir`                | `data`   | Directory with the snapshot files                                              |
| `repo_root`               | `..`     | Repository root, for the app's constants and content                           |
| `min_ratings_per_session` | 5        | Minimum ratings for a session to enter participant-level analyses              |
| `rt_floor_s`              | 5        | Ratings given faster than this many seconds are excluded                       |
| `straightline_min_n`      | 6        | Sessions with at least this many ratings, all identical, are excluded          |
| `exclude_pre_revision`    | `false`  | Exclude ratings of revised studies given before the v1 content revision commit |
| `conf_level`              | 0.95     | Confidence level of every interval                                             |
| `n_boot`                  | 2000     | Nonparametric bootstrap resamples                                              |
| `n_sim`                   | 1000     | Parametric bootstrap simulations for the intraclass correlation                |
| `seed`                    | 20260221 | Random seed                                                                    |

A full render takes about half a minute, most of it in the bootstrap.

## Assumptions

The report states its assumptions where they arise and collects them in a section on limitations. The main ones concern v1 data, which store less than v2. v1 ratings have no trial number, target, score, content version or feedback flag. The report recomputes each session's study order from its session id with the app's shuffle and takes v1 trial numbers from it, checked against the rating timestamps. This also identifies the v1 sessions affected by the shuffle defect fixed in commit 2fe7517 (September 2026), whose order always began with the same study and could stop early. Targets are reconstructed from the ratings that preceded each one and checked against the leaderboard totals that v1 did store. The content version of a v1 rating is inferred from the time of the v1 content revision, which is described in `reference/content-revisions.csv`, and the same leaderboard check shows which expert ratings were live before that revision was committed. Ratings on the 1–7 scale are treated as interval data in the linear mixed models, with a cumulative link mixed model as a check, and the incomplete crossed design (each participant rates a random subset of studies) is handled with crossed random effects for sessions and studies.

## Files

| Path                              | Contents                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `report.qmd`                      | The report                                                                             |
| `R/repo.R`                        | Reads constants, patterns, studies and expert ratings from the app's source            |
| `R/load.R`                        | Reads a snapshot and flattens each node, accepting legacy record shapes                |
| `R/derive.R`                      | Validity flags, content versions, study orders, trials, targets and scores, exclusions |
| `R/stats.R`                       | Intervals, correlations, mixed models, intraclass correlations and bootstraps          |
| `R/format.R`                      | Number formatting and wording that follows the estimates                               |
| `R/plots.R`                       | Figure theme and colour-blind-safe palette                                             |
| `reference/content-revisions.csv` | Studies whose text or expert rating changed in the v1 content revision                 |
| `references.bib`                  | Works cited in the report                                                              |
| `fetch-data.sh`                   | Puts a data snapshot into `data/`                                                      |
| `tests/test-helpers.R`            | Checks of the helper functions                                                         |
| `tests/make-fixture.R`            | Writes synthetic snapshots for checking that the report renders with any data shape    |

Ratings stamped with `contentVersion` are compared with the current expert ratings. If a later content version changes an expert rating, record the earlier value for that version and extend `set_expert_at_time()` in `R/derive.R` to use it, as is done for the v1 revision.

## Checking changes

After changing the report or its helpers, run the checks and render the report against the synthetic snapshots as well as the real data. The fixtures cover v2 records with rooms, both feedback modes, rankings and sessions, as well as legacy oddities (including v1's defective study order, a rating that failed to save and two saved out of order), a snapshot with three ratings and an empty one.

```sh
cd analysis
Rscript tests/test-helpers.R
Rscript tests/make-fixture.R /tmp/utl-full full
quarto render report.qmd -P data_dir:/tmp/utl-full --output report-full.html
```

Use `tiny` or `empty` instead of `full` for the other fixtures. The fixture values are simulated and mean nothing.

## Privacy

Snapshots hold pseudonymous identifiers: random session ids, anonymous authentication ids and generated usernames. The report uses them only to group records and shows none of them, but the snapshot files themselves should stay out of git and should not be shared beyond the people analysing them.
