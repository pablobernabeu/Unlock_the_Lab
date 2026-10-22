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

### Preview channels

Preview channels use the production database, so anything done on a preview is recorded as real data: sessions, ratings, leaderboard entries and weights. The `preview` job builds with `VITE_DEPLOY_TARGET=preview`, and every page of such a build shows a banner at the top: 'Preview build: anything you do here is saved to the live database.' (`src/lib/preview-banner.js`).

- Use previews to look at a change, not to test-run a workshop.
- The facilitator panel refuses to sign in on preview builds. Previews run a pull request's unreviewed code against the live database, so an administrator signed in there would give that code full rights, including ending sessions and deleting data.
- Check admin changes locally against the emulators instead (see 'Local development' in `README.md`).

A separate Firebase project for previews would remove the risk. It needs the owner: create a free project (for example `unlock-the-lab-preview`) with a Realtime Database and Anonymous and Email/Password sign-in, deploy `database.rules.json` to it, commit a `.env.preview` with its public `VITE_FIREBASE_*` values and `VITE_USE_EMULATORS=false`, build previews with `npx vite build --mode preview` and update this section.

### One-off setup

The workflow uses two service accounts, so that pull-request code never holds a key with rights over the data.

1. **Preview key.** The repository secret `FIREBASE_SERVICE_ACCOUNT_UNLOCK_THE_LAB_WORKSHOP` holds the key of the service account that `firebase init hosting:github` created. Only the `preview` job uses it. Keep the roles that command gave it (Firebase Hosting Admin, Firebase Authentication Admin and a few viewer roles) and do not give it any database role: the `preview` job runs a pull request's code, and its dependencies, before anyone has reviewed them.
2. **Deploy key.** In the Google Cloud console, under IAM & Admin → Service accounts, create a second account for deploys. Give it **Firebase Hosting Admin** (`roles/firebasehosting.admin`), **Firebase Realtime Database Admin** (`roles/firebasedatabase.admin`) and the same viewer roles as the first account, which the Firebase CLI reads during a deploy. Create a JSON key for it.
3. **Production environment.** In GitHub, under Settings → Environments, create an environment named `production`. Add the deploy key as the environment secret `FIREBASE_DEPLOY_SERVICE_ACCOUNT`, and under 'Deployment branches and tags' allow `main` only. Optionally add required reviewers, so that every deploy waits for approval. An environment secret reaches only jobs that run in that environment, which here is the `deploy` job alone. Without the secret, the `deploy` job stops with an error that points here.
4. Delete the key file from your computer once it is stored in GitHub.
5. GitHub Pages is no longer used. Disable it under Settings → Pages and delete the `gh-pages` branch.

### Deploy order

The rules require records that version 1 of the app did not write, so a browser tab that loaded version 1 before the deploy cannot save ratings afterwards until it is reloaded. Deploy between workshops.

Right after the first deploy of the version 2 rules, check the data once for keys named `hasOwnProperty`. The version 1 rules let anyone add a key with any name, and the Firebase web SDK cannot read a node that holds this one: the dashboard, the facilitator panel and the workshop would treat the whole node as empty. The version 2 rules allow no such key, so the check never needs repeating. The backup script reads over REST, which is not affected, and prints a warning for each such key:

```bash
node scripts/backup.mjs --out /tmp/utl-check --dry-run
```

Remove each path it names (the daily backup has already saved a copy):

```bash
npx firebase database:remove <path> --project unlock-the-lab-workshop --instance unlock-the-lab-workshop-default-rtdb
```

The script does not read `/active`; 'End all active sessions' in the facilitator panel clears it.

## Administrators

Admin rights come from the `/admins` node, not from the sign-in method:

1. In the Firebase console, under Authentication → Users, add an email/password user (or use an existing one) and copy its User UID.
2. Under Realtime Database → Data, add the child `admins/<uid>` with the value `true`.
3. Sign in at `/admin.html`.

Anyone can create an email/password account through the browser, but such an account gets no more than an anonymous participant: only accounts listed under `/admins` can use the facilitator panel or change other people's data. Leave 'Enable create (sign-up)' under Authentication → Settings → User actions switched on, because participants' anonymous accounts are new accounts too and turning it off can stop them from signing in. Anonymous sign-in must also stay enabled.

## Recommended hardening

Scores are computed in the browser, so a determined visitor could still submit invented ratings or inflate a leaderboard entry within the limits the rules enforce. The rules do refuse free text: a nickname must be one the app can generate. The measures below make scripted abuse harder. None of them is in place yet, and each needs more than a switch in the console.

### Firebase App Check (reCAPTCHA Enterprise)

1. **Code.** Initialise App Check in `src/lib/firebase.js` for both the default app and the admin app, with `initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true })`. Every page that uses the database then sends tokens, the dashboard and facilitator panel included. Skip it when `VITE_USE_EMULATORS` is `'true'`, because the emulators do not check tokens, and use a debug token for `npm run dev:live`.
2. **Content Security Policy.** In `firebase.json` (which `scripts/serve-dist.mjs` also uses), add `https://www.google.com/recaptcha/` and `https://www.gstatic.com/recaptcha/` to `script-src`, add a `frame-src` directive with `https://www.google.com/recaptcha/` and `https://recaptcha.google.com/recaptcha/`, and add `https://content-firebaseappcheck.googleapis.com` to `connect-src`. Without them the browser blocks reCAPTCHA, and once enforcement is on every database request fails.
3. **Backups.** The daily backup (`scripts/backup.mjs`) and `analysis/fetch-data.sh --live` read the database without credentials, so enforcement would refuse them too. Before enforcing, make them authenticate (for example with a service account access token), or keep App Check in monitoring mode.
4. **Monitoring first.** Watch the App Check metrics in the Firebase console for a while before you enforce it for the Realtime Database.

### reCAPTCHA for admin sign-in

Authentication's reCAPTCHA protection for email/password sign-in loads the same reCAPTCHA script. Add the `script-src` and `frame-src` sources above before switching it on, or admin sign-in stops working.

### API key restrictions

In the Google Cloud console, under APIs & Services → Credentials, the browser API key can be restricted:

- APIs: the Identity Toolkit API and the Token Service API, plus the Firebase App Check API if App Check is in use.
- Website referrers: `https://unlock-the-lab.web.app/*`, `https://unlock-the-lab.firebaseapp.com/*`, `https://unlock-the-lab--*.web.app/*` (preview channels) and, if you use `npm run dev:live`, `http://localhost:3000/*`. A list with only the live site breaks sign-in on previews and in `dev:live`.

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
3. Change the project and site names in `.firebaserc`, `firebase.json` and `.github/workflows/ci.yml`, and the database `instance` in `firebase.json` (the first label of your database URL, such as `my-fork-default-rtdb`). Change the database URL in `scripts/backup.mjs`, and the `connect-src` and `script-src` entries of the Content Security Policy in `firebase.json` if your database is not in a `*.firebasedatabase.app` domain. The end-to-end tests read the same `.env` files as the build, so they load the rules into your database's namespace on the emulator.
4. `npm run build` and `npx firebase deploy --only hosting,database`, then add an administrator as described above.
