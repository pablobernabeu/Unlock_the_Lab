# Derived variables: validity flags, the content version each rating saw,
# trial order, scoring targets and scores, and the exclusion steps.

#' JavaScript's Math.round (halves round up). R's round() rounds halves to
#' even, which would give different scores from the app's.
js_round <- function(x) floor(x + 0.5)

#' The scoring target as in src/lib/scoring.js: the other participants'
#' ratings blended with the expert rating counted as `weight` participants.
scoring_target <- function(other_sum, other_n, expert, weight) {
    (other_sum + expert * weight) / (other_n + weight)
}

prediction_score <- function(prediction, target, penalty) {
    pmax(0, 100 - js_round(abs(prediction - target) * penalty))
}

is_whole_in_range <- function(x, lower, upper) {
    !is.na(x) & x == floor(x) & x >= lower & x <= upper
}

#' Adds validity flags and the study's current expert rating to every record.
annotate_ratings <- function(ratings, studies, config, snapshot_time) {
    patterns <- config$patterns
    rating_ok <- function(x) is_whole_in_range(x, config$RATING_MIN, config$RATING_MAX)
    late_limit_ms <- as.numeric(snapshot_time) * 1000 + 5 * 60 * 1000

    ratings |>
        dplyr::left_join(dplyr::select(studies, 'study_id', 'study_number', 'expert'),
                         by = 'study_id') |>
        dplyr::mutate(
            valid_study_id = grepl(patterns$STUDY_ID_PATTERN, .data$study_id, perl = TRUE),
            known_study = !is.na(.data$expert),
            valid_session_id = grepl(patterns$SESSION_ID_PATTERN, .data$session_id, perl = TRUE),
            valid_rating = rating_ok(.data$rating),
            valid_prediction = rating_ok(.data$prediction),
            valid_record = .data$valid_study_id & .data$known_study & .data$valid_session_id &
                .data$valid_rating,
            # The app's own test (src/lib/scoring.js validRatings): any value on the scale counts.
            counts_for_target = !is.na(.data$rating) & .data$rating >= config$RATING_MIN &
                .data$rating <= config$RATING_MAX,
            future_timestamp = !is.na(.data$timestamp_ms) & !is.na(late_limit_ms) &
                .data$timestamp_ms > late_limit_ms,
            negative_rt = !is.na(.data$response_time_ms) & .data$response_time_ms < 0,
            stamped = !is.na(.data$content_version),
            time = ms_to_time(.data$timestamp_ms)
        )
}

#' The content each rating saw. Stamped ratings carry `contentVersion`; for
#' unstamped (v1) ratings it is inferred from the timestamp relative to the
#' commit of the v1 content revision. `pre_revision_changed` marks unstamped
#' ratings of a revised study given before that commit (or at an unknown time):
#' they may have seen the earlier text, whose expert rating is
#' `expert_earlier` when the expert rating also changed.
assign_content_versions <- function(ratings, revisions) {
    revised_at <- if (nrow(revisions) > 0) min(revisions$revised_at) else as.POSIXct(NA)
    changed <- dplyr::select(revisions, 'study_id', revision_time = 'revised_at', 'expert_before')

    ratings |>
        dplyr::left_join(changed, by = 'study_id') |>
        dplyr::mutate(
            before_revision = !.data$stamped & !is.na(.data$time) & !is.na(revised_at) &
                .data$time < revised_at,
            content_label = dplyr::case_when(
                .data$stamped ~ paste0('v', as.character(.data$content_version)),
                is.na(.data$time) ~ 'v1 (time unknown)',
                .data$before_revision ~ 'v1 (before the revision commit)',
                TRUE ~ 'v1'
            ),
            pre_revision_changed = !.data$stamped & !is.na(.data$revision_time) &
                (is.na(.data$time) | .data$time < .data$revision_time),
            expert_earlier = dplyr::if_else(.data$pre_revision_changed, .data$expert_before,
                                            NA_real_)
        ) |>
        dplyr::select(-'revision_time', -'expert_before')
}

#' The expert rating the app scored each rating against. `assumption` says
#' which expert ratings were live before the revision commit: 'revised' (the
#' current values) or 'earlier' (the values listed in content-revisions.csv).
set_expert_at_time <- function(ratings, assumption = c('revised', 'earlier')) {
    assumption <- match.arg(assumption)
    use_earlier <- assumption == 'earlier' & !is.na(ratings$expert_earlier)
    ratings$expert_at_time <- ifelse(use_earlier, ratings$expert_earlier, ratings$expert)
    ratings
}

#' Reconstructs targets under both assumptions about the expert ratings live
#' before the revision commit and keeps the one that reproduces more of the
#' leaderboard totals stored by the app (the revised values on a tie).
choose_expert_assumption <- function(ratings, leaderboard, weight, penalty) {
    checks <- lapply(c(revised = 'revised', earlier = 'earlier'), function(assumption) {
        scored <- assign_targets(set_expert_at_time(ratings, assumption), weight, penalty)
        check <- check_reconstruction(scored, leaderboard)
        list(ratings = scored, check = check, matched = sum(check$difference == 0))
    })
    choice <- if (checks$earlier$matched > checks$revised$matched) 'earlier' else 'revised'
    # Only sessions whose totals differ between the assumptions carry evidence.
    decisive <- checks$revised$check$reconstructed_total != checks$earlier$check$reconstructed_total
    list(
        choice = choice,
        ratings = checks[[choice]]$ratings,
        check = checks[[choice]]$check,
        matched = vapply(checks, function(x) x$matched, numeric(1)),
        compared = nrow(checks$revised$check),
        decisive = sum(decisive),
        decisive_matched = vapply(checks, function(x) sum(x$check$difference[decisive] == 0),
                                  numeric(1))
    )
}

#' Trial position within each session. v2 ratings store it; for v1 ratings it
#' is reconstructed as the rank of the rating's timestamp among the session's
#' valid ratings (ties broken by study number).
assign_trials <- function(ratings) {
    ratings |>
        dplyr::group_by(.data$session_id) |>
        dplyr::mutate(
            trial_reconstructed = dplyr::if_else(
                .data$valid_record & !is.na(.data$timestamp_ms),
                rank_with_ties_broken(.data$timestamp_ms, .data$study_number,
                                      .data$valid_record & !is.na(.data$timestamp_ms)),
                NA_real_
            )
        ) |>
        dplyr::ungroup() |>
        dplyr::mutate(
            trial = dplyr::coalesce(.data$trial_stored, .data$trial_reconstructed),
            trial_source = dplyr::case_when(
                !is.na(.data$trial_stored) ~ 'stored',
                !is.na(.data$trial_reconstructed) ~ 'reconstructed',
                TRUE ~ 'unknown'
            )
        )
}

rank_with_ties_broken <- function(time, tiebreak, use) {
    out <- rep(NA_real_, length(time))
    index <- which(use)
    out[index[order(time[index], tiebreak[index])]] <- seq_along(index)
    out
}

#' Commit that fixed v1's shuffle for negative seeds. Before it, such sessions
#' saw the defective order that `seeded_order(fixed = FALSE)` reproduces.
SHUFFLE_FIX <- list(commit = '2fe7517', time = as.POSIXct('2026-09-16 22:13:26', tz = 'UTC'))

#' The 32-bit hash of a session id that seeds its study order, as in v1's
#' shufflePapers and v2's src/lib/shuffle.js: hash * 31 + character code,
#' wrapped to a signed 32-bit integer after each character.
session_seed <- function(session_id) {
    vapply(session_id, function(id) {
        seed <- 0
        for (code in utf8ToInt(id)) {
            seed <- (seed * 31 + code) %% 2^32
            if (seed >= 2^31) seed <- seed - 2^32
        }
        seed
    }, numeric(1), USE.NAMES = FALSE)
}

# JavaScript's %, which keeps the sign of the dividend (R's %% does not).
js_remainder <- function(x, m) sign(x) * (abs(x) %% m)

#' A session's study order: the seeded Fisher-Yates shuffle of `study_ids`.
#' `fixed = TRUE` is the shuffle as fixed in v1 and kept by v2. `fixed = FALSE`
#' is the earlier v1 code: for a negative seed the generator returned negative
#' numbers, so the first study never moved, values went to negative indices and
#' gaps (NA) entered the order. The app could not show any study after a gap.
seeded_order <- function(session_id, study_ids, fixed = TRUE) {
    order <- study_ids
    if (length(order) < 2) return(order)
    seed <- session_seed(session_id)
    if (fixed) seed <- abs(seed) %% 233280
    stray <- list() # what JavaScript stored at negative indices
    for (i in seq(length(order) - 1, 1)) {
        seed <- js_remainder(seed * 9301 + 49297, 233280)
        j <- floor(seed / 233280 * (i + 1))
        current <- order[i + 1]
        key <- as.character(j)
        drawn <- if (j >= 0) {
            order[j + 1]
        } else if (is.null(stray[[key]])) {
            NA_character_
        } else {
            stray[[key]]
        }
        order[i + 1] <- drawn
        if (j >= 0) order[j + 1] <- current else stray[[key]] <- current
    }
    order
}

#' Which seeded order each session's valid ratings follow. Participants rate
#' the studies in their order without skipping, so the studies sorted by trial
#' should appear in that order: the working one or, for a negative seed, the
#' defective one (tried first for sessions started before the fix). `complete`
#' means they are exactly its first studies; otherwise some ratings are
#' missing from the snapshot. 'neither' means a rating is out of place.
#' `last_position` is the position of the last rated study in the order, and
#' `defective_limit` the number of studies before the first gap in the
#' defective order (all of them when the seed is not negative).
check_study_orders <- function(ratings, study_ids) {
    sessions <- ratings |>
        dplyr::filter(.data$valid_record, !is.na(.data$trial)) |>
        dplyr::arrange(.data$session_id, .data$trial) |>
        dplyr::group_by(.data$session_id) |>
        dplyr::summarise(observed = list(.data$study_id), .groups = 'drop')
    fix_ms <- as.numeric(SHUFFLE_FIX$time) * 1000
    rows <- lapply(seq_len(nrow(sessions)), function(i) {
        id <- sessions$session_id[i]
        observed <- sessions$observed[[i]]
        n <- length(observed)
        working <- seeded_order(id, study_ids, fixed = TRUE)
        defective <- seeded_order(id, study_ids, fixed = FALSE)
        negative <- session_seed(id) < 0
        candidates <- list(working = working)
        if (negative) {
            before_fix <- isTRUE(session_start_ms(id) < fix_ms)
            candidates <- if (before_fix) {
                list(defective = defective, working = working)
            } else {
                list(working = working, defective = defective)
            }
        }
        follows <- 'neither'
        positions <- rep(NA_real_, n)
        for (name in names(candidates)) {
            at <- match(observed, candidates[[name]])
            if (!anyNA(at) && !is.unsorted(at, strictly = TRUE)) {
                follows <- name
                positions <- at
                break
            }
        }
        gaps <- which(is.na(defective))
        tibble::tibble(
            session_id = id,
            n = n,
            negative_seed = negative,
            follows = follows,
            complete = follows != 'neither' && identical(positions, seq_len(n)),
            first_study = observed[1],
            last_position = if (follows == 'neither') NA_real_ else max(positions),
            defective_limit = if (length(gaps) > 0) gaps[1] - 1 else length(study_ids),
            positions = list(stats::setNames(positions, observed))
        )
    })
    if (length(rows) == 0) {
        return(tibble::tibble(session_id = character(), n = integer(), negative_seed = logical(),
                              follows = character(), complete = logical(),
                              first_study = character(), last_position = numeric(),
                              defective_limit = numeric(), positions = list()))
    }
    dplyr::bind_rows(rows)
}

#' Trial numbers for unstamped (v1) ratings from the session's seeded order,
#' which stays right when a rating is missing from the snapshot. Sessions that
#' follow neither order keep the timestamp ranks from `assign_trials()`.
use_order_positions <- function(ratings, orders) {
    followed <- orders[orders$follows != 'neither', , drop = FALSE]
    lookup <- tibble::tibble(
        session_id = rep(followed$session_id, lengths(followed$positions)),
        study_id = as.character(unlist(lapply(followed$positions, names), use.names = FALSE)),
        order_position = as.numeric(unlist(followed$positions, use.names = FALSE))
    )
    ratings |>
        dplyr::left_join(lookup, by = c('session_id', 'study_id')) |>
        dplyr::mutate(
            use_position = is.na(.data$trial_stored) & !is.na(.data$order_position),
            trial = dplyr::if_else(.data$use_position, .data$order_position, .data$trial),
            trial_source = dplyr::case_when(
                .data$use_position ~ 'seeded order',
                .data$trial_source == 'reconstructed' ~ 'timestamp order',
                TRUE ~ .data$trial_source
            )
        ) |>
        dplyr::select(-'order_position', -'use_position')
}

#' Scoring targets and scores. Stored values (v2) are used when present. For
#' other ratings the target is reconstructed from the snapshot as the app
#' computed it: every rating on the scale of the same study by another session
#' with an earlier timestamp (ratings without a timestamp are assumed to be
#' earlier), blended with the expert rating in force at the time.
assign_targets <- function(ratings, weight, penalty) {
    usable <- ratings$counts_for_target
    n_other <- rep(NA_real_, nrow(ratings))
    sum_other <- rep(NA_real_, nrow(ratings))

    for (study in unique(ratings$study_id[ratings$valid_record])) {
        pool <- which(usable & ratings$study_id == study)
        times <- ratings$timestamp_ms[pool]
        targets_needed <- pool[ratings$valid_record[pool] & !is.na(times)]
        for (i in targets_needed) {
            earlier <- pool[ratings$session_id[pool] != ratings$session_id[i] &
                (is.na(times) | times < ratings$timestamp_ms[i])]
            n_other[i] <- length(earlier)
            sum_other[i] <- sum(ratings$rating[earlier])
        }
    }

    ratings |>
        dplyr::mutate(
            n_other = n_other,
            expert_weight = weight / (n_other + weight),
            target_reconstructed = scoring_target(sum_other, n_other, .data$expert_at_time, weight),
            score_reconstructed = dplyr::if_else(
                .data$valid_prediction,
                prediction_score(.data$prediction, .data$target_reconstructed, penalty),
                NA_real_
            ),
            target = dplyr::coalesce(.data$target_stored, .data$target_reconstructed),
            score = dplyr::coalesce(.data$score_stored, .data$score_reconstructed),
            target_source = dplyr::case_when(
                !is.na(.data$target_stored) ~ 'stored',
                !is.na(.data$target_reconstructed) ~ 'reconstructed',
                TRUE ~ 'unknown'
            )
        )
}

#' Compares reconstructed per-study scores with the leaderboard totals the v1
#' app stored, for sessions whose leaderboard count matches the ratings found.
check_reconstruction <- function(ratings, leaderboard) {
    totals <- ratings |>
        dplyr::filter(.data$valid_record, .data$valid_prediction) |>
        dplyr::group_by(.data$session_id) |>
        dplyr::summarise(
            n_found = dplyr::n(),
            reconstructed_total = sum(.data$score_reconstructed),
            .groups = 'drop'
        )
    leaderboard |>
        dplyr::select('session_id', 'score', 'papers_rated') |>
        dplyr::inner_join(totals, by = 'session_id') |>
        dplyr::filter(!is.na(.data$papers_rated), .data$papers_rated == .data$n_found,
                      .data$papers_rated > 0) |>
        dplyr::mutate(difference = .data$reconstructed_total - .data$score)
}

#' Sessions whose valid ratings all take one value, among sessions with at
#' least `min_n` valid ratings.
straight_lining_sessions <- function(ratings, min_n) {
    ratings |>
        dplyr::filter(.data$valid_record) |>
        dplyr::group_by(.data$session_id) |>
        dplyr::summarise(n = dplyr::n(), distinct = dplyr::n_distinct(.data$rating),
                         .groups = 'drop') |>
        dplyr::filter(.data$n >= min_n, .data$distinct == 1) |>
        dplyr::pull('session_id')
}

#' Applies the exclusion steps in order and records what each removed.
#' Returns the analysis set and a table of the steps.
apply_exclusions <- function(ratings, straight_liners, rt_floor_ms, exclude_pre_revision) {
    steps <- list(
        list(
            label = 'Invalid study id, session id or rating value',
            drop = function(d) !d$valid_record
        ),
        list(
            label = 'Sessions flagged for straight-lining',
            drop = function(d) d$session_id %in% straight_liners
        ),
        list(
            label = 'Response time below the floor',
            drop = function(d) !is.na(d$response_time_ms) & d$response_time_ms < rt_floor_ms
        ),
        list(
            label = if (exclude_pre_revision) {
                'Revised studies rated before the revision commit'
            } else {
                'Revised studies rated before the revision commit (not applied)'
            },
            drop = function(d) exclude_pre_revision & d$pre_revision_changed
        )
    )

    current <- ratings
    flow <- list(tibble::tibble(
        step = 'All rating records',
        removed = NA_integer_,
        ratings = nrow(current),
        sessions = dplyr::n_distinct(current$session_id),
        studies = dplyr::n_distinct(current$study_id)
    ))
    for (step in steps) {
        drop <- step$drop(current)
        current <- current[!drop, , drop = FALSE]
        flow[[length(flow) + 1]] <- tibble::tibble(
            step = step$label,
            removed = sum(drop),
            ratings = nrow(current),
            sessions = dplyr::n_distinct(current$session_id),
            studies = dplyr::n_distinct(current$study_id)
        )
    }
    list(data = current, flow = dplyr::bind_rows(flow))
}

#' Valid token allocations: integers from 0 to the budget that sum to it.
valid_allocations <- function(rankings, criteria, budget) {
    if (nrow(rankings) == 0) return(rankings[0, ])
    tokens <- as.matrix(rankings[, criteria])
    whole <- apply(tokens, 1, function(row) all(is_whole_in_range(row, 0, budget)))
    sums <- rowSums(tokens)
    rankings[whole & !is.na(sums) & sums == budget, , drop = FALSE]
}
