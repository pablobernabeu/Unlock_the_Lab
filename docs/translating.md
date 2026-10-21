# Adding a language

The interface and the content can be translated without touching the code. English is the reference: any string or field a translation leaves out, or leaves empty, falls back to English, so a translation can be added in stages.

## Files

For a language with code `xx` (an ISO 639 code such as `es`, `nb` or `pt-BR`):

| Copy                           | To                             | What it contains                |
| ------------------------------ | ------------------------------ | ------------------------------- |
| `src/i18n/en/common.json`      | `src/i18n/xx/common.json`      | Strings shared by all pages     |
| `src/i18n/en/app.json`         | `src/i18n/xx/app.json`         | Participant app                 |
| `src/i18n/en/dashboard.json`   | `src/i18n/xx/dashboard.json`   | Public dashboard                |
| `src/i18n/en/admin.json`       | `src/i18n/xx/admin.json`       | Admin panel (optional)          |
| `src/content/en/studies.json`  | `src/content/xx/studies.json`  | Study cards and expert feedback |
| `src/content/en/glossary.json` | `src/content/xx/glossary.json` | Glossary                        |
| `src/content/en/rubric.json`   | `src/content/xx/rubric.json`   | Rubric                          |

Once any file exists under `src/i18n/xx/`, the language appears in the language menu at the foot of each page, and `?lang=xx` selects it directly. Its name in the menu comes from the browser's own list of language names.

## Rules for translators

- Translate the values, never the keys.
- Keep placeholders in curly braces, such as `{count}` or `{name}`, exactly as they are; they are replaced with numbers and names when the page runs.
- Some values are objects with `one` and `other` (and, for some languages, `zero`, `two`, `few` or `many`): these are plural forms. Provide the forms your language needs; the browser picks the right one.
- A few strings contain simple HTML such as `<strong>`, `<em>`, `<i>` or a link. Keep the tags and translate the text inside them.
- In `studies.json`, keep each study's `id`. Translate the text fields and the `summary` and `note` of the feedback, but leave the `band` values (`low`, `medium`, `high`) in English: the pages use them for styling and translate the labels themselves.
- `glossary.json` and `rubric.json` are matched to English by position, so keep the entries in the same order as the English files, even if that is not alphabetical in your language.
- Expert ratings live in `src/content/expert-ratings.json` and are shared by all languages; do not copy that file.

## Checking a translation

```bash
npm run dev            # then open http://localhost:3000/?lang=xx
npm test               # checks that every key the code uses exists in English
```

Each rating records the interface language (`locale`), so analyses can separate or compare languages.
