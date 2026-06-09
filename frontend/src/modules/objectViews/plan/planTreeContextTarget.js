export const PLAN_TREE_CONTEXT_TARGET = {
  TREE: "tree",
  NODE: "node",
};

/**
 * @typedef {Object} PlanTreeContextTarget
 * @property {"tree" | "node"} targetType
 * @property {string | null} targetId
 */

/**
 * @param {"tree" | "node"} targetType
 * @param {string | null | undefined} [targetId]
 * @returns {PlanTreeContextTarget}
 */
export function createPlanTreeContextTarget(targetType, targetId = null) {
  const normalizedType =
    targetType === PLAN_TREE_CONTEXT_TARGET.NODE
      ? PLAN_TREE_CONTEXT_TARGET.NODE
      : PLAN_TREE_CONTEXT_TARGET.TREE;

  const normalizedId =
    normalizedType === PLAN_TREE_CONTEXT_TARGET.NODE
      ? String(targetId ?? "").trim() || null
      : null;

  return {
    targetType: normalizedType,
    targetId: normalizedId,
  };
}

/**
 * @param {PlanTreeContextTarget | null | undefined} target
 * @returns {boolean}
 */
export function isPlanTreeNodeContextTarget(target) {
  return target?.targetType === PLAN_TREE_CONTEXT_TARGET.NODE && Boolean(target?.targetId);
}

/**
 * @param {PlanTreeContextTarget | null | undefined} target
 * @returns {boolean}
 */
export function isPlanTreeBackgroundContextTarget(target) {
  return target?.targetType === PLAN_TREE_CONTEXT_TARGET.TREE;
}

/**
 * @param {"tree" | "node"} targetType
 * @returns {string}
 */
export function resolvePlanTreeContextMenuLabel(targetType) {
  return targetType === PLAN_TREE_CONTEXT_TARGET.NODE
    ? "Меню записи плана"
    : "Меню дерева плана";
}
