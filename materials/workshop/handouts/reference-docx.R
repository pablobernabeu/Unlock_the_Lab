# Builds reference.docx, the Word template the handouts are rendered with:
# Pandoc's default reference document with A4 pages, 2 cm margins, an 11 pt
# body, bordered tables and a footer with the licence line, the app's address
# and 'Page X of Y'. build.sh runs it before rendering, so the template always
# carries the address in CITATION.cff. Needs Quarto and the zip command.
#
# Usage, from this folder:  Rscript reference-docx.R [output] [quarto]

source('handouts.R')

xml_escape <- function(text) {
    text <- gsub('&', '&amp;', text, fixed = TRUE)
    text <- gsub('<', '&lt;', text, fixed = TRUE)
    gsub('>', '&gt;', text, fixed = TRUE)
}

#' Replaces the single match of `pattern` in `text`, failing loudly if
#' Pandoc's default template no longer has it.
replace_once <- function(text, pattern, replacement, what) {
    if (length(gregexpr(pattern, text, perl = TRUE)[[1]]) != 1 ||
        !grepl(pattern, text, perl = TRUE)) {
        stop('Unexpected reference document from Pandoc: ', what, call. = FALSE)
    }
    sub(pattern, replacement, text, perl = TRUE)
}

#' Sets the font size (in half-points) of one style.
set_style_size <- function(text, style_id, half_points) {
    pattern <- sprintf(paste0('(w:styleId="%s">(?:(?!</w:style>)[\\s\\S])*?<w:sz w:val=")[0-9]+',
                              '(" />\\s*<w:szCs w:val=")[0-9]+'), style_id)
    replace_once(text, pattern, sprintf('\\1%d\\2%d', half_points, half_points),
                 paste('size of', style_id))
}

edit_file <- function(path, edit) {
    text <- paste(readLines(path, warn = FALSE, encoding = 'UTF-8'), collapse = '\n')
    writeLines(enc2utf8(edit(text)), path, useBytes = TRUE)
}

# A4 is 11906 by 16838 twips; 1134 twips is 2 cm.
PAGE <- list(width = 11906, height = 16838, margin = 1134, bottom = 1418, footer = 567)

footer_xml <- function(note) {
    run <- function(inner) {
        sprintf('<w:r><w:rPr><w:color w:val="595959" /><w:sz w:val="17" /></w:rPr>%s</w:r>', inner)
    }
    text_run <- function(text) run(sprintf('<w:t xml:space="preserve">%s</w:t>', xml_escape(text)))
    field <- function(code) {
        paste0(run('<w:fldChar w:fldCharType="begin" />'),
               run(sprintf('<w:instrText xml:space="preserve"> %s </w:instrText>', code)),
               run('<w:fldChar w:fldCharType="separate" />'), text_run('1'),
               run('<w:fldChar w:fldCharType="end" />'))
    }
    paste0(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="',
        PAGE$width - 2 * PAGE$margin, '" /></w:tabs><w:spacing w:after="0" /></w:pPr>',
        text_run(note), run('<w:tab />'), text_run('Page '), field('PAGE'), text_run(' of '),
        field('NUMPAGES'), '</w:p></w:ftr>'
    )
}

build_reference_docx <- function(output = 'reference.docx', quarto = 'quarto',
                                 data = load_handout_data()) {
    output <- file.path(normalizePath(dirname(output)), basename(output))
    unlink(output)
    work <- tempfile('reference-docx-')
    dir.create(work)
    on.exit(unlink(work, recursive = TRUE), add = TRUE)
    default <- file.path(work, 'default.docx')
    status <- system2(quarto, c('pandoc', '-o', shQuote(default),
                                '--print-default-data-file', 'reference.docx'))
    if (status != 0 || !file.exists(default)) {
        stop('Could not get the default reference document from ', quarto, call. = FALSE)
    }
    dir <- file.path(work, 'docx')
    utils::unzip(default, exdir = dir)
    part <- function(...) file.path(dir, ...)

    note <- sprintf('%s \u00b7 %s', HANDOUT_LICENCE, sub('^https?://', '', data$url))
    writeLines(enc2utf8(footer_xml(note)), part('word', 'footer1.xml'), useBytes = TRUE)

    edit_file(part('word', '_rels', 'document.xml.rels'), function(text) {
        replace_once(text, '</Relationships>', paste0(
            '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/',
            'relationships/footer" Id="rIdHandoutFooter" Target="footer1.xml" /></Relationships>'
        ), 'relationships')
    })
    edit_file(part('[Content_Types].xml'), function(text) {
        replace_once(text, '</Types>', paste0(
            '<Override PartName="/word/footer1.xml" ContentType="application/',
            'vnd.openxmlformats-officedocument.wordprocessingml.footer+xml" /></Types>'
        ), 'content types')
    })
    edit_file(part('word', 'document.xml'), function(text) {
        text <- replace_once(text, '<w:sectPr>',
                             '<w:sectPr><w:footerReference w:type="default" r:id="rIdHandoutFooter" />',
                             'section properties')
        replace_once(text, '</w:sectPr>', sprintf(paste0(
            '<w:pgSz w:w="%d" w:h="%d" /><w:pgMar w:top="%d" w:right="%d" w:bottom="%d" ',
            'w:left="%d" w:header="%d" w:footer="%d" w:gutter="0" /></w:sectPr>'
        ), PAGE$width, PAGE$height, PAGE$margin, PAGE$margin, PAGE$bottom, PAGE$margin,
        PAGE$footer, PAGE$footer), 'end of section properties')
    })
    edit_file(part('word', 'styles.xml'), function(text) {
        text <- replace_once(text, '(<w:rPrDefault>[\\s\\S]*?)<w:sz w:val="24" />\\s*<w:szCs w:val="24" />',
                             '\\1<w:sz w:val="22" /><w:szCs w:val="22" />', 'default font size')
        text <- replace_once(text, '<w:lang w:val="en-US"', '<w:lang w:val="en-GB"', 'language')
        # Tighter spacing and smaller headings than Pandoc's defaults, closer to the PDF.
        text <- replace_once(text, '(w:styleId="BodyText">[\\s\\S]*?)<w:spacing w:before="180" w:after="180" />',
                             '\\1<w:spacing w:before="0" w:after="120" />', 'body text spacing')
        for (style in list(c('Heading1', 32), c('Heading1Char', 32), c('Heading2', 26),
                           c('Heading2Char', 26))) {
            text <- set_style_size(text, style[1], as.integer(style[2]))
        }
        # 'Page Start' (custom-style in page_start() in handouts.R) begins a new
        # page. A paragraph that only holds a page break can land at the top of
        # a page when the one before is full and leave a blank page.
        text <- replace_once(text, '</w:styles>', paste0(
            '<w:style w:type="paragraph" w:customStyle="1" w:styleId="PageStart">',
            '<w:name w:val="Page Start" /><w:basedOn w:val="BodyText" /><w:next w:val="BodyText" />',
            '<w:qFormat /><w:pPr><w:pageBreakBefore /></w:pPr></w:style></w:styles>'
        ), 'end of styles')
        border <- function(side) {
            sprintf('<w:%s w:val="single" w:sz="4" w:space="0" w:color="AAAAAA" />', side)
        }
        text <- replace_once(
            text, '(w:styleId="Table">[\\s\\S]*?<w:tblInd w:w="0" w:type="dxa" />)',
            paste0('\\1<w:tblBorders>',
                   paste(vapply(c('top', 'left', 'bottom', 'right', 'insideH', 'insideV'), border, ''),
                         collapse = ''),
                   '</w:tblBorders>'),
            'table borders'
        )
        text <- replace_once(
            text, '(w:styleId="Table">[\\s\\S]*?<w:tblCellMar>)\\s*<w:top w:w="0" w:type="dxa" />',
            '\\1<w:top w:w="57" w:type="dxa" />', 'table cell top margin'
        )
        text <- replace_once(
            text, '(w:styleId="Table">[\\s\\S]*?<w:tblCellMar>[\\s\\S]*?)<w:bottom w:w="0" w:type="dxa" />',
            '\\1<w:bottom w:w="57" w:type="dxa" />', 'table cell bottom margin'
        )
        # Rows stay whole rather than splitting across pages.
        text <- replace_once(text, '(w:styleId="Table">[\\s\\S]*?</w:tblPr>)',
                             '\\1<w:trPr><w:cantSplit /></w:trPr>', 'table row properties')
        replace_once(
            text, '(<w:tblStylePr w:type="firstRow">)\\s*<w:tcPr>\\s*<w:tcBorders>([\\s\\S]*?)</w:tcBorders>',
            '\\1<w:rPr><w:b /></w:rPr><w:tcPr><w:tcBorders>\\2</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="E8E8E8" />',
            'table header row'
        )
    })
    edit_file(part('word', 'theme', 'theme1.xml'), function(text) {
        # Calibri comes with Word on Windows and macOS; LibreOffice substitutes
        # the metric-compatible Carlito. Accent 1 colours the headings teal, as in the app.
        text <- replace_once(text, '(<a:majorFont>\\s*<a:latin typeface=")[^"]*"', '\\1Calibri"',
                             'heading font')
        text <- replace_once(text, '(<a:minorFont>\\s*<a:latin typeface=")[^"]*"', '\\1Calibri"',
                             'body font')
        replace_once(text, '(<a:accent1>\\s*<a:srgbClr val=")[^"]*"', '\\1149D93"', 'accent colour')
    })

    # Fixed timestamps and order, so an unchanged template is byte-identical.
    files <- list.files(dir, recursive = TRUE, all.files = TRUE)
    files <- c('[Content_Types].xml', sort(setdiff(files, '[Content_Types].xml')))
    Sys.setFileTime(file.path(dir, files), as.POSIXct('2026-01-01 00:00:00', tz = 'UTC'))
    # zip stores local times, so it runs in UTC to give the same bytes everywhere.
    old_tz <- Sys.getenv('TZ', unset = NA)
    Sys.setenv(TZ = 'UTC')
    on.exit(if (is.na(old_tz)) Sys.unsetenv('TZ') else Sys.setenv(TZ = old_tz), add = TRUE)
    old_wd <- setwd(dir)
    on.exit(setwd(old_wd), add = TRUE)
    # -nw: '[Content_Types].xml' is a file name, not a wildcard pattern.
    status <- utils::zip(output, files, flags = '-X -q -9 -nw -D')
    if (status != 0) stop('zip failed with status ', status, call. = FALSE)
    invisible(output)
}

if (sys.nframe() == 0) {
    args <- commandArgs(trailingOnly = TRUE)
    build_reference_docx(output = if (length(args) >= 1) args[1] else 'reference.docx',
                         quarto = if (length(args) >= 2) args[2] else 'quarto')
}
