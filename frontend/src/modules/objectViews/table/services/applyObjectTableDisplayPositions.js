import { buildRowNumbers } from "../../../../shared/table/buildRowNumbers";

/**
 * Attaches dynamic display positions to visible table rows (after filter/sort/tree).
 *
 * @param {object} params
 * @param {import("../../../../shared/viewEngine/contracts").ViewEngineRow[]} params.rows
 * @param {import("../../../../shared/viewEngine/contracts").ViewEngineRow[]} [params.sourceRows]
 * @param {boolean} [params.treeEnabled]
 * @param {Map<string, string>} [params.parentByChild]
 */
export function applyObjectTableDisplayPositions({
  rows = [],
  sourceRows = [],
  treeEnabled = false,
  parentByChild = new Map(),
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const numberingRows = treeEnabled
    ? (Array.isArray(sourceRows) && sourceRows.length ? sourceRows : safeRows)
    : safeRows;

  const positionByRowId = buildRowNumbers({
    rows: numberingRows,
    mode: treeEnabled ? "tree" : "flat",
    getParentId: treeEnabled
      ? (row) => parentByChild.get(String(row?.id ?? "")) ?? null
      : undefined,
  });

  return safeRows.map((row) => {
    const positionNumber = positionByRowId[String(row.id)] || "";

    return {
      ...row,
      positionNumber,
      displayPosition: positionNumber,
    };
  });
}
