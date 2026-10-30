# Formatting for numbers in prose and tables, and small helpers that choose
# wording from estimates so that no sentence asserts more than the data show.

MINUS <- '−'

with_minus <- function(text) sub('^-', MINUS, text)

fmt_num <- function(x, digits = 2) {
    ifelse(is.na(x), 'NA',
           with_minus(formatC(x, format = 'f', digits = digits, big.mark = ',')))
}

fmt_int <- function(x) {
    ifelse(is.na(x), 'NA', with_minus(formatC(round(x), format = 'd', big.mark = ',')))
}

#' Counts and medians of counts: no decimals when the value is whole.
fmt_count <- function(x, digits = 1) {
    ifelse(!is.na(x) & x == round(x), fmt_int(x), fmt_num(x, digits))
}

fmt_pct <- function(p, digits = 0) paste0(fmt_num(100 * p, digits), '%')

fmt_ci <- function(lower, upper, digits = 2, missing = 'not estimable') {
    ifelse(is.na(lower) | is.na(upper), missing,
           paste0('[', fmt_num(lower, digits), ', ', fmt_num(upper, digits), ']'))
}

#' 'estimate, 95% CI [lower, upper]' for prose.
fmt_est <- function(estimate, lower, upper, digits = 2, level = 0.95) {
    if (is.na(lower) || is.na(upper)) return(fmt_num(estimate, digits))
    paste0(fmt_num(estimate, digits), ', ', fmt_pct(level), ' CI ', fmt_ci(lower, upper, digits))
}

fmt_p <- function(p) {
    if (is.na(p)) return('p not estimable')
    if (p < 0.001) return('p < 0.001')
    paste0('p = ', formatC(p, format = 'f', digits = 3))
}

fmt_date <- function(time) trimws(format(time, '%e %B %Y', tz = 'UTC'))

#' Date of the earliest or latest finite time, or '' when there is none.
fmt_date_range_end <- function(time, end = c('first', 'last')) {
    end <- match.arg(end)
    time <- time[!is.na(time)]
    if (length(time) == 0) return('')
    fmt_date(if (end == 'first') min(time) else max(time))
}

#' 'on 3 March 2026' or 'between 3 March 2026 and 5 May 2026'.
fmt_date_span <- function(first, last) {
    if (fmt_date(first) == fmt_date(last)) return(paste('on', fmt_date(first)))
    paste('between', fmt_date(first), 'and', fmt_date(last))
}

fmt_datetime <- function(time) {
    paste0(fmt_date(time), ', ', format(time, '%H:%M', tz = 'UTC'), ' UTC')
}

#' '1 rating', '3 ratings', '2.5 ratings' (for medians).
plural <- function(n, singular, plural = paste0(singular, 's')) {
    paste(fmt_count(n), ifelse(!is.na(n) & n == 1, singular, plural))
}

#' '4 studies' when all values are equal, otherwise '2 to 7 studies'.
fmt_count_range <- function(x, singular, plural = paste0(singular, 's')) {
    if (min(x) == max(x)) return(plural(min(x), singular, plural))
    paste(fmt_count(min(x)), 'to', plural(max(x), singular, plural))
}

#' 'no rating', '1 rating', '3 ratings': for counts inside a sentence.
count_phrase <- function(n, singular, plural = paste0(singular, 's')) {
    if (n == 0) paste('no', singular) else plural(n, singular, plural)
}

#' 'all predictions', 'none of the predictions' or '41.5% of predictions'.
fmt_share <- function(share, noun) {
    if (share == 1) return(paste('all', noun))
    if (share == 0) return(paste('none of', noun))
    paste(fmt_pct(share, 1), 'of', noun)
}

#' 'none' for zero, otherwise the number.
count_or_none <- function(n) if (n == 0) 'none' else fmt_int(n)

#' Verb agreement with a count ('1 entry qualifies', '3 entries qualify';
#' 'no entry qualifies').
agree <- function(n, singular, plural) if (n <= 1) singular else plural

#' 'a, b and c' (no serial comma).
fmt_list <- function(x, conjunction = 'and') {
    x <- as.character(x)
    if (length(x) <= 1) return(paste(x, collapse = ''))
    paste(paste(x[-length(x)], collapse = ', '), conjunction, x[length(x)])
}

#' Where an interval lies relative to a reference value, judged at the
#' precision the text shows (`digits`), so that wording never contradicts a
#' printed bound such as [0.00, 0.19].
position <- function(lower, upper, reference, digits = 2) {
    if (is.na(lower) || is.na(upper)) return('unknown')
    lower <- round(lower, digits)
    upper <- round(upper, digits)
    reference <- round(reference, digits)
    if (lower > reference) return('above')
    if (upper < reference) return('below')
    'includes'
}

#' Plain-language strength of a correlation (Cohen's conventional labels),
#' used only alongside the estimate and its interval.
strength <- function(r) {
    if (is.na(r)) return('unestimable')
    size <- abs(r)
    label <- if (size < 0.1) 'negligible' else if (size < 0.3) 'weak' else if (size < 0.5)
        'moderate' else 'strong'
    if (label == 'negligible') label else paste(label, if (r > 0) 'positive' else 'negative')
}

#' Renames one column, for headers computed at render time.
rename_column <- function(data, from, to) {
    names(data)[names(data) == from] <- to
    data
}

#' Data frame ready for knitr::kable with rounded numbers and minus signs.
tidy_table <- function(data, digits = 2) {
    data <- as.data.frame(data)
    for (name in names(data)) {
        column <- data[[name]]
        if (is.numeric(column)) {
            whole <- all(is.na(column) | column == round(column))
            data[[name]] <- if (whole) fmt_int(column) else fmt_num(column, digits)
            data[[name]][is.na(column)] <- ''
        }
    }
    data
}

#' Truncates long study titles for tables.
short_title <- function(title, width = 60) {
    ifelse(nchar(title) > width, paste0(substr(title, 1, width - 1), '…'), title)
}

#' Writes a block of markdown with inline R into an `results: asis` chunk,
#' only when `when` is true. Inline code is evaluated where the report's
#' chunks run, so prose can use any computed value.
prose <- function(text, when = TRUE) {
    if (!isTRUE(when)) return(invisible(NULL))
    out <- knitr::knit_child(text = text, quiet = TRUE, envir = knitr::knit_global())
    cat(out, sep = '\n')
    cat('\n\n')
    invisible(NULL)
}

#' Markdown table from a data frame, numbers formatted with `tidy_table`.
md_table <- function(data, digits = 2, align = NULL) {
    knitr::kable(tidy_table(data, digits), format = 'pipe', align = align)
}
