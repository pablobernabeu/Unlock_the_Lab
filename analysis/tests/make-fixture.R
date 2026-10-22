# Writes a synthetic snapshot for checking that the report renders with every
# kind of data it may meet. The values are simulated and mean nothing.
#
#   Rscript tests/make-fixture.R <out-dir> [full|tiny|empty]
#
# 'full' mixes v2 sessions (rooms, both feedback modes, stored trials, targets
# and scores, /rankings and /sessions) with v1-style records and the oddities
# the report must handle: bare-number ratings, an empty username, a
# straight-lining session, a too-fast response, an unknown study id, an
# out-of-range rating, v1 sessions with the defective study order, a rating
# that failed to save, two saved out of order and an invalid token allocation.
# Run it from analysis/.

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1) stop('Usage: Rscript tests/make-fixture.R <out-dir> [full|tiny|empty]')
out_dir <- args[1]
variant <- if (length(args) >= 2) args[2] else 'full'
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

# Study orders come from the same shuffle as the app's, so the report's order
# checks see realistic sessions, including v1's defective order.
source('R/derive.R')
expert <- unlist(jsonlite::fromJSON('../src/content/expert-ratings.json'))
study_ids <- jsonlite::fromJSON('../src/content/en/studies.json')$id
criteria <- c('title', 'access', 'source', 'theory', 'methods', 'conclusion')
weight <- 100
penalty <- 12
set.seed(42)

write_node <- function(value, name) {
    path <- file.path(out_dir, paste0(name, '.json'))
    if (is.null(value) || length(value) == 0) {
        writeLines('null', path)
    } else {
        jsonlite::write_json(value, path, auto_unbox = TRUE, digits = NA, pretty = TRUE)
    }
}

clamp <- function(x) pmin(7, pmax(1, round(x)))
js_round <- function(x) floor(x + 0.5)
session_id <- function(start_ms) {
    paste0('session_', format(start_ms, scientific = FALSE), '_',
           paste(sample(c(letters, 0:9), 9, replace = TRUE), collapse = ''))
}

# One simulated participant: ratings track the expert rating with some
# compression and leniency; predictions mix the own rating and the expert's.
# v1 sessions with a negative seed get the defective order and stop at its
# first gap.
simulate_session <- function(start_ms, n, version, room = NULL, feedback = NULL) {
    id <- session_id(start_ms)
    leniency <- rnorm(1, 0, 0.5)
    order <- seeded_order(id, study_ids, fixed = version != 1 || session_seed(id) >= 0)
    n <- min(n, which(c(is.na(order), TRUE))[1] - 1)
    chosen <- order[seq_len(n)]
    times <- start_ms + cumsum(round(rlnorm(n, log(45000), 0.6)))
    rows <- lapply(seq_len(n), function(i) {
        rating <- clamp(1.3 + 0.7 * expert[[chosen[i]]] + leniency + rnorm(1, 0, 0.9))
        prediction <- clamp(0.6 * rating + 0.4 * expert[[chosen[i]]] + rnorm(1, 0, 0.6))
        list(study = chosen[i], rating = rating, prediction = prediction,
             responseTime = round(rlnorm(1, log(40000), 0.7)), timestamp = times[i], trial = i)
    })
    list(id = id, version = version, room = room, feedback = feedback, rows = rows,
         uid = paste(sample(c(LETTERS, letters, 0:9), 28, replace = TRUE), collapse = ''))
}

build_ratings <- function(sessions) {
    flat <- do.call(rbind, lapply(sessions, function(s) {
        do.call(rbind, lapply(s$rows, function(r) {
            data.frame(id = s$id, study = r$study, rating = r$rating, timestamp = r$timestamp)
        }))
    }))
    ratings <- list()
    leaderboard <- list()
    for (s in sessions) {
        total <- 0
        for (r in s$rows) {
            earlier <- flat[flat$study == r$study & flat$id != s$id & flat$timestamp < r$timestamp, ]
            target <- (sum(earlier$rating) + expert[[r$study]] * weight) / (nrow(earlier) + weight)
            score <- max(0, 100 - js_round(abs(r$prediction - target) * penalty))
            total <- total + score
            record <- list(rating = r$rating, prediction = r$prediction,
                           responseTime = r$responseTime, timestamp = r$timestamp)
            if (s$version == 2) {
                record <- c(record, list(uid = s$uid, contentVersion = 2, feedbackShown = s$feedback,
                                         target = target, score = score, trial = r$trial,
                                         locale = 'en'))
                if (!is.null(s$room)) record$room <- s$room
            }
            ratings[[r$study]][[s$id]] <- record
        }
        entry <- list(score = total, papersRated = length(s$rows),
                      timestamp = max(vapply(s$rows, function(r) r$timestamp, numeric(1))),
                      userName = paste('Gentle', sample(c('Otter', 'Owl', 'Badger'), 1),
                                       sprintf('%02d', sample(0:99, 1))))
        if (s$version == 2) entry$uid <- s$uid
        if (!is.null(s$room)) entry$room <- s$room
        leaderboard[[s$id]] <- entry
    }
    list(ratings = ratings, leaderboard = leaderboard)
}

allocation <- function() {
    tokens <- as.vector(rmultinom(1, 20, prob = c(0.12, 0.08, 0.2, 0.15, 0.3, 0.15)))
    stats::setNames(as.list(tokens), criteria)
}

if (variant == 'empty') {
    for (node in c('ratings', 'leaderboard', 'rankings', 'sessions')) write_node(NULL, node)
} else if (variant == 'tiny') {
    sessions <- list(simulate_session(1771700000000, 2, 1), simulate_session(1771800000000, 1, 1))
    built <- build_ratings(sessions)
    write_node(built$ratings, 'ratings')
    write_node(built$leaderboard, 'leaderboard')
} else {
    base <- 1790000000000
    v2 <- lapply(seq_len(40), function(i) {
        room <- if (i <= 18) 'WORKSHOP-A' else if (i <= 30) 'WORKSHOP-B' else NULL
        simulate_session(base + i * 600000, sample(10:20, 1), 2, room = room, feedback = i %% 3 != 0)
    })
    v1 <- lapply(seq_len(12), function(i) simulate_session(1771620000000 + i * 3600000,
                                                           sample(3:13, 1), 1))
    # The defective order can cut a v1 session short; straight-lining needs 8 ratings.
    repeat {
        straight <- simulate_session(1772000000000, 8, 1)
        if (length(straight$rows) == 8) break
    }
    straight$rows <- lapply(straight$rows, function(r) modifyList(r, list(rating = 4)))
    v1[[length(v1) + 1]] <- straight
    v1[[1]]$rows[[1]]$responseTime <- 1200

    built <- build_ratings(c(v1, v2))
    ratings <- built$ratings
    leaderboard <- built$leaderboard

    # Oddities from the v1 era.
    ratings[['STUDY-3']][['session_1770000000000_bare00001']] <- 5
    ratings[['STUDY-3']][['session_1770000000001_bare00002']] <- 2
    ratings[['STUDY-12']][['session_1770000000002_bare00003']] <- 6
    ratings[['STUDY-99']][['session_1772100000000_unknown01']] <- list(
        rating = 4, prediction = 4, responseTime = 30000, timestamp = 1772100000000)
    ratings[['STUDY-5']][['session_1772100000001_range0001']] <- list(
        rating = 9, prediction = 4, responseTime = 30000, timestamp = 1772100000001)
    first_v1 <- v1[[2]]$id
    leaderboard[[first_v1]]$userName <- ''

    # A v1 rating that failed to save, and two saved with their times reversed.
    long_v1 <- Filter(function(s) length(s$rows) >= 3, v1[-length(v1)])
    lost <- long_v1[[1]]
    ratings[[lost$rows[[2]]$study]][[lost$id]] <- NULL
    reversed <- long_v1[[2]]
    first <- reversed$rows[[1]]$study
    second <- reversed$rows[[2]]$study
    times <- c(ratings[[first]][[reversed$id]]$timestamp, ratings[[second]][[reversed$id]]$timestamp)
    ratings[[first]][[reversed$id]]$timestamp <- times[2]
    ratings[[second]][[reversed$id]]$timestamp <- times[1]

    rankings <- list()
    session_records <- list()
    for (s in v2) {
        record <- list(uid = s$uid, createdAt = s$rows[[1]]$timestamp - 60000, contentVersion = 2,
                       appVersion = '2.0.0', locale = 'en',
                       feedbackMode = if (isTRUE(s$feedback)) 'each' else 'end')
        if (!is.null(s$room)) record$room <- s$room
        session_records[[s$id]] <- record
        if (length(s$rows) >= 10) {
            rankings[[s$id]] <- c(allocation(), list(userName = 'Gentle Otter 01', uid = s$uid,
                                                     timestamp = max(sapply(s$rows, `[[`, 'timestamp'))))
        }
    }
    invalid <- names(rankings)[1]
    rankings[[invalid]]$title <- rankings[[invalid]]$title + 1

    write_node(ratings, 'ratings')
    write_node(leaderboard, 'leaderboard')
    write_node(rankings, 'rankings')
    write_node(session_records, 'sessions')
}

jsonlite::write_json(list(lastBackup = format(Sys.time(), '%Y-%m-%dT%H:%M:%SZ', tz = 'UTC')),
                     file.path(out_dir, 'backup-info.json'), auto_unbox = TRUE)
message("Wrote the '", variant, "' fixture to ", out_dir)
