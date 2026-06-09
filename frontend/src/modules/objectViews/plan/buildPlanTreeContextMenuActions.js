import { PLAN_TREE_CONTEXT_TARGET } from "./planTreeContextTarget.js";

/**
 * @typedef {Object} PlanTreeContextMenuAction
 * @property {string} id
 * @property {string} label
 * @property {"default" | "danger"} [tone]
 * @property {boolean} [disabled]
 */

/**
 * @param {Object} params
 * @param {"tree" | "node"} params.targetType
 * @param {boolean} [params.previewMode]
 * @param {boolean} [params.canCreate]
 * @param {boolean} [params.hasClipboard]
 * @returns {PlanTreeContextMenuAction[]}
 */
export function buildPlanTreeContextMenuActions({
  targetType,
  previewMode = false,
  canCreate = false,
  hasClipboard = false,
}) {
  if (previewMode) {
    return [];
  }

  if (targetType === PLAN_TREE_CONTEXT_TARGET.NODE) {
    /** @type {PlanTreeContextMenuAction[]} */
    const actions = [];

    if (canCreate) {
      actions.push({ id: "create", label: "Создать" });
    }

    actions.push(
      { id: "rename", label: "Переименовать" },
      { id: "duplicate", label: "Дублировать" },
      { id: "cut", label: "Вырезать" },
      {
        id: "paste",
        label: "Вставить",
        disabled: !hasClipboard,
      },
      { id: "delete", label: "Удалить", tone: "danger" },
      { id: "properties", label: "Свойства" },
    );

    return actions;
  }

  if (targetType === PLAN_TREE_CONTEXT_TARGET.TREE) {
    /** @type {PlanTreeContextMenuAction[]} */
    const actions = [];

    if (canCreate) {
      actions.push({ id: "create", label: "Создать" });
    }

    if (hasClipboard) {
      actions.push({ id: "paste", label: "Вставить" });
    }

    actions.push({ id: "refresh", label: "Обновить" });

    return actions;
  }

  return [];
}
