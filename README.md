# Unlock the Lab: Your guide to reading science like a scientist

[![DOI](https://zenodo.org/badge/1102647925.svg)](https://doi.org/10.5281/zenodo.19153148)
[![CI](https://github.com/pablobernabeu/Unlock_the_Lab/actions/workflows/ci.yml/badge.svg)](https://github.com/pablobernabeu/Unlock_the_Lab/actions/workflows/ci.yml)

Unlock the Lab is a web app for science-literacy workshops. Participants read short descriptions of fictional but realistic studies and judge their quality with six criteria that scientists use: Title, Access, Source, Theory, Methods & Data and Conclusion. After each study they see how well they did and an expert's feedback.

- Workshop: https://unlock-the-lab.web.app
- Live dashboard: https://unlock-the-lab.web.app/dashboard.html

## How a session works

1. **Welcome.** The tasks, the scoring and the data notice are explained before anything is stored. Each participant gets a random nickname, such as 'Curious Otter 42'.
2. **Guide.** A glossary and the rubric for the six criteria, both available again from every study.
3. **Studies.** For each of the 48 studies, shown in a different order to each participant, they give two answers on a scale from 1 to 7:
    - **Predict the crowd:** the average rating that workshop participants give the study. This answer earns points.
    - **Their own rating** of the study's quality.

    They then see their score, the target it was scored against and the expert's rating with a note on each criterion.

4. **Weights.** After at least 10 studies (all 48 if they like), participants share 20 tokens across the six criteria to show which matter most to them.
5. **Results.** Average score, place on the leaderboard, a chart comparing their ratings with everyone else's, a review of every study they rated and a personal link to come back to the results.

### Scoring

A prediction `p` for a study with expert rating `e`, which `n` other participants have rated with ratings summing to `S`, is scored against

```
target = (S + 100 × e) / (n + 100)
score  = max(0, 100 − round(12 × |p − target|))
```

The expert rating counts as 100 participants, so the target stays close to it until many people have rated the study. A participant's own rating never counts towards their own target. Leaderboards rank people by their average score per study, once they have rated at least 10 studies. When two averages are the same as whole percentages, the person who rated more studies ranks higher; if that is equal too, they share the place. The weight and the other constants are in `src/lib/config.js`.

## For workshop leaders

[`docs/facilitating.md`](docs/facilitating.md) explains how to run a workshop: room codes with their own leaderboard view and QR code, the dashboard, ending a workshop and how many people can join at once (100 simultaneous connections on Firebase's free plan). Facilitators sign in to the facilitator panel at `/admin.html` to make room links, export the data and end sessions.

Handouts are in `materials/workshop`: the sample studies and the evaluation guide with glossary (PDF and Word) and slides with a banner and a QR code. They were made before content version 2, so some study texts differ from the app; the app is the reference.

## Data and privacy

- Participants are pseudonymous: they are identified by a random nickname and random codes, and are never asked for a name, email address or other personal details.
- There are no analytics and no tracking cookies.
- Everything participants submit is publicly readable, so that the dashboard works without sign-in, and a daily backup copies it to the public `data` branch of this repository (with a commit whenever the data have changed). The welcome page says so before anyone starts.
- [`docs/data.md`](docs/data.md) describes every node and field, including the records version 1 of the app wrote.
- [`analysis/`](analysis/README.md) holds a reproducible Quarto report on the data.

## Local development

You need Node.js 24.12 or later, and Java 21 or later for the Firebase emulators.

```bash
git clone https://github.com/pablobernabeu/Unlock_the_Lab.git
cd Unlock_the_Lab
npm ci
npm run emulators   # first terminal: database (port 9000) and Auth (port 9099) emulators
npm run dev         # second terminal: http://localhost:3000
```

`npm run dev` talks only to the local emulators, never to the live database. The dashboard is at `/dashboard.html` and the facilitator panel at `/admin.html`. Without the emulators the pages still load, but nothing can be saved. To try the facilitator panel, create an account in the Auth emulator and list its uid under `/admins`:

```bash
curl -s 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin-password","returnSecureToken":true}'
# copy "localId" from the reply, then:
curl -s -X PUT -H 'Authorization: Bearer owner' -d 'true' \
  'http://127.0.0.1:9000/admins/<localId>.json?ns=unlock-the-lab-workshop-default-rtdb'
```

`npm run dev:live` runs the development server against the live database instead. Everything you do there is saved as real data, so use it only when you must.

### Checks

| Command                | What it does                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`         | ESLint                                                                                                                   |
| `npm run format:check` | Prettier (`npm run format` fixes the formatting)                                                                         |
| `npm test`             | unit tests (Vitest)                                                                                                      |
| `npm run test:rules`   | database rules tests; starts its own emulators, so stop `npm run emulators` first                                        |
| `npm run test:e2e`     | Playwright end-to-end and accessibility tests on a test build (in `dist-e2e/`, served on port 4317), using the emulators |
| `npm run build`        | production build in `dist/`                                                                                              |
| `npm run check`        | lint, format check, unit tests and build, as the first CI job runs them                                                  |

`npm run test:e2e` needs a browser (`npx playwright install chromium`) and reuses emulators that are already running. Each test **wipes the local database namespace and every Auth emulator account**, the same ones `npm run dev` uses, so expect to lose any local test data.

## Deployment

CI (`.github/workflows/ci.yml`) runs the checks on every pull request, publishes a preview channel for pull requests from this repository and deploys the site and the database rules to Firebase when a change reaches `main`. Previews use the live database and say so on every page. [`docs/deployment.md`](docs/deployment.md) covers the one-off set-up, administrators, backups and restoring, the legacy domain and running your own copy.

## Project structure

```
index.html, dashboard.html,     page shells for the workshop, the dashboard,
admin.html, 404.html            the facilitator panel and the not-found page
src/app/                        participant app
src/dashboard/                  public dashboard
src/admin/                      facilitator panel
src/lib/                        shared modules: scoring, statistics, leaderboard, translations, Firebase set-up
src/content/                    studies, glossary and rubric per language; expert ratings
src/i18n/                       interface text per language
src/styles/                     style sheets
public/                         files copied unchanged into the build
tools/                          build step that writes the English text into the pages
tests/unit/, tests/rules/,      unit tests, database rules tests and
tests/e2e/                      end-to-end tests
analysis/                       Quarto report on the workshop data
scripts/                        daily backup and the end-to-end test server
docs/                           data dictionary, deployment, facilitator guide, translating
materials/                      workshop handouts and artwork
redirect/                       page that forwards the legacy domain to the current one
database.rules.json             Realtime Database security rules
firebase.json, .firebaserc      Firebase Hosting, database and emulator settings
.github/                        CI, backup workflow and Dependabot
```

## Translating

The interface and the content can be translated without changing code; see [`docs/translating.md`](docs/translating.md). A language menu appears once a second language exists.

## Licence

- Code: [MIT](LICENSE).
- Content (the studies, rubric, glossary, workshop materials and artwork): [CC BY 4.0](LICENSE-CONTENT.md).

## Citation

Please cite the software as below; [`CITATION.cff`](CITATION.cff) has the details.

Bernabeu, P. (2026). _Unlock the Lab: Your guide to reading science like a scientist_ (Version 2.0.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.19153148

## Author

Dr Pablo Bernabeu, Department of Education, University of Oxford. The app and workshop were created in a personal capacity; the employer is not affiliated with, does not endorse and bears no liability for them.

Suggestions and bug reports are welcome on the [issue tracker](https://github.com/pablobernabeu/Unlock_the_Lab/issues).
