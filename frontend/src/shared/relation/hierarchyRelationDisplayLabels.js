import { TASK_SUBTASK_RELATION_KEY } from "./hierarchyRelationProfile.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

function pluralizeRuChildCollection(singular) {
  const text = normalizeKey(singular);

  if (!text) {
    return "";
  }

  if (text.endsWith("а")) {
    return `${text.slice(0, -1)}и`;
  }

  if (text.endsWith("я")) {
    return `${text.slice(0, -1)}и`;
  }

  return text;
}

/**
 * User-facing labels for hierarchy child groups inside «Связанные записи».
 * Future card layout settings may override via `cardUi` (not wired in Studio yet).
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

  const relationKey = normalizeKey(catalogRelation?.key);
  const relationName = normalizeKey(catalogRelation?.name);
  const childCollection = normalizeKey(settings.child_collection_label);
  const defaultGroupTitle =
    childCollection ||
    pluralizeRuChildCollection(relationName) ||
    (relationKey === TASK_SUBTASK_RELATION_KEY ? "Подзадачи" : "Дочерние элементы");

  const defaultAddButton =
    relationKey === TASK_SUBTASK_RELATION_KEY
      ? "+ Подзадачу"
      : `+ ${relationName || "запись"}`;

  return {
    groupTitle: normalizeKey(cardUi?.groupTitle) || normalizeKey(settings.ui_group_title) || defaultGroupTitle,
    addButtonLabel:
      normalizeKey(cardUi?.addButtonLabel) ||
      normalizeKey(settings.ui_add_button_label) ||
      defaultAddButton,
    unlinkLabel:
      normalizeKey(cardUi?.unlinkLabel) ||
      normalizeKey(settings.ui_unlink_label) ||
      "Убрать из подзадач",
    pickExistingLabel:
      normalizeKey(cardUi?.pickExistingLabel) ||
      normalizeKey(settings.ui_pick_existing_label) ||
      "Выберите запись",
    createNewLabel: "Создать новую",
    linkExistingLabel: "Добавить существующую",
  };
}
