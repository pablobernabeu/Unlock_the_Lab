#!/usr/bin/env bash
# Renders the workshop handouts to Word and PDF from the app's own content and
# records the files they were made from in sources.sha256.
#
#   ./build.sh           check the helpers, build reference.docx and render both handouts
#   ./build.sh --check   only report whether the handouts are older than their sources
#
# Set QUARTO to use a Quarto other than the one on the PATH.
set -euo pipefail

cd "$(dirname "$0")"
here=materials/workshop/handouts
root=../../..
quarto=${QUARTO:-quarto}

# Everything the handouts are made from, relative to the repository root.
inputs=(
    src/content/en/studies.json
    src/content/en/glossary.json
    src/content/en/rubric.json
    src/content/expert-ratings.json
    src/i18n/en/app.json
    src/i18n/en/common.json
    src/lib/config.js
    src/lib/criteria.js
    src/app/scoring-facts.js
    CITATION.cff
    "$here/_quarto.yml"
    "$here/handouts.R"
    "$here/handouts.typ"
    "$here/reference-docx.R"
    "$here/evaluation-guide.qmd"
    "$here/sample-studies.qmd"
)
outputs=(evaluation-guide.docx evaluation-guide.pdf sample-studies.docx sample-studies.pdf)

checksums() {
    if command -v sha256sum > /dev/null; then
        (cd "$root" && sha256sum "${inputs[@]}")
    else
        (cd "$root" && shasum -a 256 "${inputs[@]}")
    fi
}

if [[ "${1:-}" == '--check' ]]; then
    if [[ ! -f sources.sha256 ]]; then
        echo 'The handouts have no sources.sha256: run ./build.sh.' >&2
        exit 1
    fi
    changed=$(diff <(checksums) sources.sha256 | sed -n 's/^< [0-9a-f]*  //p' || true)
    if [[ -n "$changed" ]]; then
        echo 'These files changed since the handouts were last rendered; run ./build.sh:' >&2
        echo "$changed" | sed 's/^/  /' >&2
        exit 1
    fi
    echo 'The handouts are up to date.'
    exit 0
fi

Rscript tests/test-handouts.R
Rscript reference-docx.R reference.docx "$quarto"
"$quarto" render

# The rendered files must show content HTML as formatting, never as tags.
for docx in evaluation-guide.docx sample-studies.docx; do
    if unzip -p "$docx" word/document.xml | grep -q '&lt;/\?[a-z]'; then
        echo "$docx contains HTML tags as text." >&2
        exit 1
    fi
done
if command -v pdftotext > /dev/null; then
    for pdf in evaluation-guide.pdf sample-studies.pdf; do
        text=$(pdftotext "$pdf" -)
        if grep -q '</\?[a-z]\+>' <<< "$text"; then
            echo "$pdf contains HTML tags as text." >&2
            exit 1
        fi
        if ! grep -q 'CC BY 4.0, Pablo Bernabeu' <<< "$text"; then
            echo "$pdf has no licence line." >&2
            exit 1
        fi
    done
fi

checksums > sources.sha256
echo "Rendered ${outputs[*]}."
