/**
 * Short labels shared by the table, chart and study dialog.
 */
import { t } from '../lib/i18n.js';

const BAND_LABELS = Object.freeze({
    low: () => t('dashboard.band.low'),
    medium: () => t('dashboard.band.medium'),
    high: () => t('dashboard.band.high'),
});

/**
 * Label of a quality band ('Low', 'Medium' or 'High').
 * @param {'low'|'medium'|'high'|null|undefined} band
 * @returns {string} '' for an unknown band
 */
export function bandLabel(band) {
    return Object.hasOwn(BAND_LABELS, band ?? '') ? BAND_LABELS[band]() : '';
}
