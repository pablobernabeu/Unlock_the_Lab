# Deployment and administration

The live site is Firebase Hosting site `unlock-the-lab` (https://unlock-the-lab.web.app) in the Firebase project `unlock-the-lab-workshop`, with a Realtime Database instance `unlock-the-lab-workshop-default-rtdb` in `europe-west1`. The project runs on the free Spark plan.

## Continuous integration and deployment

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

| Job       | What it does                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `check`   | `npm ci`, ESLint, Prettier, unit tests, production build                                                                                    |
| `rules`   | database rules tests against the Realtime Database emulator                                                                                 |
| `e2e`     | Playwright end-to-end and accessibility tests against the emulators                                                                         |
| `preview` | pull requests only: builds and publishes a Firebase Hosting preview channel (expires after 7 days) and comments its URL on the pull request |
| `deploy`  | pushes to `main` only, after the three checks pass: `firebase deploy --only hosting,database`                                               |

Preview channels use the production database, so anything done on a preview is recorded as real data. Use them to look, not to test-run a workshop.

### One-off setup

1. The repository secret `FIREBASE_SERVICE_ACCOUNT_UNLOCK_THE_LAB_WORKSHOP` holds the key of the service account that `firebase init hosting:github` created. Deploying the database rules needs one more role on that account: in the Google Cloud console, under IAM, grant it **Firebase Realtime Database Admin** (`roles/firebasedatabase.admin`). Without it the `deploy` job fails at the rules step.
2. Optionally, create a GitHub environment named `production` (Settings → Environments) to require approval before deploys.
3. GitHub Pages is no longer used. Disable it under Settings → Pages and delete the `gh-pages` branch.

### Deploy order

The rules require records that version 1 of the app did not write, so a browser tab that loaded version 1 before the deploy cannot save ratings afterwards until it is reloaded. Deploy between workshops.

## Administrators

Admin rights come from the `/admins` node, not from the sign-in method:

1. In the Firebase console, under Authentication → Users, add an email/password user (or use an existing one) and copy its User UID.
2. Under Realtime Database → Data, add the child `admins/<uid>` with the value `true`.
3. Sign in at `/admin.html`.

Under Authentication → Settings → User actions, turn off 'Enable create (sign-up)' so that nobody can create an email/password account from the browser. Anonymous sign-in must stay enabled for participants.

## Recommended hardening

Scores are computed in the browser, so a determined visitor could still submit invented ratings or inflate a leaderboard entry within the limits the rules enforce. Firebase App Check (with reCAPTCHA Enterprise) makes scripted abuse much harder and needs no code changes beyond initialising it. In the Google Cloud console, restrict the browser API key to the Identity Toolkit and Token Service APIs and to the site's referrers.

## Backups and restoring

`.github/workflows/backup.yml` runs daily and commits a snapshot to the `data` branch when the data have changed (see `docs/data.md`). Run it by hand from the Actions tab; after a deliberate deletion, run it once with 'Allow empty nodes' ticked, otherwise it refuses to overwrite a non-empty backup with an empty one.

The rules validate even administrators' writes, so restore with the Firebase CLI, which bypasses them:

```bash
git fetch origin data
git show origin/data:ratings.json > /tmp/ratings.json
npx firebase database:set /ratings /tmp/ratings.json --project unlock-the-lab-workshop --instance unlock-the-lab-workshop-default-rtdb
```

Repeat for `leaderboard`, `rankings` and `sessions` as needed.

## The legacy domain

The old address https://unlock-the-lab-workshop.web.app is a separate Hosting site that redirects to the current one, keeping the path and query string. CI does not deploy it; after changing `redirect/`, run:

```bash
npx firebase deploy --only hosting --config firebase-redirect.json --project unlock-the-lab-workshop
```

## Running your own copy

1. Create a Firebase project with a Realtime Database and enable Anonymous and Email/Password sign-in.
2. Put its web configuration in a `.env.local` file (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`) or edit `src/lib/firebase-config.js`.
3. Change the project and site names in `.firebaserc`, `firebase.json` and `.github/workflows/ci.yml`, and the database URL in `scripts/backup.mjs` and the `connect-src` and `script-src` entries of the Content Security Policy in `firebase.json` if your database is not in a `*.firebasedatabase.app` domain.
4. `npm run build` and `npx firebase deploy --only hosting,database`, then add an administrator as described above.
