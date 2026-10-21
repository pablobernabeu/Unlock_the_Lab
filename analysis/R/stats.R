# Estimation helpers. Each returns NA (rather than failing) when the data are
# too sparse, so the report can say why an estimate is missing.

#' Mean with a t interval; bounds are NA when n < 2.
mean_ci <- function(x, level = 0.95) {
    x <- x[is.finite(x)]
    n <- length(x)
    centre <- if (n > 0) mean(x) else NA_real_
    spread <- if (n > 1) stats::sd(x) else NA_real_
    se <- spread / sqrt(n)
    half <- if (n > 1) stats::qt(1 - (1 - level) / 2, df = n - 1) * se else NA_real_
    tibble::tibble(n = n, mean = centre, sd = spread, se = se,
                   lower = centre - half, upper = centre + half)
}

#' `mean_ci` of `value` within each level of `group`; typed and empty when
#' there are no rows, so later joins and plots still work.
grouped_mean_ci <- function(data, group, value, level = 0.95) {
    keys <- unique(data[[group]])
    rows <- lapply(keys, function(key) {
        result <- mean_ci(data[[value]][data[[group]] == key], level)
        result[[group]] <- key
        result
    })
    template <- mean_ci(numeric(), level)[0, ]
    template[[group]] <- data[[group]][0]
    out <- dplyr::bind_rows(c(list(template), rows))
    out[, c(group, setdiff(names(out), group))]
}

#' Median and interquartile range (type 7 quantiles, R's default).
median_iqr <- function(x) {
    x <- x[is.finite(x)]
    if (length(x) == 0) {
        return(tibble::tibble(n = 0L, median = NA_real_, q1 = NA_real_, q3 = NA_real_))
    }
    q <- stats::quantile(x, c(0.25, 0.5, 0.75), names = FALSE)
    tibble::tibble(n = length(x), median = q[2], q1 = q[1], q3 = q[3])
}

#' Pearson or Spearman correlation with a Fisher-z interval. The Spearman
#' interval uses the Bonett and Wright (2000) standard error,
#' sqrt((1 + rho^2 / 2) / (n - 3)). Needs n >= 4 and variation in both.
cor_ci <- function(x, y, method = c('pearson', 'spearman'), level = 0.95) {
    method <- match.arg(method)
    keep <- is.finite(x) & is.finite(y)
    x <- x[keep]
    y <- y[keep]
    n <- length(x)
    empty <- tibble::tibble(method = method, n = n, estimate = NA_real_,
                            lower = NA_real_, upper = NA_real_, p = NA_real_)
    if (n < 4 || stats::sd(x) == 0 || stats::sd(y) == 0) return(empty)

    estimate <- stats::cor(x, y, method = method)
    se <- if (method == 'pearson') 1 / sqrt(n - 3) else sqrt((1 + estimate^2 / 2) / (n - 3))
    z <- atanh(max(min(estimate, 0.999999), -0.999999))
    half <- stats::qnorm(1 - (1 - level) / 2) * se
    p <- suppressWarnings(stats::cor.test(x, y, method = method, exact = FALSE)$p.value)
    tibble::tibble(method = method, n = n, estimate = estimate,
                   lower = tanh(z - half), upper = tanh(z + half), p = p)
}

#' Fits a model, keeping warnings and errors instead of stopping the report.
fit_safely <- function(expr) {
    warnings <- character()
    fit <- withCallingHandlers(
        tryCatch(expr, error = function(error) structure(list(message = conditionMessage(error)),
                                                          class = 'fit_error')),
        warning = function(warning) {
            warnings <<- c(warnings, conditionMessage(warning))
            invokeRestart('muffleWarning')
        }
    )
    if (inherits(fit, 'fit_error')) {
        return(list(ok = FALSE, fit = NULL, error = fit$message, warnings = warnings,
                    singular = NA))
    }
    singular <- if (inherits(fit, 'merMod')) lme4::isSingular(fit) else NA
    list(ok = TRUE, fit = fit, error = NA_character_, warnings = unique(warnings),
         singular = singular)
}

fit_lmer <- function(formula, data) {
    fit_safely(lmerTest::lmer(formula, data = data, REML = TRUE))
}

fit_clmm <- function(formula, data) {
    fit_safely(ordinal::clmm(formula, data = data, link = 'logit', Hess = TRUE))
}

#' Fixed effects with Satterthwaite degrees of freedom and t intervals.
fixed_effects <- function(model, level = 0.95) {
    if (!isTRUE(model$ok)) return(NULL)
    coefs <- stats::coef(summary(model$fit))
    df <- coefs[, 'df']
    half <- stats::qt(1 - (1 - level) / 2, df) * coefs[, 'Std. Error']
    tibble::tibble(
        term = rownames(coefs),
        estimate = coefs[, 'Estimate'],
        se = coefs[, 'Std. Error'],
        df = df,
        lower = coefs[, 'Estimate'] - half,
        upper = coefs[, 'Estimate'] + half,
        p = coefs[, 'Pr(>|t|)']
    )
}

term_row <- function(table, name) {
    if (is.null(table)) return(NULL)
    row <- table[table$term == name, , drop = FALSE]
    if (nrow(row) == 1) row else NULL
}

#' Fixed effects of a cumulative link mixed model with Wald intervals.
clmm_effects <- function(model, level = 0.95) {
    if (!isTRUE(model$ok)) return(NULL)
    coefs <- stats::coef(summary(model$fit))
    coefs <- coefs[names(model$fit$beta), , drop = FALSE]
    half <- stats::qnorm(1 - (1 - level) / 2) * coefs[, 'Std. Error']
    tibble::tibble(
        term = rownames(coefs),
        estimate = coefs[, 'Estimate'],
        se = coefs[, 'Std. Error'],
        lower = coefs[, 'Estimate'] - half,
        upper = coefs[, 'Estimate'] + half,
        p = coefs[, 'Pr(>|z|)']
    )
}

#' Variance components of a merMod with their share of the total.
variance_components <- function(fit) {
    vc <- as.data.frame(lme4::VarCorr(fit))
    vc <- vc[is.na(vc$var2), , drop = FALSE]
    tibble::tibble(
        group = vc$grp,
        term = vc$var1,
        variance = vc$vcov,
        sd = vc$sdcor,
        share = vc$vcov / sum(vc$vcov)
    )
}

component <- function(components, group) {
    value <- components$variance[components$group == group &
                                     (is.na(components$term) | components$term == '(Intercept)')]
    if (length(value) == 1) value else NA_real_
}

#' Intraclass correlations of study means from a crossed random-intercept
#' model. 'Agreement' counts rater (session) variance as error, which is right
#' when different studies are rated by different people; 'consistency' leaves
#' it out, as if every study were rated by the same people.
icc_from_fit <- function(fit) {
    components <- variance_components(fit)
    study <- component(components, 'study_id')
    session <- component(components, 'session_id')
    residual <- component(components, 'Residual')
    c(
        agreement = study / (study + session + residual),
        consistency = study / (study + residual)
    )
}

#' Spearman-Brown projection: reliability of a mean of k ratings.
spearman_brown <- function(icc, k) k * icc / (1 + (k - 1) * icc)

#' Ratings per study needed for a target reliability. The tolerance stops
#' floating-point error from rounding an exact whole number up.
raters_needed <- function(icc, reliability) {
    k <- reliability * (1 - icc) / (icc * (1 - reliability))
    ifelse(rep_len(icc, length(k)) > 0, ceiling(k - 1e-9), NA_real_)
}

#' Parametric bootstrap of the agreement ICC and its projection at k raters.
boot_icc <- function(fit, k, nsim, seed, level = 0.95) {
    statistic <- function(model) {
        icc <- icc_from_fit(model)[['agreement']]
        c(icc = icc, reliability = spearman_brown(icc, k))
    }
    result <- fit_safely(lme4::bootMer(fit, statistic, nsim = nsim, seed = seed,
                                       use.u = FALSE, type = 'parametric'))
    if (!result$ok) return(NULL)
    draws <- result$fit$t
    draws <- draws[stats::complete.cases(draws), , drop = FALSE]
    probs <- c((1 - level) / 2, 1 - (1 - level) / 2)
    list(
        n = nrow(draws),
        draws = draws[, 'icc'],
        icc = stats::quantile(draws[, 'icc'], probs, names = FALSE),
        reliability = stats::quantile(draws[, 'reliability'], probs, names = FALSE),
        warnings = length(result$warnings)
    )
}

#' A linear contrast of fixed effects (e.g. the difference of two slopes)
#' with Satterthwaite degrees of freedom.
fixed_contrast <- function(model, weights, level = 0.95) {
    if (!isTRUE(model$ok)) return(NULL)
    result <- lmerTest::contest(model$fit, L = matrix(weights, nrow = 1), joint = FALSE,
                                level = level)
    tibble::tibble(
        estimate = result$Estimate, se = result$`Std. Error`, df = result$df,
        lower = result$lower, upper = result$upper, p = result$`Pr(>|t|)`
    )
}

#' Short description of a fit's problems for the text.
fit_notes <- function(model) {
    notes <- character()
    if (isTRUE(model$singular)) notes <- c(notes, 'singular fit')
    if (length(model$warnings) > 0) notes <- c(notes, 'convergence warnings')
    notes
}

#' Mean of `values` with a percentile interval from resampling whole sessions,
#' which respects the dependence between ratings by the same person.
cluster_boot_mean <- function(values, clusters, R, seed, level = 0.95, min_clusters = 5) {
    keep <- is.finite(values)
    values <- values[keep]
    clusters <- clusters[keep]
    ids <- unique(clusters)
    if (length(ids) < max(2, min_clusters)) {
        return(tibble::tibble(estimate = mean(values), lower = NA_real_, upper = NA_real_,
                              clusters = length(ids)))
    }
    by_cluster <- split(values, factor(clusters, levels = ids))
    sums <- vapply(by_cluster, sum, numeric(1))
    counts <- vapply(by_cluster, length, numeric(1))
    statistic <- function(data, index) sum(sums[index]) / sum(counts[index])
    set.seed(seed)
    draws <- boot::boot(seq_along(ids), statistic, R = R)
    interval <- percentile_interval(draws, level)
    tibble::tibble(estimate = draws$t0, lower = interval[1], upper = interval[2],
                   clusters = length(ids))
}

percentile_interval <- function(draws, level, index = 1) {
    ci <- tryCatch(
        boot::boot.ci(draws, conf = level, type = 'perc', index = index)$percent,
        error = function(error) NULL
    )
    if (is.null(ci)) c(NA_real_, NA_real_) else ci[1, 4:5]
}

#' Mean token share per criterion with percentile bootstrap intervals, from
#' resampling participants (rows), so the shares stay compositional.
share_ci <- function(shares, R, seed, level = 0.95) {
    shares <- as.matrix(shares)
    set.seed(seed)
    draws <- boot::boot(shares, function(data, index) colMeans(data[index, , drop = FALSE]), R = R)
    intervals <- t(vapply(seq_len(ncol(shares)), function(i) percentile_interval(draws, level, i),
                          numeric(2)))
    tibble::tibble(
        criterion = colnames(shares),
        mean = colMeans(shares),
        lower = intervals[, 1],
        upper = intervals[, 2]
    )
}

harmonic_mean <- function(x) {
    x <- x[is.finite(x) & x > 0]
    if (length(x) == 0) NA_real_ else length(x) / sum(1 / x)
}
