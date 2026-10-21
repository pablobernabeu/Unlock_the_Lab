# Checks of the report's helper functions, in base R so they need no test
# framework. Run from analysis/:  Rscript tests/test-helpers.R

suppressPackageStartupMessages(library(dplyr))
for (file in list.files('R', pattern = '\\.R$', full.names = TRUE)) source(file)

passed <- 0
check <- function(description, condition) {
    if (!isTRUE(condition)) stop('Failed: ', description, call. = FALSE)
    passed <<- passed + 1
}
near <- function(a, b, tolerance = 1e-9) isTRUE(all(abs(a - b) < tolerance))

# Constants and patterns are read from the app, not copied.
config <- read_app_config('..')
check('reads the scoring constants from config.js',
      config$SEED_WEIGHT == 100 && config$SCORE_PENALTY == 12 && config$TOKEN_BUDGET == 20)
check('reads the criterion keys in order',
      identical(config$criteria, c('title', 'access', 'source', 'theory', 'methods', 'conclusion')))
check('session pattern accepts a v1 session id',
      grepl(config$patterns$SESSION_ID_PATTERN, 'session_1771630835301_gj69lmk1o', perl = TRUE))
check('study pattern rejects zero-padded ids',
      !grepl(config$patterns$STUDY_ID_PATTERN, 'STUDY-01', perl = TRUE))
studies <- read_studies('..')
check('reads 48 studies with expert ratings and titles',
      nrow(studies) == 48 && all(studies$expert %in% 1:7) && !anyNA(studies$title))
check('orders studies numerically', identical(studies$study_id[1:3], c('STUDY-1', 'STUDY-2', 'STUDY-3')))

# Scoring matches src/lib/scoring.js and its unit tests.
check('JavaScript rounding rounds halves up', js_round(2.5) == 3 && js_round(0.5) == 1)
check('the target counts the expert rating as 100 participants',
      near(scoring_target(70, 10, 1, 100), 170 / 110))
check('scores lose 12 points per scale point',
      prediction_score(5, 4, 12) == 88 && prediction_score(1, 7, 12) == 28)
check('scores round the penalty and never go below zero',
      prediction_score(2, 170 / 110, 12) == 95 && prediction_score(1, 100, 12) == 0)
check('a half-point penalty rounds up as in the app', prediction_score(4, 4 + 0.5 / 12, 12) == 99)

# Flattening accepts legacy shapes.
node <- list(
    'STUDY-1' = list(
        session_1771630835301_aaaaaaaaa = list(rating = 3L, prediction = 4L, responseTime = 1000,
                                                timestamp = 1771630835301),
        session_1771630835302_bbbbbbbbb = 6,
        session_1771630835303_ccccccccc = 'junk'
    ),
    'STUDY-2' = list(session_1771630835301_aaaaaaaaa = list(rating = 9, uid = 'u'))
)
flat <- flatten_ratings(node)
check('flattens every record', nrow(flat) == 4)
check('keeps bare numbers as ratings without a prediction',
      flat$rating[flat$shape == 'number'] == 6 && is.na(flat$prediction[flat$shape == 'number']))
check('turns unreadable records into rows with no rating', is.na(flat$rating[flat$shape == 'other']))
check('flattens an empty node', nrow(flatten_ratings(list())) == 0 && nrow(flatten_ratings(NULL)) == 0)
leaderboard <- flatten_leaderboard(list(s1 = list(score = 53, papersRated = 1, userName = ''),
                                        s2 = list(score = 88)))
check('keeps empty and missing usernames as empty strings', all(leaderboard$user_name == ''))
check('reads the start time from a session id',
      session_start_ms('session_1771630835301_gj69lmk1o') == 1771630835301 &&
          is.na(session_start_ms('bad')))

# Annotation, content versions, trials and targets on a small history.
snapshot_now <- as.POSIXct('2026-10-01', tz = 'UTC')
revisions <- read_content_revisions('reference/content-revisions.csv')
check('reads the content revision', nrow(revisions) > 0 && !anyNA(revisions$revised_at))
history <- tibble::tibble(
    study_id = c('STUDY-48', 'STUDY-48', 'STUDY-48', 'STUDY-48', 'STUDY-2'),
    session_id = c('session_1771628092807_aaaaaaaaa', 'session_1771700000000_bbbbbbbbb',
                   'session_1771700000001_ccccccccc', 'session_1771700000002_ddddddddd',
                   'session_1771700000000_bbbbbbbbb'),
    shape = c('object', 'object', 'number', 'object', 'object'),
    rating = c(4, 2, 7, 1, 5),
    prediction = c(1, 1, NA, 2, 6),
    response_time_ms = c(20000, 3000, NA, 60000, 40000),
    # The first rating predates the revision commit (21 February 2026, 00:52 UTC).
    timestamp_ms = c(1771628100000, 1771700100000, NA, 1771700200000, 1771700050000),
    uid = NA_character_, content_version = NA_real_, feedback_shown = NA,
    target_stored = NA_real_, score_stored = NA_real_, trial_stored = NA_real_,
    locale = NA_character_, room = NA_character_
)
annotated <- history |>
    annotate_ratings(studies, config, snapshot_now) |>
    assign_content_versions(revisions) |>
    assign_trials()
check('labels the pre-revision rating', annotated$content_label[1] == 'v1 (before the revision commit)')
check('marks only the pre-revision rating of a revised study',
      identical(annotated$pre_revision_changed, c(TRUE, FALSE, TRUE, FALSE, FALSE)))
check('keeps the earlier expert rating of STUDY-48', annotated$expert_earlier[1] == 4)
check('orders trials by timestamp within a session',
      identical(annotated$trial[c(2, 5)], c(2, 1)))
check('leaves untimed ratings without a trial', is.na(annotated$trial[3]))

scored <- assign_targets(set_expert_at_time(annotated, 'revised'), 100, 12)
# The second rating sees the first (earlier, other session) and the untimed one.
check('a target blends earlier ratings by others with the expert rating',
      near(scored$target[2], (4 + 7 + 1 * 100) / (2 + 100)) && scored$n_other[2] == 2)
check('the earliest rating sees only untimed ratings', scored$n_other[1] == 1)
check('the earlier expert rating is used when assumed',
      near(assign_targets(set_expert_at_time(annotated, 'earlier'), 100, 12)$target[1],
           (7 + 4 * 100) / 101))
check('scores follow the targets', scored$score[2] == prediction_score(1, scored$target[2], 12))

# The leaderboard check picks the assumption that reproduces the stored totals.
board <- tibble::tibble(session_id = annotated$session_id[1], score = scored$score[1] + 0,
                        papers_rated = 1)
earlier_score <- assign_targets(set_expert_at_time(annotated, 'earlier'), 100, 12)$score[1]
check('choose_expert_assumption keeps the revised values when they match',
      choose_expert_assumption(annotated, board, 100, 12)$choice == 'revised')
board$score <- earlier_score
check('the two assumptions give different scores here', earlier_score != scored$score[1])
check('choose_expert_assumption switches when only the earlier values match',
      choose_expert_assumption(annotated, board, 100, 12)$choice == 'earlier')
check('only totals that differ between the assumptions count as evidence',
      choose_expert_assumption(annotated, board, 100, 12)$decisive == 1)

# Study orders match src/lib/shuffle.js (v2) and v1's code before the fix.
study_order <- read_study_order('..')
check('reads the canonical study order', identical(study_order, paste0('STUDY-', 1:48)))
check('hashes a session id as JavaScript does',
      session_seed('session_1776784745107_7') == -1586282531 &&
          session_seed('session_1771630835301_gj69lmk1o') > 0)
check('reproduces the shuffle of src/lib/shuffle.js',
      identical(seeded_order('session_1771630835301_gj69lmk1o', study_order)[1:5],
                paste0('STUDY-', c(10, 19, 41, 24, 43))) &&
          identical(seeded_order('session_1776784745107_7', study_order)[1:3],
                    paste0('STUDY-', c(7, 32, 6))))
defective <- seeded_order('session_1776784745107_7', study_order, fixed = FALSE)
check('reproduces the defective v1 order for a negative seed',
      identical(defective[1:3], paste0('STUDY-', c(1, 6, 11))) && which(is.na(defective))[1] == 13)
check('the defective order equals the working one for a positive seed',
      identical(seeded_order('session_1771630835301_gj69lmk1o', study_order, fixed = FALSE),
                seeded_order('session_1771630835301_gj69lmk1o', study_order)))
# A v1 session with the defective order whose second rating is missing.
order_ratings <- tibble::tibble(
    session_id = 'session_1771000000000_7', study_id = defective[c(1, 3, 4)],
    valid_record = TRUE, trial = c(1, 2, 3), trial_stored = NA_real_,
    trial_source = 'reconstructed'
)
order_ratings$session_id <- 'session_1776784745107_7'
orders <- check_study_orders(order_ratings, study_order)
check('recognises the defective order with a rating missing',
      orders$follows == 'defective' && !orders$complete && orders$defective_limit == 12 &&
          orders$last_position == 4)
positioned <- use_order_positions(order_ratings, orders)
check('takes v1 trial numbers from the position in the order',
      identical(positioned$trial, c(1, 3, 4)) && all(positioned$trial_source == 'seeded order'))
shuffled <- order_ratings
shuffled$study_id <- defective[c(3, 1, 4)]
check('leaves ratings out of order to their timestamp ranks',
      check_study_orders(shuffled, study_order)$follows == 'neither' &&
          all(use_order_positions(shuffled, check_study_orders(shuffled, study_order))$trial_source ==
                  'timestamp order'))

# Exclusions.
flagged <- tibble::tibble(session_id = rep(c('a', 'b'), c(6, 6)), valid_record = TRUE,
                          rating = c(rep(4, 6), 1:6))
check('flags a session whose ratings are all the same', identical(straight_lining_sessions(flagged, 6), 'a'))
check('needs the minimum number of ratings to flag', length(straight_lining_sessions(flagged, 7)) == 0)
steps <- apply_exclusions(scored, character(), 5000, exclude_pre_revision = TRUE)
check('removes fast responses and pre-revision ratings of revised studies',
      identical(steps$flow$removed[-1], c(0L, 0L, 1L, 2L)) && nrow(steps$data) == 2)

allocations <- tibble::tibble(session_id = c('a', 'b', 'c'), title = c(20, 10, 5.5), access = 0,
                              source = c(0, 11, 14.5), theory = 0, methods = 0, conclusion = 0)
check('keeps only whole-number allocations that sum to the budget',
      identical(valid_allocations(allocations, config$criteria, 20)$session_id, 'a'))

# Statistics.
x <- c(2, 4, 4, 5, 7)
check('mean_ci matches t.test', near(unlist(mean_ci(x)[c('lower', 'upper')]),
                                     as.numeric(stats::t.test(x)$conf.int)))
check('mean_ci gives no interval for one value', is.na(mean_ci(3)$lower))
check('cor_ci needs four pairs', is.na(cor_ci(1:3, 1:3)$estimate))
pearson <- cor_ci(1:10, c(1, 3, 2, 5, 4, 6, 8, 7, 10, 9))
check('Pearson interval matches cor.test',
      near(c(pearson$lower, pearson$upper),
           as.numeric(stats::cor.test(1:10, c(1, 3, 2, 5, 4, 6, 8, 7, 10, 9))$conf.int)))
check('Spearman-Brown leaves one rating unchanged', near(spearman_brown(0.4, 1), 0.4))
check('raters_needed reaches the target reliability',
      spearman_brown(0.4, raters_needed(0.4, 0.8)) >= 0.8 &&
          spearman_brown(0.4, raters_needed(0.4, 0.8) - 1) < 0.8)
check('raters_needed handles several targets at once',
      identical(raters_needed(0.4, c(0.7, 0.8, 0.9)), c(4, 6, 14)))
check('raters_needed is undefined without study variance', is.na(raters_needed(0, 0.8)))
check('harmonic mean of counts', near(harmonic_mean(c(1, 2, 4)), 3 / (1 + 0.5 + 0.25)))
boot_mean <- cluster_boot_mean(c(1, 2, 3, 4, 5, 6), c('a', 'a', 'b', 'b', 'c', 'c'), 200, 1,
                               min_clusters = 5)
check('cluster bootstrap gives no interval below the minimum of clusters',
      is.na(boot_mean$lower) && near(boot_mean$estimate, 3.5))

# Wording and formatting.
check('lists without a serial comma', fmt_list(c('a', 'b', 'c')) == 'a, b and c')
check('lists with another conjunction', fmt_list(c('a', 'b'), 'or') == 'a or b')
check('uses a true minus sign', fmt_num(-1.5, 1) == '−1.5')
check('formats intervals', fmt_ci(0.1, 0.25) == '[0.10, 0.25]' && fmt_ci(NA, 1) == 'not estimable')
check('formats p values', fmt_p(0.0004) == 'p < 0.001' && fmt_p(0.0456) == 'p = 0.046')
check('pluralises', plural(1, 'rating') == '1 rating' && plural(3, 'study', 'studies') == '3 studies' &&
          plural(2.5, 'rating') == '2.5 ratings')
check('formats ranges of counts', fmt_count_range(c(2, 2), 'study', 'studies') == '2 studies' &&
          fmt_count_range(c(1, 12), 'study', 'studies') == '1 to 12 studies')
check('formats date spans',
      fmt_date_span(as.POSIXct('2026-02-21 01:00', tz = 'UTC'),
                    as.POSIXct('2026-02-21 23:00', tz = 'UTC')) == 'on 21 February 2026' &&
          fmt_date_span(as.POSIXct('2026-02-20', tz = 'UTC'), as.POSIXct('2026-03-01', tz = 'UTC')) ==
              'between 20 February 2026 and 1 March 2026')
check('says no for zero', count_phrase(0, 'session') == 'no session')
check('agrees verbs with counts', agree(1, 'is', 'are') == 'is' && agree(2, 'is', 'are') == 'are')
check('drops decimals from whole counts', fmt_count(2) == '2' && fmt_count(2.5) == '2.5')
check('locates intervals', position(0.1, 0.2, 0) == 'above' && position(-0.1, 0.2, 0) == 'includes' &&
          position(NA, 1, 0) == 'unknown' && position(0.004, 0.19, 0) == 'includes')
check('quality bands follow src/lib/content.js',
      identical(as.character(quality_band(c(1, 2, 3, 5, 6, 7))),
                c('low', 'low', 'medium', 'medium', 'high', 'high')))

cat(sprintf('%d checks passed\n', passed))
