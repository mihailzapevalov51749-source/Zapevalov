export const PLAN_TREE_ROOT_ANCHOR_MARKER = "__plan_tree_root__";

/**
 * @param {string | null | undefined} parentId
 * @param {string | null | undefined} rootAnchorId
 * @returns {string | null}
 */
export function resolveEffectivePlanTreeParentId(parentId, rootAnchorId) {
  const normalizedParentId = String(parentId ?? "").trim();

  if (normalizedParentId) {
    return normalizedParentId;
  }

  const normalizedAnchorId = String(rootAnchorId ?? "").trim();
  return normalizedAnchorId || null;
}

/**
 * @param {Object} params
 * @param {Map<string, string>} params.parentByChild
 * @param {Map<string, string[]>} params.childrenByParent
 * @param {Map<string, object>} params.entitiesById
 * @param {string | null | undefined} [params.rootAnchorId]
 * @returns {string[]}
 */
export function resolvePlanTreeRootIds({
  parentByChild,
  childrenByParent,
  entitiesById,
  rootAnchorId,
}) {
  const normalizedAnchorId = String(rootAnchorId ?? "").trim();

  if (normalizedAnchorId && childrenByParent.has(normalizedAnchorId)) {
    return [...(childrenByParent.get(normalizedAnchorId) || [])].filter(
      (id) => id !== normalizedAnchorId,
    );
  }

  const allChildIds = new Set(parentByChild.keys());
  const allEntityIds = new Set([...entitiesById.keys(), ...allChildIds]);

  return [...allEntityIds].filter((id) => {
    if (id === normalizedAnchorId) {
      return false;
    }

    return !parentByChild.has(id);
  });
}

/**
 * @param {string | null | undefined} title
 * @returns {boolean}
 */
export function isPlanTreeRootAnchorTitle(title) {
  const normalized = String(title ?? "").trim();

  if (!normalized) {
    return false;
  }

  return (
    normalized === PLAN_TREE_ROOT_ANCHOR_MARKER ||
    normalized.startsWith(`${PLAN_TREE_ROOT_ANCHOR_MARKER}#`) ||
    normalized.startsWith(`${PLAN_TREE_ROOT_ANCHOR_MARKER}::`)
  );
}
