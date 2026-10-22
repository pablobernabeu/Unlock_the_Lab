# Contributing

Bug reports, suggestions and pull requests are welcome on [GitHub](https://github.com/pablobernabeu/Unlock_the_Lab/issues).

## Making a change

1. Set up the project as described in the README (Node.js 22.22 or later, Java 21 for the emulators).
2. Work on a branch and keep each pull request to one topic.
3. Before opening the pull request, run `npm run check` (lint, formatting, unit tests and build), `npm run test:rules` if you changed `database.rules.json`, and `npm run test:e2e` if you changed a page. CI runs all of them again and publishes a preview of the site.

Development and tests use the Firebase emulators. Do not point a development build at the live database to try things out: everything written there is treated as research data.

## Conventions

- The code is plain JavaScript modules. Shared logic belongs in `src/lib/` and should stay free of Firebase imports where possible, so it can be unit-tested.
- Interface text lives in `src/i18n/en/*.json`, never in the JavaScript or HTML. Write it in British English with single quotation marks.
- Changes to the database rules need tests in `tests/rules/`, and changes to the shape of stored data need an update to `docs/data.md`.
- Changing the meaning of a study card or an expert rating changes the research stimulus. Raise `CONTENT_VERSION` in `src/lib/config.js`, so that ratings made before and after the change can be told apart, and record the change in `CHANGELOG.md`.
- Translations are described in [docs/translating.md](docs/translating.md).

By contributing, you agree that your code is released under the MIT License and your content under CC BY 4.0, as described in the README.
