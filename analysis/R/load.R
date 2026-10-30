# Reads a backup snapshot (one JSON file per database node, as written by
# scripts/backup.mjs or the v1 backup workflow) and flattens each node into a
# tibble. Every reader accepts legacy records: fields that a record lacks
# become NA, and very old ratings stored as bare numbers keep only `rating`.

SNAPSHOT_NODES <- c('ratings', 'leaderboard', 'rankings', 'sessions', 'active')

read_snapshot <- function(dir) {
    if (!dir.exists(dir)) {
        stop('No data directory at ', normalizePath(dir, mustWork = FALSE),
             '. Run fetch-data.sh first (see README.md).', call. = FALSE)
    }
    paths <- file.path(dir, paste0(SNAPSHOT_NODES, '.json'))
    present <- stats::setNames(file.exists(paths), SNAPSHOT_NODES)
    nodes <- stats::setNames(lapply(paths, read_node), SNAPSHOT_NODES)
    list(
        dir = dir,
        present = present,
        nodes = nodes,
        info = read_json_file(file.path(dir, 'backup-info.json')),
        fetch = read_json_file(file.path(dir, 'fetch-info.json')),
        files = file_manifest(dir)
    )
}

read_json_file <- function(path) {
    if (!file.exists(path)) return(NULL)
    jsonlite::fromJSON(path, simplifyVector = FALSE)
}

# A node file that holds `null` (an empty node) reads as an empty list.
read_node <- function(path) {
    if (!file.exists(path)) return(NULL)
    value <- read_json_file(path)
    if (is.null(value)) list() else value
}

file_manifest <- function(dir) {
    files <- sort(list.files(dir, pattern = '\\.json$', full.names = TRUE))
    tibble::tibble(
        file = basename(files),
        bytes = file.size(files),
        md5 = unname(tools::md5sum(files))
    )
}

#' Time the snapshot was taken: backup-info.json when present, otherwise the
#' newest modification time of the node files (marked as approximate).
snapshot_time <- function(snapshot) {
    stamp <- snapshot$info$lastBackup
    if (is.character(stamp) && length(stamp) == 1) {
        time <- parse_utc(sub('\\.[0-9]+Z$', 'Z', stamp))
        if (!is.na(time)) return(list(time = time, source = 'backup-info.json'))
    }
    files <- file.path(snapshot$dir, paste0(SNAPSHOT_NODES[snapshot$present], '.json'))
    if (length(files) == 0) return(list(time = as.POSIXct(NA), source = 'unknown'))
    list(time = max(file.mtime(files)), source = 'file modification time')
}

# Scalars of the expected type, otherwise NA. Firebase values are untyped, so
# every field is checked rather than coerced.
scalar_num <- function(x) {
    if (is.numeric(x) && length(x) == 1 && is.finite(x)) as.numeric(x) else NA_real_
}
scalar_chr <- function(x) if (is.character(x) && length(x) == 1) x else NA_character_
scalar_lgl <- function(x) if (is.logical(x) && length(x) == 1) x else NA

entries <- function(node) {
    if (!is.list(node) || length(node) == 0 || is.null(names(node))) return(list())
    node
}

ms_to_time <- function(ms) as.POSIXct(ms / 1000, origin = '1970-01-01', tz = 'UTC')

#' One row per `/ratings/{studyId}/{sessionId}` record.
flatten_ratings <- function(node) {
    rows <- list()
    for (study_id in names(entries(node))) {
        sessions <- entries(node[[study_id]])
        for (session_id in names(sessions)) {
            rows[[length(rows) + 1]] <- rating_row(study_id, session_id, sessions[[session_id]])
        }
    }
    if (length(rows) == 0) return(empty_ratings())
    dplyr::bind_rows(rows)
}

rating_row <- function(study_id, session_id, value) {
    shape <- if (is.list(value)) 'object' else if (is.numeric(value)) 'number' else 'other'
    record <- switch(shape, number = list(rating = value), object = value, list())
    tibble::tibble(
        study_id = study_id,
        session_id = session_id,
        shape = shape,
        rating = scalar_num(record$rating),
        prediction = scalar_num(record$prediction),
        response_time_ms = scalar_num(record$responseTime),
        timestamp_ms = scalar_num(record$timestamp),
        uid = scalar_chr(record$uid),
        content_version = scalar_num(record$contentVersion),
        feedback_shown = scalar_lgl(record$feedbackShown),
        target_stored = scalar_num(record$target),
        score_stored = scalar_num(record$score),
        trial_stored = scalar_num(record$trial),
        locale = scalar_chr(record$locale),
        room = scalar_chr(record$room)
    )
}

empty_ratings <- function() {
    tibble::tibble(
        study_id = character(), session_id = character(), shape = character(),
        rating = numeric(), prediction = numeric(), response_time_ms = numeric(),
        timestamp_ms = numeric(), uid = character(), content_version = numeric(),
        feedback_shown = logical(), target_stored = numeric(), score_stored = numeric(),
        trial_stored = numeric(), locale = character(), room = character()
    )
}

#' One row per `/leaderboard/{sessionId}` entry. Missing names become ''.
flatten_leaderboard <- function(node) {
    rows <- lapply(names(entries(node)), function(session_id) {
        value <- node[[session_id]]
        if (!is.list(value)) value <- list()
        tibble::tibble(
            session_id = session_id,
            user_name = dplyr::coalesce(scalar_chr(value$userName), ''),
            score = scalar_num(value$score),
            papers_rated = scalar_num(value$papersRated),
            timestamp_ms = scalar_num(value$timestamp),
            uid = scalar_chr(value$uid),
            room = scalar_chr(value$room)
        )
    })
    if (length(rows) == 0) {
        return(tibble::tibble(
            session_id = character(), user_name = character(), score = numeric(),
            papers_rated = numeric(), timestamp_ms = numeric(), uid = character(),
            room = character()
        ))
    }
    dplyr::bind_rows(rows)
}

#' One row per `/rankings/{sessionId}` token allocation, one column per criterion.
flatten_rankings <- function(node, criteria) {
    rows <- lapply(names(entries(node)), function(session_id) {
        value <- node[[session_id]]
        if (!is.list(value)) value <- list()
        tokens <- lapply(stats::setNames(criteria, criteria),
                         function(key) scalar_num(value[[key]]))
        tibble::as_tibble(c(
            list(session_id = session_id),
            tokens,
            list(
                user_name = dplyr::coalesce(scalar_chr(value$userName), ''),
                timestamp_ms = scalar_num(value$timestamp),
                uid = scalar_chr(value$uid),
                room = scalar_chr(value$room)
            )
        ))
    })
    if (length(rows) == 0) {
        empty <- lapply(stats::setNames(criteria, criteria), function(key) numeric())
        return(tibble::as_tibble(c(
            list(session_id = character()), empty,
            list(user_name = character(), timestamp_ms = numeric(), uid = character(),
                 room = character())
        )))
    }
    dplyr::bind_rows(rows)
}

#' One row per `/sessions/{sessionId}` record (v2 only).
flatten_sessions <- function(node) {
    rows <- lapply(names(entries(node)), function(session_id) {
        value <- node[[session_id]]
        if (!is.list(value)) value <- list()
        tibble::tibble(
            session_id = session_id,
            uid = scalar_chr(value$uid),
            created_at_ms = scalar_num(value$createdAt),
            content_version = scalar_num(value$contentVersion),
            app_version = scalar_chr(value$appVersion),
            locale = scalar_chr(value$locale),
            feedback_mode = scalar_chr(value$feedbackMode),
            room = scalar_chr(value$room)
        )
    })
    if (length(rows) == 0) {
        return(tibble::tibble(
            session_id = character(), uid = character(), created_at_ms = numeric(),
            content_version = numeric(), app_version = character(), locale = character(),
            feedback_mode = character(), room = character()
        ))
    }
    dplyr::bind_rows(rows)
}

#' Start time embedded in session ids ('session_' + Date.now() + '_' + random).
session_start_ms <- function(session_id) {
    digits <- sub('^session_([0-9]+)_.*$', '\\1', session_id)
    suppressWarnings(ifelse(digits == session_id, NA_real_, as.numeric(digits)))
}

#' Number of records in a node: ratings are nested by study, the other nodes
#' are keyed by session.
count_records <- function(node, value) {
    if (is.null(value) || length(value) == 0) return(0L)
    if (node != 'ratings') return(length(value))
    sum(vapply(value, function(study) if (is.list(study)) length(study) else 0L, integer(1)))
}

# Base R gained %||% only in 4.4, so the report defines its own.
or_default <- function(value, default) if (is.null(value)) default else value

#' One sentence on where the snapshot came from, from fetch-info.json (written
#' by fetch-data.sh). Local paths are left out of the report.
provenance_text <- function(fetch) {
    fetched <- if (is.character(fetch$fetchedAt)) {
        paste0(', on ', fmt_date(parse_utc(fetch$fetchedAt)))
    } else {
        ''
    }
    commit <- if (is.character(fetch$commit)) {
        paste0(' at commit ', substr(fetch$commit, 1, 7))
    } else {
        ''
    }
    database <- if (identical(fetch$source, 'production')) 'the production database' else fetch$source
    switch(or_default(fetch$method, ''),
        branch = paste0("It was fetched from the '", or_default(fetch$branch, 'data'), "' branch of ",
                        fetch$source, commit, fetched, '.'),
        live = paste0('It was read directly from ', database, ' with scripts/backup.mjs', fetched,
                      '.'),
        directory = paste0('It was copied from a local directory', fetched, '.'),
        snapshot = paste0('It comes from a full snapshot downloaded from the facilitator panel',
                          if (is.character(fetch$exportedAt)) {
                              paste0(' on ', fmt_date(parse_utc(fetch$exportedAt)))
                          } else {
                              fetched
                          }, '.'),
        paste0('Its source is not recorded in a form this report recognises', fetched, '.')
    )
}
