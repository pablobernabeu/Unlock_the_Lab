/**
 * The guide page: glossary, rubric and rating guide before the first study.
 */
import { renderAccessNote, renderGlossary, renderRatingGuide, renderRubric } from './reference.js';
import { bindOnce } from '../ui.js';
import { studyPage } from '../state.js';

/**
 * @param {object} app the app context (see participant.js)
 * @returns {HTMLElement} the view
 */
export function renderGuideView(app) {
    const view = document.getElementById('view-guide');
    const glossary = document.getElementById('guide-glossary');
    const rubric = document.getElementById('guide-rubric');
    if (!glossary.hasChildNodes()) glossary.append(renderGlossary(app.content.glossary));
    if (!rubric.hasChildNodes()) {
        rubric.append(renderRubric(app.content.rubric));
        const accessNote = renderAccessNote(app.content.guide);
        if (accessNote) rubric.append(accessNote);
    }
    const ratingGuide = document.getElementById('guide-rating');
    if (!ratingGuide.hasChildNodes()) ratingGuide.append(renderRatingGuide(app.content.guide));

    bindOnce(document.getElementById('guide-back'), 'click', () => app.navigate(0));
    bindOnce(document.getElementById('guide-start'), 'click', () => app.navigate(studyPage(0)));
    return view;
}
