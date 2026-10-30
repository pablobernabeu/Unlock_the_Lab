# Figure styling. Colours were checked for colour-vision deficiency and
# contrast: the series colours are distinguishable in every pair, and the
# quality bands use one blue hue from light to dark (an ordered scale). Bands
# also differ in marker shape, so colour is never the only cue.

PALETTE <- list(
    series = c(blue = '#2a78d6', orange = '#eb6834', aqua = '#1baf7a'),
    band = c(low = '#86b6ef', medium = '#2a78d6', high = '#104281'),
    ink = '#0b0b0b',
    muted = '#52514e',
    grid = '#e4e3df'
)

BAND_SHAPES <- c(low = 21, medium = 24, high = 22)
BAND_LABELS <- c(low = 'Low (1\u20132)', medium = 'Medium (3\u20135)', high = 'High (6\u20137)')

theme_report <- function(base_size = 11) {
    ggplot2::theme_minimal(base_size = base_size) +
        ggplot2::theme(
            text = ggplot2::element_text(colour = PALETTE$ink),
            axis.text = ggplot2::element_text(colour = PALETTE$muted),
            axis.title = ggplot2::element_text(colour = PALETTE$ink),
            panel.grid.major = ggplot2::element_line(colour = PALETTE$grid, linewidth = 0.3),
            panel.grid.minor = ggplot2::element_blank(),
            legend.position = 'top',
            legend.justification = 'left',
            plot.title.position = 'plot',
            strip.text = ggplot2::element_text(face = 'bold', hjust = 0)
        )
}

band_scales <- function(name = 'Expert quality band') {
    list(
        ggplot2::scale_fill_manual(name = name, values = PALETTE$band, labels = BAND_LABELS,
                                   drop = FALSE),
        ggplot2::scale_colour_manual(name = name, values = PALETTE$band, labels = BAND_LABELS,
                                     drop = FALSE),
        ggplot2::scale_shape_manual(name = name, values = BAND_SHAPES, labels = BAND_LABELS,
                                    drop = FALSE)
    )
}

rating_scale <- function(axis = c('y', 'x'), name, limits) {
    axis <- match.arg(axis)
    breaks <- seq(limits[1], limits[2])
    expand <- ggplot2::expansion(add = 0.3)
    if (axis == 'y') {
        ggplot2::scale_y_continuous(name = name, limits = limits, breaks = breaks, expand = expand)
    } else {
        ggplot2::scale_x_continuous(name = name, limits = limits, breaks = breaks, expand = expand)
    }
}
