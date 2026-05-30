/**
 * @deprecated Use objectEntityCardSectionsLayout for PR-D2 UT convergence.
 * Re-exports kept for settings/persistence compatibility.
 */
import {
  buildDefaultObjectEntityCardUtLayout,
  getInnerTabLabel,
  getUtSectionLabel,
  normalizeObjectEntityCardUtLayout,
  OBJECT_ENTITY_INNER_TAB_IDS,
  resolveAllTabsForSettings,
  resolveVisibleTabIdsForCard,
  resolveVisibleUtSections,
} from "./objectEntityCardSectionsLayout";

export const OBJECT_ENTITY_CARD_TAB_IDS = OBJECT_ENTITY_INNER_TAB_IDS;

export const OBJECT_ENTITY_CARD_SECTION_IDS = {
  parent: "parent",
  main: "main",
  fields: "fields",
  attachments: "attachments",
  tabs: "tabs",
};

export function buildDefaultObjectEntityCardLayout(
  editableFields = [],
  titleFieldKey = null,
) {
  return buildDefaultObjectEntityCardUtLayout(editableFields, titleFieldKey);
}

export function normalizeObjectEntityCardLayout(
  savedLayout,
  editableFields = [],
  titleFieldKey = null,
) {
  return normalizeObjectEntityCardUtLayout(
    savedLayout,
    editableFields,
    titleFieldKey,
  );
}

export function resolveCardLayoutSections() {
  return [];
}

export function resolveVisibleCardTabs(cardLayout) {
  return resolveAllTabsForSettings(cardLayout).filter(
    (tab) => tab.visible !== false,
  );
}

export function resolveVisibleCardTabIds(cardLayout) {
  return resolveVisibleTabIdsForCard(cardLayout);
}

export function getCardTabLabel(tabId) {
  return getInnerTabLabel(tabId);
}

export function getCardSectionLabel(sectionId) {
  return getUtSectionLabel({ id: sectionId });
}

export function resolveActiveCardTab(activeTab, cardLayout) {
  const visibleTabs = resolveVisibleCardTabs(cardLayout);
  const visibleIds = visibleTabs.map((tab) => tab.id);

  if (visibleIds.includes(activeTab)) {
    return activeTab;
  }

  return visibleIds[0] || "notes";
}

export { resolveVisibleUtSections };
