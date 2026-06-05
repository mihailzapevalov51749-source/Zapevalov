/**
 * Flattens visible table rows into tree display order (DFS), with hierarchy metadata on each row.
 *
 * @typedef {object} HierarchyRowMeta
 * @property {number} level
 * @property {boolean} hasChildren
 * @property {boolean} isExpanded
 * @property {string} hierarchyNumber
 */

/**
 * @param {object} params
 * @param {import("../../../../shared/viewEngine/contracts").ViewEngineRow[]} params.flatRows
 * @param {Map<string, string>} params.parentByChild
 * @param {Map<string, string[]>} params.childrenByParent
 * @param {Set<string>} params.expandedRowIds
 */
export function buildObjectTableHierarchyDisplayRows({
  flatRows,
  parentByChild,
  childrenByParent,
  expandedRowIds,
}) {
  const safeRows = Array.isArray(flatRows) ? flatRows : [];
  const rowById = new Map(safeRows.map((row) => [String(row.id), row]));
  const rowIds = new Set(rowById.keys());
  const flatOrder = new Map(safeRows.map((row, index) => [String(row.id), index]));

  const sortChildIds = (childIds) =>
    [...childIds].sort(
      (a, b) => (flatOrder.get(a) ?? 0) - (flatOrder.get(b) ?? 0),
    );

  /** @type {import("../../../../shared/viewEngine/contracts").ViewEngineRow[]} */
  const displayRows = [];
  const placed = new Set();
  let rootCounter = 0;

  const hasChildrenOnPage = (id) =>
    (childrenByParent.get(id) || []).some((childId) => rowIds.has(childId));

  const hasChildrenGlobally = (id) =>
    (childrenByParent.get(id) || []).length > 0;

  function walk(row, level, hierarchyNumber) {
    const id = String(row.id);

    if (placed.has(id)) {
      return;
    }

    placed.add(id);

    displayRows.push({
      ...row,
      hierarchy: {
        level,
        hierarchyNumber,
        hasChildren: hasChildrenGlobally(id),
        hasChildrenOnPage: hasChildrenOnPage(id),
        isExpanded: expandedRowIds.has(id),
      },
    });

    if (!expandedRowIds.has(id)) {
      return;
    }

    const childIds = sortChildIds(
      (childrenByParent.get(id) || []).filter((childId) => rowIds.has(childId)),
    );

    childIds.forEach((childId, childIndex) => {
      const childRow = rowById.get(childId);

      if (childRow) {
        walk(childRow, level + 1, `${hierarchyNumber}.${childIndex + 1}`);
      }
    });
  }

  const roots = safeRows.filter((row) => {
    const id = String(row.id);
    const parentId = parentByChild.get(id);

    return !parentId || !rowIds.has(parentId);
  });

  roots
    .sort((a, b) => (flatOrder.get(String(a.id)) ?? 0) - (flatOrder.get(String(b.id)) ?? 0))
    .forEach((row) => {
      rootCounter += 1;
      walk(row, 0, String(rootCounter));
    });

  for (const row of safeRows) {
    const id = String(row.id);

    if (placed.has(id)) {
      continue;
    }

    const parentId = parentByChild.get(id);

    if (parentId && rowIds.has(parentId)) {
      continue;
    }

    rootCounter += 1;

    displayRows.push({
      ...row,
      hierarchy: {
        level: 0,
        hierarchyNumber: String(rootCounter),
        hasChildren: hasChildrenGlobally(id),
        hasChildrenOnPage: hasChildrenOnPage(id),
        isExpanded: false,
      },
    });
    placed.add(id);
  }

  return displayRows;
}
