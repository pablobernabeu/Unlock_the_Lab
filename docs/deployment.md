# Deployment and administration

The live site is Firebase Hosting site `unlock-the-lab` (https://unlock-the-lab.web.app) in the Firebase project `unlock-the-lab-workshop`, with a Realtime Database instance `unlock-the-lab-workshop-default-rtdb` in `europe-west1`. The project runs on the free Spark plan.

## Continuous integration and deployment

`.github/workflows/ci.yml` runs on every pull request, and on every push to `main` except pushes that change only Markdown files, `docs/`, `materials/`, `analysis/`, `CITATION.cff` or the licences:

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
- Never enter administrator credentials on a preview. Previews run a pull request's unreviewed code against the live database, so an administrator signed in there would give that code full rights, including ending sessions and deleting data. The panel refuses to sign in on preview builds, but that check is part of the pull request's own code, which the pull request can change, so it guards only against accidents.
- Check admin changes locally against the emulators instead (see 'Local development' in `README.md`).
- Once Firebase App Check is enforced ('Recommended hardening' below), previews can no longer reach the database at all.

A separate Firebase project for previews would remove the risk. It needs the owner: create a free project (for example `unlock-the-lab-preview`) with a Realtime Database and Anonymous and Email/Password sign-in, deploy `database.rules.json` to it, commit a `.env.preview` with its public `VITE_FIREBASE_*` values and `VITE_USE_EMULATORS=false`, build previews with `npx vite build --mode preview` and update this section.

### One-off set-up

The workflow uses two service accounts, so that pull-request code never holds a key with rights over the data.

1. **Preview key.** The repository secret `FIREBASE_SERVICE_ACCOUNT_UNLOCK_THE_LAB_WORKSHOP` holds the key of the service account that `firebase init hosting:github` created. Only the `preview` job uses it. Keep the roles that command gave it (Firebase Hosting Admin, Firebase Authentication Admin and a few viewer roles) and do not give it any database role: the `preview` job runs a pull request's code, and its dependencies, before anyone has reviewed them.
2. **Deploy key.** In the Google Cloud console, under IAM & Admin → Service accounts, create a second account for deploys. Give it **Firebase Hosting Admin** (`roles/firebasehosting.admin`), **Firebase Realtime Database Admin** (`roles/firebasedatabase.admin`) and the same viewer roles as the first account, which the Firebase CLI reads during a deploy. Create a JSON key for it.
3. **Production environment.** In GitHub, under Settings → Environments, create an environment named `production`. Add the deploy key as the environment secret `FIREBASE_DEPLOY_SERVICE_ACCOUNT`, and under 'Deployment branches and tags' allow `main` only. Optionally add required reviewers, so that every deploy waits for approval. An environment secret reaches only jobs that run in that environment, which here is the `deploy` job alone. Without the secret, the `deploy` job stops with an error that points here.
4. Delete the key file from your computer once it is stored in GitHub.
5. GitHub Pages is no longer used. Disable it under Settings → Pages and delete the `gh-pages` branch.

### Deploy order

The rules require records that version 1 of the app did not write, so a browser tab that loaded version 1 before the deploy cannot save ratings afterwards until it is reloaded. Deploy between workshops.

The version 1 rules do not let anyone read `/sessions`, so until the version 2 rules are live the daily backup skips that node with a warning and backs up the others. Create the `production` environment and its secret (step 3 above) before merging, check that the deploy job of the merge commit succeeded, then run the 'Backup data' workflow by hand once to create the `data` branch.

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

Scores are computed in the browser, so a determined visitor could still submit invented ratings or inflate a leaderboard entry within the limits the rules enforce. The rules do refuse free text: a nickname must be one the app can generate. The measures below make scripted abuse harder. None of them is switched on yet. The code for App Check is in place and waits for the console and GitHub steps below.

### Firebase App Check (reCAPTCHA Enterprise)

With App Check, each page shows Firebase that it is the real site in a real browser: reCAPTCHA Enterprise checks the browser, and Firebase exchanges its verdict for a short-lived App Check token that the page sends with its database and sign-in requests. Once App Check is enforced, the database refuses requests without a valid token, so scripts that call the database directly stop working.

What the code does:

- `src/lib/firebase.js` starts App Check (`src/lib/app-check.js`) with the reCAPTCHA Enterprise provider for the participants' app and for the facilitator panel's separate app, before either uses the database or sign-in. It does so only in builds made with `VITE_APPCHECK_SITE_KEY`; other builds do not include the App Check SDK and never start it.
- Builds that use the emulators never start App Check, because the emulators do not check tokens.
- `npm run dev:live` can use a debug token instead of reCAPTCHA (`VITE_APPCHECK_DEBUG_TOKEN`, see below). Production builds ignore that variable, so a debug token never reaches the deployed pages.
- The Content Security Policy in `firebase.json` allows what App Check and reCAPTCHA load, each source limited to the path it needs:

| Directive     | Source                                                                                      | Used for                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `script-src`  | `https://www.google.com/recaptcha/`                                                         | the reCAPTCHA Enterprise script (`enterprise.js`), which the App Check SDK adds to the page |
| `script-src`  | `https://www.gstatic.com/recaptcha/`                                                        | the code that script loads in turn                                                          |
| `frame-src`   | `https://www.google.com/recaptcha/`                                                         | reCAPTCHA's invisible frame                                                                 |
| `frame-src`   | `https://recaptcha.google.com/recaptcha/`                                                   | the same frame from reCAPTCHA's alternative domain                                          |
| `connect-src` | `https://content-firebaseappcheck.googleapis.com/v1/projects/unlock-the-lab-workshop/apps/` | exchanging reCAPTCHA (or debug) tokens for App Check tokens, for this project's apps only   |

The SDK adds reCAPTCHA as an ordinary external script, so the policy needs no nonce and no `'unsafe-inline'`. `tests/unit/lib/csp.test.js` checks the policy against the URLs in the installed SDK, so an update that moves them fails the tests.

#### Turning it on

Take the steps in this order, between workshops. Nothing is refused until step 7, so every earlier step can be checked, and undone, without affecting participants.

1. **Create the reCAPTCHA Enterprise key.** In the Google Cloud console for the project `unlock-the-lab-workshop`, under Security → reCAPTCHA, create a key for a website with the domains `unlock-the-lab.web.app` and `unlock-the-lab.firebaseapp.com` and without the checkbox challenge (Google may ask you to enable the reCAPTCHA Enterprise API first). Then in the Firebase console, under App Check → Apps, choose the web app, pick reCAPTCHA Enterprise, paste the key's ID (the site key) and save. Check reCAPTCHA's current pricing before you start: it has a free monthly allowance, each App Check token the site obtains counts against it, and a workshop needs a few hundred at most.
2. **Give the build the site key.** In GitHub, under Settings → Secrets and variables → Actions → Variables, add the repository variable `VITE_APPCHECK_SITE_KEY` with the site key. A site key is not a secret, since every visitor's browser receives it. The `check` and `deploy` jobs in `.github/workflows/ci.yml` pass the variable to `npm run build`; without it they build without App Check, as before. Nothing changes on the live site until the next deploy. The `preview` job leaves it out on purpose: a reCAPTCHA key works only on the domains it lists, and a preview's address (`unlock-the-lab--<channel>-<id>.web.app`) is not under the site's domain. Listing `web.app` instead would let any Firebase Hosting site obtain tokens for this project.
3. **Update the privacy notices, and deploy.** reCAPTCHA sends information about the browser to Google and sets a Google cookie, and App Check hides the reCAPTCHA badge, which reCAPTCHA's terms allow only when the page says that reCAPTCHA is in use. Rewrite 'There are no analytics or tracking cookies.' on the welcome page (`app.dataNoTracking` in `src/i18n/en/app.json`) and under 'Data and privacy' in `README.md`, and add Google's sentence 'This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.', linking to https://policies.google.com/privacy and https://policies.google.com/terms, to the participant pages, the dashboard and the facilitator panel, which all load reCAPTCHA. Merging this change deploys the first build with App Check, so the notices and reCAPTCHA go live together.
4. **Check.** Once the deploy has finished, open the workshop, the dashboard and the facilitator panel with the browser's developer tools open: the console should show no Content Security Policy errors, and the network log should show a successful request to `content-firebaseappcheck.googleapis.com`. In the Firebase console, App Check → APIs → Realtime Database should start counting verified requests.
5. **Register a debug token for the backups.** The daily backup reads the database from GitHub, where reCAPTCHA cannot run. In the Firebase console, under App Check → Apps, open the web app's menu, choose Manage debug tokens, add a token named 'GitHub backup' and copy its value. Store it as the repository secret `FIREBASE_APPCHECK_DEBUG_TOKEN` (Settings → Secrets and variables → Actions → Secrets). `.github/workflows/backup.yml` passes it to `scripts/backup.mjs`, which exchanges it for an App Check token and sends that with every read. Run 'Backup data' by hand: the log should say 'Sending an App Check token from FIREBASE_APPCHECK_DEBUG_TOKEN.' and the run should succeed. `analysis/fetch-data.sh --live` uses the same script, so register a second token for your own computer and export it as `FIREBASE_APPCHECK_DEBUG_TOKEN` before you use `--live`. A debug token passes App Check without reCAPTCHA, so treat it like a password: if one leaks, delete it in the same dialog and register a new one.
6. **Monitor.** Leave App Check unenforced through at least one workshop, or a week. App Check → APIs → Realtime Database shows verified requests, unverified requests from outdated clients and unverified invalid requests. Some unverified requests are expected: tabs opened before the deploy, preview channels and anything else that reads the database without a token. Look into a large or growing share before you go on.
7. **Enforce.** Under App Check → APIs → Realtime Database, choose Enforce. It takes effect within about 15 minutes, and Unenforce in the same place undoes it. If the console also lists Authentication, it can be enforced the same way afterwards: the app's sign-in requests already carry tokens.

Once enforcement is on, preview channels can no longer read or write the database. They still show the pages, which is enough to look at a change, and they no longer add test data to the live database. The Firebase CLI, which you use to restore backups, signs in with your Google account and is not affected.

What happens if a step is skipped:

| Step skipped                           | What breaks                                                                                                                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, or a key without the site's domains | reCAPTCHA will not vouch for the pages. Before enforcement their requests still go through, unverified; after it, nobody can start the workshop and the dashboard and facilitator panel show no data. |
| 2                                      | The deployed pages send no tokens, so every request counts as unverified, and enforcing locks out every participant, the dashboard and the facilitator panel.                                         |
| 3                                      | The welcome page says there are no tracking cookies when there are, and hiding the badge without the notice breaks reCAPTCHA's terms.                                                                 |
| 4                                      | A wrong key, a blocked script or a failing token exchange goes unnoticed until enforcement turns it into an outage.                                                                                   |
| 5                                      | After enforcement every read of the backup is refused: 'Backup data' fails and no backup is made until the secret is added. `analysis/fetch-data.sh --live` fails the same way.                       |
| 6                                      | Clients you did not know about, such as an old tab or a script of your own, are locked out without warning.                                                                                           |

**Development against the live database.** `npm run dev:live` runs on `localhost`, which the key does not list, so it needs a debug token of its own. Register one as in step 5 and put it, with the site key, in `.env.live.local`, which git ignores:

```bash
VITE_APPCHECK_SITE_KEY=<site key>
VITE_APPCHECK_DEBUG_TOKEN=<debug token>
```

`npm run dev` and the tests use the emulators and need neither.

### reCAPTCHA for admin sign-in

Authentication's reCAPTCHA protection for email/password sign-in loads the same reCAPTCHA Enterprise script, which the Content Security Policy already allows. Add the privacy notices from step 3 above before you switch it on, because the facilitator panel then loads reCAPTCHA even without App Check.

### API key restrictions

In the Google Cloud console, under APIs & Services → Credentials, the browser API key can be restricted:

- APIs: the Identity Toolkit API and the Token Service API, plus the Firebase App Check API once App Check is on.
- Website referrers: `https://unlock-the-lab.web.app/*`, `https://unlock-the-lab.firebaseapp.com/*`, `https://unlock-the-lab--*.web.app/*` (preview channels) and, if you use `npm run dev:live`, `http://localhost:3000/*`. A list with only the live site breaks sign-in on previews and in `dev:live`. The backup script sends `https://unlock-the-lab.web.app/` as its referrer when it exchanges its debug token, so this list does not block it.

## Backups and restoring

`.github/workflows/backup.yml` runs daily and commits a snapshot to the `data` branch when the data have changed (see `docs/data.md`). Once App Check is enforced it needs the repository secret `FIREBASE_APPCHECK_DEBUG_TOKEN` (step 5 under 'Firebase App Check' above). Run it by hand from the Actions tab; after a deliberate deletion, run it once with 'Allow empty nodes' ticked, otherwise it refuses to overwrite a non-empty backup with an empty one.

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
3. Change the project and site names in `.firebaserc`, `firebase.json` and `.github/workflows/ci.yml`, and the database `instance` in `firebase.json` (the first label of your database URL, such as `my-fork-default-rtdb`). Change `DEFAULT_DATABASE_URL`, `APP_CHECK_APP` and `SITE_URL` in `scripts/backup.mjs` (a unit test compares `APP_CHECK_APP` with `src/lib/firebase-config.js`), the project id in the App Check `connect-src` entry of the Content Security Policy in `firebase.json`, and its `connect-src` and `script-src` database entries if your database is not in a `*.firebasedatabase.app` domain. The end-to-end tests read the same `.env` files as the build, so they load the rules into your database's namespace on the emulator.
4. `npm run build` and `npx firebase deploy --only hosting,database`, then add an administrator as described above.
