// Page set-up shared by the PDF handouts, included in the Typst header by
// _quarto.yml. Each handout supplies its licence line and the app's address
// as <handout-footer> metadata (footer_metadata() in handouts.R reads the
// address from CITATION.cff), so the footer needs no copy of them.

#let handout-accent = rgb("#0f766e")

// Carlito is the free font with the same measurements as Calibri, which the
// Word handouts use, so both versions look alike. Whichever is installed is used.
#set text(font: ("Carlito", "Calibri"))

#set page(footer: context {
  set text(size: 8.5pt, fill: luma(70))
  let notes = query(<handout-footer>)
  if notes.len() > 0 {
    let note = notes.first().value
    note.licence
    h(0.5em)
    sym.dot.c
    h(0.5em)
    link(note.url, note.url.replace(regex("^https?://"), ""))
  }
  h(1fr)
  [Page #counter(page).display() of #counter(page).final().first()]
})

#show heading: set text(fill: handout-accent)
// Absolute sizes: relative ones would multiply Typst's own heading sizes.
#show heading.where(level: 1): set text(size: 15pt)
#show heading.where(level: 1): set block(above: 1.6em, below: 0.9em)
#show heading.where(level: 2): set text(size: 12.5pt)
#show heading.where(level: 2): set block(above: 1.4em, below: 0.7em)

#show link: set text(fill: handout-accent)

#set table(
  stroke: 0.5pt + luma(170),
  inset: 6pt,
  fill: (x, y) => if y == 0 { luma(232) },
)
#show table: set text(size: 9.5pt)
#show table: set par(justify: false)
#show table.cell.where(y: 0): set text(weight: "bold")
// Pandoc puts tables in figures, which Typst would otherwise keep on one page.
#show figure: set block(breakable: true)

// The answer scale of a study: the low end label, a circle per point to mark
// and the high end label.
#let rating-scale(low, high, from, to) = block(above: 0.7em, below: 1.4em, breakable: false)[
  #grid(
    columns: (auto,) + range(from, to + 1).map(_ => 2.1em) + (auto,),
    column-gutter: 0.6em,
    align: center + horizon,
    text(size: 9.5pt, low),
    ..range(from, to + 1).map(n => circle(
      radius: 0.9em,
      stroke: 0.8pt + luma(90),
      align(center + horizon, str(n)),
    )),
    text(size: 9.5pt, high),
  )
]

// The small label above a study's title, as in the app.
#let field-label(body) = text(size: 8.5pt, weight: "bold", tracking: 0.08em, fill: luma(85), upper(body))
