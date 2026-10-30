# Helpers for the workshop handouts. They read the studies, glossary, rubric,
# rating guide and expert ratings from the app's content files (src/content),
# the app's interface text (src/i18n/en) and its scoring constants (src/lib),
# and turn them into Markdown for Quarto. Nothing the handouts say about a
# study, the criteria or the scoring is typed in here, so a new render always
# matches the app.

`%||%` <- function(a, b) if (is.null(a)) b else a

#' Licence line printed in the footer and at the end of every handout.
HANDOUT_LICENCE <- 'CC BY 4.0, Pablo Bernabeu'

# Reading the app's files --------------------------------------------------

#' The repository root: the nearest folder at or above `start` that holds the
#' app's content.
find_repo_root <- function(start = getwd()) {
    dir <- normalizePath(start, mustWork = TRUE)
    repeat {
        if (file.exists(file.path(dir, 'src', 'content', 'expert-ratings.json'))) return(dir)
        parent <- dirname(dir)
        if (identical(parent, dir)) {
            stop('Could not find src/content in or above ', start, call. = FALSE)
        }
        dir <- parent
    }
}

read_json_file <- function(path) {
    if (!file.exists(path)) stop('Missing file: ', path, call. = FALSE)
    jsonlite::fromJSON(path, simplifyVector = FALSE)
}

read_lines <- function(path) {
    if (!file.exists(path)) stop('Missing file: ', path, call. = FALSE)
    readLines(path, warn = FALSE, encoding = 'UTF-8')
}

#' A numeric constant such as `export const SEED_WEIGHT = 100;` from an ES module.
read_js_number <- function(path, name) {
    pattern <- sprintf('^\\s*export const %s = ([0-9][0-9_]*(\\.[0-9]+)?);', name)
    hit <- grep(pattern, read_lines(path), value = TRUE, perl = TRUE)
    if (length(hit) != 1) {
        stop(sprintf('Could not read the constant %s from %s', name, path), call. = FALSE)
    }
    as.numeric(gsub('_', '', sub(pattern, '\\1', hit, perl = TRUE), fixed = TRUE))
}

#' The criteria in the order of src/lib/criteria.js, with the study field that
#' holds each one's text ('overview' is shown under 'Theory').
read_criteria <- function(path) {
    lines <- read_lines(path)
    pattern <- "key: '([a-z]+)', field: '([a-z]+)'"
    hits <- regmatches(lines, regexec(pattern, lines))
    hits <- Filter(function(hit) length(hit) == 3, hits)
    if (length(hits) == 0) stop('Could not read the criteria from ', path, call. = FALSE)
    data.frame(
        key = vapply(hits, `[`, '', 2),
        field = vapply(hits, `[`, '', 3),
        stringsAsFactors = FALSE
    )
}

#' Quality band of an expert rating, as qualityBand() in src/lib/content.js.
quality_band <- function(rating) {
    ifelse(rating <= 2, 'low', ifelse(rating <= 5, 'medium', 'high'))
}

#' Everything the handouts print, read from the app's own files.
load_handout_data <- function(root = find_repo_root()) {
    content <- file.path(root, 'src', 'content')
    lib <- file.path(root, 'src', 'lib')

    experts <- read_json_file(file.path(content, 'expert-ratings.json'))
    studies <- read_json_file(file.path(content, 'en', 'studies.json'))
    ids <- vapply(studies, function(study) study$id, '')
    missing <- setdiff(ids, names(experts))
    if (length(missing) > 0) {
        stop('No expert rating for ', paste(missing, collapse = ', '), call. = FALSE)
    }
    studies <- lapply(studies, function(study) {
        rating <- experts[[study$id]]
        if (!(rating %in% 1:7)) stop('Invalid expert rating for ', study$id, call. = FALSE)
        study$expertRating <- rating
        study$band <- quality_band(rating)
        study$number <- as.integer(sub('^STUDY-', '', study$id))
        study
    })

    config_path <- file.path(lib, 'config.js')
    config <- lapply(
        c(weight = 'SEED_WEIGHT', penalty = 'SCORE_PENALTY', min_finish = 'MIN_STUDIES_TO_FINISH',
          min_rank = 'MIN_STUDIES_TO_RANK', budget = 'TOKEN_BUDGET', study_count = 'STUDY_COUNT',
          content_version = 'CONTENT_VERSION', rating_min = 'RATING_MIN', rating_max = 'RATING_MAX'),
        function(name) read_js_number(config_path, name)
    )
    config$example_others <- read_js_number(
        file.path(root, 'src', 'app', 'scoring-facts.js'), 'EXAMPLE_OTHER_RATINGS'
    )

    citation <- yaml::read_yaml(file.path(root, 'CITATION.cff'))

    list(
        studies = studies,
        glossary = read_json_file(file.path(content, 'en', 'glossary.json')),
        rubric = read_json_file(file.path(content, 'en', 'rubric.json')),
        guide = read_json_file(file.path(content, 'en', 'guide.json')),
        strings = list(
            app = read_json_file(file.path(root, 'src', 'i18n', 'en', 'app.json')),
            common = read_json_file(file.path(root, 'src', 'i18n', 'en', 'common.json'))
        ),
        config = config,
        criteria = read_criteria(file.path(lib, 'criteria.js')),
        url = citation$url
    )
}

# Interface text ------------------------------------------------------------

#' The app's interface text for `key` ('app.welcome.scoringTarget'), with
#' `{name}` placeholders filled from `params` and the English plural form
#' chosen by `params$count`, as t() does in src/lib/i18n.js.
tr <- function(strings, key, params = list()) {
    value <- strings
    for (part in strsplit(key, '.', fixed = TRUE)[[1]]) {
        value <- if (is.list(value)) value[[part]] else NULL
        if (is.null(value)) stop('Missing interface text: ', key, call. = FALSE)
    }
    if (is.list(value)) {
        if (is.null(params$count)) stop('No count for the plural text ', key, call. = FALSE)
        value <- if (params$count == 1) value$one else value$other
    }
    for (name in names(params)) {
        value <- gsub(sprintf('{%s}', name), as.character(params[[name]]), value, fixed = TRUE)
    }
    if (grepl('\\{[A-Za-z]+\\}', value)) {
        stop('Unfilled placeholder in ', key, ': ', value, call. = FALSE)
    }
    value
}

# Numbers as the app formats them ---------------------------------------------

#' Math.round: halves round up, unlike R's round().
js_round <- function(x) floor(x + 0.5)

#' formatPercent() in src/lib/format.js, e.g. 83.33 -> '83%'.
format_percent <- function(value) paste0(js_round(value), '%')

#' scoringTarget() in src/lib/scoring.js.
scoring_target <- function(other_sum, other_n, expert, weight) {
    if (other_n == 0) return(expert)
    (other_sum + expert * weight) / (other_n + weight)
}

#' predictionScore() in src/lib/scoring.js.
prediction_score <- function(prediction, target, penalty) {
    max(0, 100 - js_round(abs(prediction - target) * penalty))
}

# Markdown output ---------------------------------------------------------------

#' Escapes Markdown syntax in plain text, so content is printed literally.
md_escape <- function(text) {
    gsub('([\\\\`*_{}\\[\\]<>#+!|$@~^])', '\\\\\\1', text, perl = TRUE)
}

#' Converts the small set of trusted HTML in content and interface text
#' (<i>, <em>, <b>, <strong>, <a href>) to Markdown and escapes everything
#' else, so '<i>N</i>' prints as an italic N rather than as tags.
html_to_md <- function(html) {
    html <- gsub('\\s+', ' ', trimws(html))
    pattern <- '</?[A-Za-z][A-Za-z0-9]*(?:\\s[^>]*)?>'
    tags <- regmatches(html, gregexpr(pattern, html, perl = TRUE))[[1]]
    texts <- regmatches(html, gregexpr(pattern, html, perl = TRUE), invert = TRUE)[[1]]
    texts <- gsub('&amp;', '&', gsub('&lt;', '<', gsub('&gt;', '>', texts, fixed = TRUE),
                                     fixed = TRUE), fixed = TRUE)
    links <- character()
    out <- md_escape(texts[1])
    for (i in seq_along(tags)) {
        tag <- tolower(tags[i])
        name <- sub('^</?([a-z0-9]+).*$', '\\1', tag)
        closing <- startsWith(tag, '</')
        markdown <- if (name %in% c('i', 'em')) {
            '*'
        } else if (name %in% c('b', 'strong')) {
            '**'
        } else if (name == 'a' && !closing) {
            href <- sub('^.*\\shref="([^"]*)".*$', '\\1', tags[i])
            if (identical(href, tags[i])) stop('Link without href: ', tags[i], call. = FALSE)
            links <- c(links, href)
            '['
        } else if (name == 'a') {
            href <- links[length(links)]
            links <- links[-length(links)]
            sprintf('](%s)', href)
        } else {
            stop('Unsupported HTML in content: ', tags[i], call. = FALSE)
        }
        out <- paste0(out, markdown, md_escape(texts[i + 1] %||% ''))
    }
    if (is.na(out)) out <- ''
    # A paragraph that happens to start like a list item stays a paragraph.
    sub('^(\\d+)([.)])', '\\1\\\\\\2', sub('^-', '\\\\-', out))
}

#' Small whole numbers as words in running text ('six studies').
number_words <- function(n) {
    words <- c('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten')
    ifelse(n >= 1 & n <= 10 & n == round(n), words[pmin(pmax(n, 1), 10)], as.character(n))
}

#' 'a, b and c': a list in running text, without a serial comma.
and_list <- function(items) {
    if (length(items) < 2) return(paste(items, collapse = ''))
    paste(paste(items[-length(items)], collapse = ', '), 'and', items[length(items)])
}

#' Prints Markdown blocks from an R chunk with `results: asis`.
emit <- function(...) {
    blocks <- unlist(list(...), use.names = FALSE)
    cat(paste0(blocks, collapse = '\n\n'), '\n\n', sep = '')
}

#' A pipe table. `widths` are relative column widths; the separator line is
#' made long enough that Pandoc uses them for both Word and PDF.
md_table <- function(header, rows, widths) {
    dashes <- vapply(js_round(widths / sum(widths) * 100), function(n) {
        strrep('-', max(3, n))
    }, '')
    line <- function(cells) paste0('| ', paste(cells, collapse = ' | '), ' |')
    paste(c(line(header), paste0('|', paste(dashes, collapse = '|'), '|'),
            vapply(rows, line, '')), collapse = '\n')
}

#' A Typst string literal.
typst_string <- function(text) paste0('"', gsub('(["\\\\])', '\\\\\\1', text), '"')

#' Raw Typst, which only the PDF render keeps.
typst_block <- function(...) paste0('```{=typst}\n', paste0(..., collapse = '\n'), '\n```')

#' Content left out of one format.
unless_in <- function(format, ...) {
    paste0('::: {.content-visible unless-format="', format, '"}\n\n',
           paste0(..., collapse = '\n\n'), '\n\n:::')
}

#' Starts a new page with `line`, a short paragraph. The PDF gets a page
#' break; in Word the paragraph's style ('Page Start' in reference.docx) does
#' it, which never leaves a blank page.
page_start <- function(line) {
    c(typst_block('#pagebreak(weak: true)'),
      paste0('::: {custom-style="Page Start"}\n', line, '\n:::'))
}

#' The licence line and app address for the PDF's page footer, which
#' handouts.typ lays out with the page number.
footer_metadata <- function(data, licence = HANDOUT_LICENCE) {
    typst_block(sprintf('#metadata((licence: %s, url: %s)) <handout-footer>',
                        typst_string(licence), typst_string(data$url)))
}

#' The last paragraph of a handout: where it comes from, the licence and the app.
closing_line <- function(data, licence = HANDOUT_LICENCE) {
    sprintf(
        paste('Made from the studies, glossary, rubric and rating guide of content version %d',
              'of Unlock the Lab, the same files the app uses. %s. %s'),
        data$config$content_version, md_escape(licence), sprintf('<%s>', data$url)
    )
}

# Study cards -------------------------------------------------------------------

criterion_label <- function(data, key) tr(data$strings, paste0('common.criteria.', key))

band_label <- function(data, band) {
    tr(data$strings, paste0('app.feedback.band', toupper(substr(band, 1, 1)), substring(band, 2)))
}

#' Study text as the participant sees it: 'Data availability:' in Methods is
#' set in bold, as studySectionHtml() in src/app/views/study.js does.
study_section_md <- function(data, study, field) {
    html <- study[[field]] %||% ''
    if (field == 'methods') {
        label <- tr(data$strings, 'app.study.dataAvailability')
        html <- sub(label, paste0('<strong>', label, '</strong>'), html, fixed = TRUE)
    }
    html_to_md(html)
}

#' The 1-7 answer scale: circles to mark in the PDF, a table in Word.
rating_scale <- function(data) {
    low <- tr(data$strings, 'app.study.endLow')
    high <- tr(data$strings, 'app.study.endHigh')
    points <- seq(data$config$rating_min, data$config$rating_max)
    c(
        typst_block(sprintf('#rating-scale(%s, %s, %d, %d)', typst_string(low),
                            typst_string(high), points[1], points[length(points)])),
        unless_in('typst', md_table(
            c(md_escape(low), points, md_escape(high)),
            list(rep('', length(points) + 2)),
            c(3, rep(1, length(points)), 3)
        ))
    )
}

#' One study on its own page, laid out as the app's study view shows it, with
#' the two answers.
study_card_md <- function(data, study, label) {
    sections <- data$criteria[data$criteria$key != 'title', ]
    c(
        page_start(sprintf('**%s** \u00b7 %s', md_escape(label),
                           md_escape(tr(data$strings, 'app.study.fictional')))),
        # The small label the app shows above the title, which is also a criterion.
        typst_block(sprintf('#field-label(%s)', typst_string(criterion_label(data, 'title')))),
        unless_in('typst', sprintf('[%s]{.smallcaps}', md_escape(criterion_label(data, 'title')))),
        sprintf('# %s {.unnumbered}', html_to_md(study$title)),
        unlist(Map(function(key, field) {
            c(sprintf('## %s {.unnumbered}', md_escape(criterion_label(data, key))),
              study_section_md(data, study, field))
        }, sections$key, sections$field), use.names = FALSE),
        sprintf('## %s {.unnumbered}', md_escape(tr(data$strings, 'app.study.answersHeading'))),
        sprintf('**%s**', md_escape(tr(data$strings, 'app.study.predictionLegend'))),
        html_to_md(tr(data$strings, 'app.study.predictionHint')),
        rating_scale(data),
        sprintf('**%s**', md_escape(tr(data$strings, 'app.study.ratingLegend'))),
        html_to_md(tr(data$strings, 'app.study.ratingHint')),
        rating_scale(data)
    )
}

# Choosing the sample studies ---------------------------------------------------

#' Number of criteria whose expert band differs from the study's overall band.
band_disagreement <- function(study, keys) {
    bands <- vapply(keys, function(key) study$feedback$criteria[[key]]$band %||% NA_character_, '')
    if (anyNA(bands)) stop('Missing criterion feedback for ', study$id, call. = FALSE)
    sum(bands != study$band)
}

#' Two studies from each quality band: the hardest to judge (the most
#' criteria whose band differs from the overall one) and the clearest (the
#' fewest), with a different expert rating from the first where the band has
#' one. Ties go to the lower study number. Returned in study-number order.
choose_sample_studies <- function(studies, keys) {
    picked <- list()
    for (band in c('low', 'medium', 'high')) {
        pool <- Filter(function(study) study$band == band, studies)
        if (length(pool) < 2) stop('Fewer than two studies in the ', band, ' band', call. = FALSE)
        disagreement <- vapply(pool, band_disagreement, numeric(1), keys = keys)
        number <- vapply(pool, function(study) study$number, numeric(1))
        hardest <- pool[[order(-disagreement, number)[1]]]
        rest <- which(vapply(pool, function(study) study$id != hardest$id, logical(1)))
        other_rating <- rest[vapply(pool[rest], function(study) {
            study$expertRating != hardest$expertRating
        }, logical(1))]
        if (length(other_rating) > 0) rest <- other_rating
        clearest <- pool[[rest[order(disagreement[rest], number[rest])[1]]]]
        picked <- c(picked, list(hardest, clearest))
    }
    picked[order(vapply(picked, function(study) study$number, numeric(1)))]
}
