export const YASII_PRESENTATION = {
  CLOSED: "closed",
  PANEL: "panel",
  PAGE: "page",
};

/**
 * @param {string} presentation
 */
export function isYasiiPanelPresentation(presentation) {
  return presentation === YASII_PRESENTATION.PANEL;
}

/**
 * @param {string} presentation
 */
export function isYasiiPagePresentation(presentation) {
  return presentation === YASII_PRESENTATION.PAGE;
}

/**
 * @param {boolean} pinned
 */
export function resolveInitialYasiiPresentation(pinned) {
  return pinned ? YASII_PRESENTATION.PANEL : YASII_PRESENTATION.CLOSED;
}
