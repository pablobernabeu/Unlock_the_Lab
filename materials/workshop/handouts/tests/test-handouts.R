# Checks of the handout helpers, in base R so they need no test framework.
# Run from materials/workshop/handouts:  Rscript tests/test-handouts.R
# (build.sh runs them before every render).

source('handouts.R')

passed <- 0
check <- function(description, condition) {
    if (!isTRUE(condition)) stop('Failed: ', description, call. = FALSE)
    passed <<- passed + 1
}
fails <- function(expr) inherits(tryCatch(expr, error = function(error) error), 'error')

# Content HTML becomes Markdown, everything else is printed literally.
check('<i> becomes italics', html_to_md('<i>N</i>=12 children') == '*N*=12 children')
check('<em> becomes italics', html_to_md('an <em>effect</em>') == 'an *effect*')
check('<strong> and <b> become bold',
      html_to_md('<strong>Predict.</strong> Guess <b>now</b>') == '**Predict.** Guess **now**')
check('links keep their address',
      html_to_md('<a href="https://example.org/x">the code</a>.') == '[the code](https://example.org/x).')
check('a lone less-than sign is text, not a tag',
      html_to_md('(<i>p</i> < 0.05)') == '(*p* \\< 0.05)')
check('Markdown characters are escaped',
      html_to_md('a*b_c [d] #e $5 @f') == 'a\\*b\\_c \\[d\\] \\#e \\$5 \\@f')
check('quotes stay as they are, for typographic quotes',
      html_to_md("the 'sugar crash'") == "the 'sugar crash'")
check('a paragraph starting like a numbered list stays a paragraph',
      html_to_md('12. Children') == '12\\. Children')
check('a paragraph starting like a bullet stays a paragraph', html_to_md('- one') == '\\- one')
check('whitespace and line breaks collapse', html_to_md('  a \n  b ') == 'a b')
check('entities are decoded', html_to_md('A &amp; B') == 'A & B')
check('unknown tags are refused rather than printed', fails(html_to_md('<script>x</script>')))

# Interface text is read and filled in as t() does in the app.
strings <- list(app = list(
    greet = 'Hello {name}',
    count = list(one = '{count} study', other = '{count} studies')
))
check('placeholders are filled', tr(strings, 'app.greet', list(name = 'Ada')) == 'Hello Ada')
check('the plural form follows count',
      tr(strings, 'app.count', list(count = 1)) == '1 study' &&
          tr(strings, 'app.count', list(count = 48)) == '48 studies')
check('a missing key fails loudly', fails(tr(strings, 'app.missing')))
check('an unfilled placeholder fails loudly', fails(tr(strings, 'app.greet')))

# Numbers and scoring match src/lib/format.js and src/lib/scoring.js.
check('halves round up as Math.round does', js_round(0.5) == 1 && js_round(2.5) == 3)
check('percentages have no decimals', format_percent(100 / 120 * 100) == '83%')
check('the target counts the expert rating as 100 participants',
      abs(scoring_target(60, 20, 5, 100) - 560 / 120) < 1e-12)
check('the target is the expert rating when no one else has rated',
      scoring_target(0, 0, 6, 100) == 6)
check('a prediction loses 12 points per scale point',
      prediction_score(5, 4, 12) == 88 && prediction_score(6, 4, 12) == 76)
check('scores never go below zero', prediction_score(1, 7, 20) == 0)

# Markdown building blocks.
table <- strsplit(md_table(c('A', 'B'), list(c('1', '2')), c(1, 3)), '\n')[[1]]
check('tables have a header, a separator and the rows', length(table) == 3)
check('the separator is long enough for Pandoc to use the widths', nchar(table[2]) > 72)
check('the separator keeps the relative widths',
      identical(nchar(strsplit(table[2], '|', fixed = TRUE)[[1]][2:3]), c(25L, 75L)))
check('Typst strings are escaped', typst_string('a "b" \\c') == '"a \\"b\\" \\\\c"')
check('lists in running text have no serial comma',
      and_list(c('a', 'b', 'c')) == 'a, b and c' && and_list('a') == 'a')
check('small numbers become words', number_words(6) == 'six' && number_words(12) == '12')
check('a new page starts with a break for the PDF and a style for Word',
      grepl('#pagebreak', page_start('x')[1]) && grepl('custom-style="Page Start"', page_start('x')[2]))

# Choosing the sample studies, on made-up studies.
fake <- function(number, rating, bands) {
    keys <- c('title', 'access', 'source', 'theory', 'methods', 'conclusion')
    list(id = paste0('STUDY-', number), number = number, expertRating = rating,
         band = quality_band(rating),
         feedback = list(criteria = setNames(lapply(bands, function(band) list(band = band)), keys)))
}
low <- rep('low', 6)
high <- rep('high', 6)
medium <- rep('medium', 6)
studies <- list(
    fake(1, 1, low), fake(2, 1, c('high', 'high', 'low', 'low', 'low', 'low')),
    fake(3, 1, c('high', 'high', 'low', 'low', 'low', 'low')), fake(4, 1, low), fake(5, 2, low),
    fake(6, 4, medium), fake(7, 5, high), fake(8, 3, medium),
    fake(9, 7, high), fake(10, 6, c('low', 'medium', 'high', 'high', 'high', 'high')), fake(11, 6, high)
)
keys <- c('title', 'access', 'source', 'theory', 'methods', 'conclusion')
picked <- vapply(choose_sample_studies(studies, keys), function(study) study$id, '')
check('two studies from each band, in study order',
      identical(picked, c('STUDY-2', 'STUDY-5', 'STUDY-6', 'STUDY-7', 'STUDY-9', 'STUDY-10')))
check('a band with one study is refused',
      fails(choose_sample_studies(studies[c(1, 6, 7, 9, 10)], keys)))
check('the hardest study is the one whose criteria differ most from its band',
      band_disagreement(studies[[10]], keys) == 2 && band_disagreement(studies[[7]], keys) == 6)

# The app's own content.
data <- load_handout_data()
check('reads every study with an expert rating from 1 to 7',
      length(data$studies) == data$config$study_count &&
          all(vapply(data$studies, function(study) study$expertRating %in% 1:7, logical(1))))
check('reads the criteria in the app\'s order',
      identical(data$criteria$key, c('title', 'access', 'source', 'theory', 'methods', 'conclusion')) &&
          data$criteria$field[data$criteria$key == 'theory'] == 'overview')
check('reads the scoring constants', data$config$weight == 100 && data$config$penalty == 12)
check('reads the app\'s address', grepl('^https://', data$url))
check('the rubric has a row per criterion with three bands',
      length(data$rubric) == nrow(data$criteria) &&
          all(vapply(data$rubric, function(row) all(c('low', 'medium', 'high') %in% names(row)), logical(1))))
fields <- c('title', unique(data$criteria$field), 'access', 'source', 'conclusion')
texts <- c(
    unlist(lapply(data$studies, function(study) {
        c(unlist(study[intersect(fields, names(study))]), study$feedback$summary,
          vapply(study$feedback$criteria, function(criterion) criterion$note, ''))
    })),
    unlist(data$glossary), unlist(lapply(data$rubric, unlist))
)
converted <- vapply(texts, html_to_md, '', USE.NAMES = FALSE)
check('all content converts, with no HTML tags left', !any(grepl('<[a-z/]', converted)))
check('italics in the content become Markdown italics', any(grepl('*N*', converted, fixed = TRUE)))
check('every study has feedback on all six criteria',
      all(vapply(data$studies, band_disagreement, numeric(1), keys = data$criteria$key) >= 0))
sample <- choose_sample_studies(data$studies, data$criteria$key)
check('the sample has six studies covering the three bands',
      length(sample) == 6 &&
          identical(as.vector(table(vapply(sample, function(study) study$band, ''))[c('low', 'medium', 'high')]),
                    c(2L, 2L, 2L)))
card <- study_card_md(data, sample[[1]], 'Study A')
check('a study card shows the five text sections and both answers',
      sum(grepl('^## ', card)) == 6 && sum(grepl('rating-scale', card)) == 2)
check('the Methods section sets the data availability label in bold',
      any(grepl(sprintf('**%s**', tr(data$strings, 'app.study.dataAvailability')), card, fixed = TRUE)) ||
          !grepl(tr(data$strings, 'app.study.dataAvailability'), sample[[1]]$methods, fixed = TRUE))

cat(sprintf('All %d handout checks passed.\n', passed))
