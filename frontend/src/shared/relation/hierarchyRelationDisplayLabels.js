import {
  DEFAULT_HIERARCHY_LABELS,
  formatCreateChildMenuLabel,
  resolveHierarchyLabelsFromRelation,
} from "./hierarchyLabels.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * User-facing labels for hierarchy child groups inside «Связанные записи».
 *
 * @param {Record<string, unknown> | null | undefined} catalogRelation
 * @param {{
 *   groupTitle?: string,
 *   addButtonLabel?: string,
 *   unlinkLabel?: string,
 *   pickExistingLabel?: string,
 * }} [cardUi]
 */
export function resolveHierarchyChildUiLabels(catalogRelation, cardUi = null) {
  const settings =
    catalogRelation?.settings_json && typeof catalogRelation.settings_json === "object"
      ? catalogRelation.settings_json
      : {};

  const relationName = normalizeKey(catalogRelation?.name);
  const hierarchyLabels = resolveHierarchyLabelsFromRelation(catalogRelation);
  const defaultGroupTitle = hierarchyLabels.children || DEFAULT_HIERARCHY_LABELS.children;
  const defaultAddButton = formatCreateChildMenuLabel(hierarchyLabels.child).replace(
    /^Создать /,
    "+ ",
  );

  return {
    groupTitle:
      normalizeKey(cardUi?.groupTitle) ||
      normalizeKey(settings.ui_group_title) ||
      defaultGroupTitle,
    addButtonLabel:
      normalizeKey(cardUi?.addButtonLabel) ||
      normalizeKey(settings.ui_add_button_label) ||
      defaultAddButton,
    unlinkLabel:
      normalizeKey(cardUi?.unlinkLabel) ||
      normalizeKey(settings.ui_unlink_label) ||
      `Убрать из ${defaultGroupTitle.toLowerCase()}`,
    pickExistingLabel:
      normalizeKey(cardUi?.pickExistingLabel) ||
      normalizeKey(settings.ui_pick_existing_label) ||
      "Выберите запись",
    createNewLabel: "Создать новую",
    linkExistingLabel: "Добавить существующую",
    hierarchyLabels,
    relationName,
  };
}
