# Workshop handouts

Two handouts for workshops, each as a Word document (to adapt) and a PDF (to print):

- **Evaluation guide** (`evaluation-guide.docx`, `evaluation-guide.pdf`): how the workshop works, the two tasks and how predictions are scored, the six criteria with the rubric, how to weigh the criteria up into one rating and the glossary. For participants.
- **Sample studies** (`sample-studies.docx`, `sample-studies.pdf`): six studies printed as participants see them in the app, one per page with the two answer scales, then an answer key with the expert's rating, summary and a note on each criterion. For facilitators: hand out the study pages and keep the answer key back.

The handouts are built from the files the app uses: the studies, glossary and rubric in `src/content/en/`, the expert ratings in `src/content/expert-ratings.json`, the interface text in `src/i18n/en/` and the scoring constants in `src/lib/config.js`. Everything they say about the studies, the criteria, the terms and the scoring comes from those files, and only the sentences that link them are written in the sources, so after a change to any of those files a new render brings the handouts back in line with the app. The six sample studies are chosen by a fixed rule (`choose_sample_studies()` in `handouts.R`): from each quality band, the study whose criteria most often differ from its overall band and the one whose criteria least often do.

## Rendering

You need R with the packages jsonlite, yaml, knitr and rmarkdown, and Quarto, which includes the Typst engine that makes the PDFs (the handouts were developed with Quarto 1.10 and R 4.3). Building the Word template also needs the `zip` command. From this folder:

```sh
./build.sh           # checks the helpers, builds reference.docx and renders all four files
./build.sh --check   # says whether any source has changed since the last render
```

`build.sh` records the checksums of the source files in `sources.sha256`; `--check` compares them with the current files and lists those that changed. It needs nothing but `sha256sum` or `shasum`.

The PDFs use Carlito, or Calibri where Carlito is not installed, so that they look like the Word versions. Quarto warns about whichever of the two is missing.

## Files

| File                                         | What it does                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `evaluation-guide.qmd`, `sample-studies.qmd` | the handouts' sources                                                               |
| `handouts.R`                                 | reads the app's files and turns them into Markdown                                  |
| `handouts.typ`                               | PDF page set-up: A4, fonts, tables, the answer scales and the footer                |
| `reference-docx.R`, `reference.docx`         | builds the Word template (A4, fonts, table borders, the footer); `build.sh` runs it |
| `_quarto.yml`                                | settings shared by both handouts                                                    |
| `tests/test-handouts.R`                      | checks of the helpers, run by `build.sh`                                            |
| `sources.sha256`                             | checksums of the sources of the last render                                         |
| `.gitignore`                                 | written by Quarto; keeps its cache folder out of git                                |

The handouts are licensed under CC BY 4.0, like the rest of the content (see `LICENSE-CONTENT.md` at the root of the repository). The handouts of version 1 are in the repository's history.
