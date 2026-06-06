/**
 * Parent row ids that can be expanded in the current flat row set.
 *
 * @param {{
 *   childrenByParent?: Map<string, string[]>,
 *   flatRowIds?: string[],
 * }} params
 */
export function resolveExpandableHierarchyRowIds({
  childrenByParent = new Map(),
  flatRowIds = [],
} = {}) {
  const rowIdSet = new Set(
    (Array.isArray(flatRowIds) ? flatRowIds : [])
      .map((id) => String(id))
      .filter((id) => id.trim() !== ""),
  );

  if (!rowIdSet.size || !(childrenByParent instanceof Map)) {
    return [];
  }

  const expandableRowIds = [];

  for (const [parentId, childIds] of childrenByParent.entries()) {
    const normalizedParentId = String(parentId ?? "").trim();

    if (!normalizedParentId) {
      continue;
    }

    const children = Array.isArray(childIds) ? childIds : [];

    if (!children.length) {
      continue;
    }

    const hasChildOnPage = children.some((childId) =>
      rowIdSet.has(String(childId)),
    );

    if (hasChildOnPage) {
      expandableRowIds.push(normalizedParentId);
    }
  }

  return expandableRowIds;
}
