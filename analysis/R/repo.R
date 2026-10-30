# Reads constants, validation patterns and content from the app's source
# files, so the analysis always uses the same values as the app instead of
# keeping copies that could drift.

read_text <- function(path) {
    if (!file.exists(path)) stop('Missing file: ', path, call. = FALSE)
    readLines(path, warn = FALSE, encoding = 'UTF-8')
}

#' Numeric constants such as `export const SEED_WEIGHT = 100;` from an ES module.
read_js_numbers <- function(path, names) {
    lines <- read_text(path)
    values <- vapply(names, function(name) {
        pattern <- sprintf('^\\s*export const %s = ([0-9][0-9_]*(\\.[0-9]+)?);', name)
        hit <- grep(pattern, lines, value = TRUE, perl = TRUE)
        if (length(hit) != 1) {
            stop(sprintf('Could not read the constant %s from %s', name, path), call. = FALSE)
        }
        as.numeric(gsub('_', '', sub(pattern, '\\1', hit, perl = TRUE), fixed = TRUE))
    }, numeric(1))
    as.list(values)
}

#' Regular-expression literals such as `export const STUDY_ID_PATTERN = /^STUDY-.../;`.
#' The app's patterns use only syntax that PCRE reads the same way.
read_js_patterns <- function(path, names) {
    lines <- read_text(path)
    values <- vapply(names, function(name) {
        pattern <- sprintf('^\\s*export const %s = /(.*)/[a-z]*;\\s*$', name)
        hit <- grep(pattern, lines, value = TRUE, perl = TRUE)
        if (length(hit) != 1) {
            stop(sprintf('Could not read the pattern %s from %s', name, path), call. = FALSE)
        }
        sub(pattern, '\\1', hit, perl = TRUE)
    }, character(1))
    as.list(values)
}

#' Criterion keys in the order defined in src/lib/criteria.js.
read_criterion_keys <- function(path) {
    lines <- read_text(path)
    hits <- regmatches(lines, regexpr("key: '[a-z]+'", lines))
    keys <- gsub("key: '|'", '', hits)
    if (length(keys) == 0) stop('Could not read criterion keys from ', path, call. = FALSE)
    keys
}

read_app_config <- function(repo_root) {
    lib <- file.path(repo_root, 'src', 'lib')
    config <- read_js_numbers(file.path(lib, 'config.js'), c(
        'SEED_WEIGHT', 'SCORE_PENALTY', 'MIN_STUDIES_TO_FINISH', 'MIN_STUDIES_TO_RANK',
        'TOKEN_BUDGET', 'CONTENT_VERSION', 'STUDY_COUNT', 'RATING_MIN', 'RATING_MAX'
    ))
    config$patterns <- read_js_patterns(file.path(lib, 'patterns.js'), c(
        'SESSION_ID_PATTERN', 'STUDY_ID_PATTERN', 'ROOM_PATTERN', 'USERNAME_PATTERN'
    ))
    config$criteria <- read_criterion_keys(file.path(lib, 'criteria.js'))
    config
}

#' Studies with their current expert ratings (src/content/expert-ratings.json is
#' the single source of the expert ratings; titles come from the English texts).
read_studies <- function(repo_root) {
    content <- file.path(repo_root, 'src', 'content')
    experts <- jsonlite::fromJSON(file.path(content, 'expert-ratings.json'))
    texts <- jsonlite::fromJSON(file.path(content, 'en', 'studies.json'), simplifyVector = TRUE)
    studies <- tibble::tibble(
        study_id = names(experts),
        expert = as.numeric(unlist(experts, use.names = FALSE))
    )
    fields <- intersect(c('title', 'access', 'source', 'overview', 'methods', 'conclusion'),
                        names(texts))
    full_text <- do.call(paste, unname(as.list(texts[fields])))
    titles <- tibble::tibble(study_id = texts$id, title = texts$title,
                             words = count_words(full_text))
    studies <- dplyr::left_join(studies, titles, by = 'study_id')
    studies$study_number <- as.integer(sub('^STUDY-', '', studies$study_id))
    studies$band <- quality_band(studies$expert)
    studies[order(studies$study_number), ]
}

#' Expert ratings of every content version, one row per version and study, from
#' src/content/expert-ratings-history.json (whose current version holds the
#' values of src/content/expert-ratings.json).
read_expert_history <- function(repo_root) {
    path <- file.path(repo_root, 'src', 'content', 'expert-ratings-history.json')
    if (!file.exists(path)) stop('Missing file: ', path, call. = FALSE)
    history <- jsonlite::fromJSON(path, simplifyVector = FALSE)
    rows <- lapply(names(history), function(key) {
        ratings <- history[[key]]
        tibble::tibble(version = as.integer(key), study_id = names(ratings),
                       expert = as.numeric(unlist(ratings, use.names = FALSE)))
    })
    dplyr::bind_rows(rows)
}

#' Study ids in the order of src/content/en/studies.json, which the app
#' shuffles to give each session its order.
read_study_order <- function(repo_root) {
    texts <- jsonlite::fromJSON(file.path(repo_root, 'src', 'content', 'en', 'studies.json'))
    texts$id
}

count_words <- function(text) {
    plain <- gsub('<[^>]+>', ' ', text)
    lengths(regmatches(plain, gregexpr('[[:alnum:]]+', plain)))
}

#' Quality bands as in src/lib/content.js: low 1-2, medium 3-5, high 6-7.
quality_band <- function(rating) {
    band <- dplyr::case_when(
        is.na(rating) ~ NA_character_,
        rating <= 2 ~ 'low',
        rating <= 5 ~ 'medium',
        TRUE ~ 'high'
    )
    factor(band, levels = c('low', 'medium', 'high'))
}

#' Criterion labels from the English UI strings, falling back to the key.
read_criterion_labels <- function(repo_root, keys) {
    path <- file.path(repo_root, 'src', 'i18n', 'en', 'common.json')
    labels <- if (file.exists(path)) jsonlite::fromJSON(path)$criteria else list()
    vapply(keys, function(key) {
        label <- labels[[key]]
        if (is.null(label)) tools::toTitleCase(key) else label
    }, character(1))
}

#' Studies changed by the v1 content revision (reference/content-revisions.csv).
#' Unstamped ratings given before `revised_at` saw the earlier texts and were
#' scored against `expert_before`.
read_content_revisions <- function(path) {
    revisions <- readr::read_csv(path, col_types = 'cccdd', comment = '#', na = '')
    tibble::tibble(
        study_id = revisions$study_id,
        revised_at = parse_utc(revisions$revised_at),
        text_fields_changed = dplyr::coalesce(revisions$text_fields_changed, ''),
        expert_before = revisions$expert_rating_before,
        expert_after = revisions$expert_rating_after
    )
}

parse_utc <- function(text) {
    as.POSIXct(text, format = '%Y-%m-%dT%H:%M:%OSZ', tz = 'UTC')
}

#' The commit the analysis code was rendered from, when git is available.
repo_commit <- function(repo_root) {
    out <- tryCatch(
        suppressWarnings(system2('git', c('-C', shQuote(repo_root), 'rev-parse', '--short', 'HEAD'),
                                 stdout = TRUE, stderr = FALSE)),
        error = function(error) character()
    )
    if (length(out) == 1 && nzchar(out)) out else NA_character_
}

#' Version of the Quarto that is rendering the report, when it can be found.
quarto_version <- function() {
    bin <- Sys.getenv('QUARTO_BIN_PATH')
    quarto <- if (nzchar(bin)) file.path(bin, 'quarto') else Sys.which('quarto')
    out <- tryCatch(
        suppressWarnings(system2(quarto, '--version', stdout = TRUE, stderr = FALSE)),
        error = function(error) character()
    )
    if (length(out) >= 1 && nzchar(out[1])) out[1] else 'version unknown'
}
