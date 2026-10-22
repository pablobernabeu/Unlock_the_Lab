/**
 * The guide page: glossary and rubric before the first study.
 */
import { renderGlossary, renderRubric } from './reference.js';
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
    if (!rubric.hasChildNodes()) rubric.append(renderRubric(app.content.rubric));

    bindOnce(document.getElementById('guide-back'), 'click', () => app.navigate(0));
    bindOnce(document.getElementById('guide-start'), 'click', () => app.navigate(studyPage(0)));
    return view;
}
