import { isPlanTreeDescendant } from "./planHierarchyMove.js";

export const PLAN_TREE_DROP_POSITION = {
  BEFORE: "before",
  AFTER: "after",
  INSIDE: "inside",
  ROOT_END: "root-end",
};

/**
 * @typedef {Object} PlanTreeDropDescriptor
 * @property {string | null} targetId
 * @property {"before" | "after" | "inside" | "root-end"} position
 * @property {string | null} parentId
 * @property {number} index
 */

/**
 * @param {DragEvent} event
 * @param {HTMLElement} rowElement
 * @param {{ beforeRatio?: number, afterRatio?: number }} [options]
 * @returns {"before" | "after" | "inside"}
 */
export function computePlanTreeDropPosition(
  event,
  rowElement,
  { beforeRatio = 0.25, afterRatio = 0.75 } = {},
) {
  const rect = rowElement.getBoundingClientRect();
  const height = rect.height || 1;
  const ratio = (event.clientY - rect.top) / height;

  if (ratio < beforeRatio) {
    return PLAN_TREE_DROP_POSITION.BEFORE;
  }

  if (ratio > afterRatio) {
    return PLAN_TREE_DROP_POSITION.AFTER;
  }

  return PLAN_TREE_DROP_POSITION.INSIDE;
}

import { resolveEffectivePlanTreeParentId } from "./planTreeRootAnchor.js";

/**
 * @param {Map<string, object>} nodesById
 * @param {Array<{ id: string, children?: Array<{ id: string }> }>} roots
 * @param {string | null} parentId
 * @param {string | null | undefined} [rootAnchorId]
 * @returns {string[]}
 */
export function getPlanTreeChildrenIds(nodesById, roots, parentId, rootAnchorId = null) {
  const normalizedAnchorId = String(rootAnchorId ?? "").trim();
  const effectiveParentId = resolveEffectivePlanTreeParentId(parentId, rootAnchorId);

  if (!effectiveParentId) {
    return roots.map((root) => root.id);
  }

  // The root anchor is a technical node hidden from nodesById — visible roots are the siblings.
  if (normalizedAnchorId && effectiveParentId === normalizedAnchorId) {
    return roots.map((root) => root.id);
  }

  const parentNode = nodesById.get(effectiveParentId);
  return (parentNode?.children || []).map((child) => child.id);
}

/**
 * @param {Object} params
 * @param {string} params.sourceId
 * @param {string | null} [params.targetId]
 * @param {"before" | "after" | "inside" | "root-end"} params.position
 * @param {Map<string, object>} params.nodesById
 * @param {Array<{ id: string, children?: Array<{ id: string }> }>} params.roots
 * @returns {PlanTreeDropDescriptor | null}
 */
export function buildPlanTreeMoveDescriptor({
  sourceId,
  targetId = null,
  position,
  nodesById,
  roots,
  rootAnchorId = null,
}) {
  const normalizedSourceId = String(sourceId ?? "").trim();

  if (!normalizedSourceId || !position) {
    return null;
  }

  if (position === PLAN_TREE_DROP_POSITION.ROOT_END) {
    const rootIds = getPlanTreeChildrenIds(nodesById, roots, null, rootAnchorId);
    const withoutSource = rootIds.filter((id) => id !== normalizedSourceId);

    return {
      targetId: null,
      position: PLAN_TREE_DROP_POSITION.ROOT_END,
      parentId: null,
      index: withoutSource.length,
    };
  }

  const normalizedTargetId = String(targetId ?? "").trim();
  const targetNode = nodesById.get(normalizedTargetId);

  if (!targetNode) {
    return null;
  }

  if (position === PLAN_TREE_DROP_POSITION.INSIDE) {
    const childIds = (targetNode.children || []).map((child) => child.id);
    const withoutSource = childIds.filter((id) => id !== normalizedSourceId);

    return {
      targetId: normalizedTargetId,
      position: PLAN_TREE_DROP_POSITION.INSIDE,
      parentId: normalizedTargetId,
      index: withoutSource.length,
    };
  }

  const parentId = targetNode.parentId ?? null;
  const siblingIds = getPlanTreeChildrenIds(nodesById, roots, parentId, rootAnchorId);
  const targetIndex = siblingIds.indexOf(normalizedTargetId);

  if (targetIndex === -1) {
    return null;
  }

  let index =
    position === PLAN_TREE_DROP_POSITION.BEFORE ? targetIndex : targetIndex + 1;

  const sourceNode = nodesById.get(normalizedSourceId);
  const sourceParentId = sourceNode?.parentId ?? null;

  if ((sourceParentId ?? null) === (parentId ?? null)) {
    const sourceIndex = siblingIds.indexOf(normalizedSourceId);

    if (sourceIndex !== -1 && sourceIndex < index) {
      index -= 1;
    }
  }

  return {
    targetId: normalizedTargetId,
    position,
    parentId,
    index: Math.max(0, index),
  };
}

/**
 * @param {string} sourceId
 * @param {PlanTreeDropDescriptor | null | undefined} descriptor
 * @param {Map<string, object>} nodesById
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePlanTreeDrop(sourceId, descriptor, nodesById) {
  const normalizedSourceId = String(sourceId ?? "").trim();

  if (!normalizedSourceId || !descriptor) {
    return { valid: false, reason: "missing" };
  }

  const { position, targetId, parentId } = descriptor;

  if (position === PLAN_TREE_DROP_POSITION.INSIDE) {
    if (!parentId || parentId === normalizedSourceId) {
      return { valid: false, reason: "self" };
    }

    if (isPlanTreeDescendant(nodesById, normalizedSourceId, parentId)) {
      return { valid: false, reason: "cycle" };
    }

    return { valid: true };
  }

  if (position === PLAN_TREE_DROP_POSITION.ROOT_END) {
    return { valid: true };
  }

  const normalizedTargetId = String(targetId ?? "").trim();

  if (!normalizedTargetId || normalizedTargetId === normalizedSourceId) {
    return { valid: false, reason: "self" };
  }

  if (isPlanTreeDescendant(nodesById, normalizedSourceId, normalizedTargetId)) {
    return { valid: false, reason: "cycle" };
  }

  return { valid: true };
}

/**
 * @param {PlanTreeDropDescriptor} descriptor
 * @param {Map<string, object>} nodesById
 * @param {string | null | undefined} [rootAnchorId]
 * @returns {number}
 */
export function resolvePlanTreeDropInsertDepth(descriptor, nodesById, rootAnchorId = null) {
  if (!descriptor || descriptor.position === PLAN_TREE_DROP_POSITION.INSIDE) {
    return 0;
  }

  const normalizedAnchorId = String(rootAnchorId ?? "").trim();
  const parentId = descriptor.parentId ?? null;
  const isRootLevel =
    parentId == null ||
    (normalizedAnchorId && String(parentId) === normalizedAnchorId);

  if (isRootLevel) {
    return 0;
  }

  const targetNode = descriptor.targetId ? nodesById.get(descriptor.targetId) : null;

  if (targetNode && Number.isFinite(targetNode.depth)) {
    return targetNode.depth;
  }

  const parentNode = nodesById.get(String(parentId));
  return parentNode && Number.isFinite(parentNode.depth) ? parentNode.depth + 1 : 0;
}

/**
 * @param {Object} params
 * @param {string} params.sourceId
 * @param {string | null} [params.targetId]
 * @param {"before" | "after" | "inside" | "root-end"} params.position
 * @param {Map<string, object>} params.nodesById
 * @param {Array<{ id: string, children?: Array<{ id: string }> }>} params.roots
 * @param {string | null | undefined} [params.rootAnchorId]
 * @returns {(PlanTreeDropDescriptor & { sourceId: string, insertDepth: number }) | null}
 */
export function resolvePlanTreeDropDescriptor({
  sourceId,
  targetId = null,
  position,
  nodesById,
  roots,
  rootAnchorId = null,
}) {
  const descriptor = buildPlanTreeMoveDescriptor({
    sourceId,
    targetId,
    position,
    nodesById,
    roots,
    rootAnchorId,
  });

  if (!descriptor) {
    return null;
  }

  const validation = validatePlanTreeDrop(sourceId, descriptor, nodesById);

  if (!validation.valid) {
    return null;
  }

  return {
    ...descriptor,
    sourceId: String(sourceId ?? "").trim(),
    insertDepth: resolvePlanTreeDropInsertDepth(descriptor, nodesById, rootAnchorId),
  };
}
