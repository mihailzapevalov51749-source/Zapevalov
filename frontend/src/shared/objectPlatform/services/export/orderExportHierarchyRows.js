import { applyObjectTableDisplayPositions } from "../../../../modules/objectViews/table/services/applyObjectTableDisplayPositions.js";
import { buildObjectTableHierarchyDisplayRows } from "../../../../modules/objectViews/table/services/buildObjectTableHierarchyDisplayRows.js";
import { resolveExpandableHierarchyRowIds } from "../../../../modules/objectViews/table/services/resolveExpandableHierarchyRowIds.js";
import { isTableRowNumberPresentationFieldKey } from "../../../runtime/systemEntityFields.js";

export const EXPORT_HIERARCHY_NUMBER_COLUMN_KEY = "__export_hierarchy_number__";

/**
 * Tree order for export — same algorithm as Object Table, but all parents expanded.
 *
 * @param {{
 *   flatRows?: import("../../../viewEngine/contracts").ViewEngineRow[],
 *   parentByChild?: Map<string, string>,
 *   childrenByParent?: Map<string, string[]>,
 * }} params
 */
export function orderFlatRowsForHierarchyExport({
  flatRows = [],
  parentByChild = new Map(),
  childrenByParent = new Map(),
}) {
  const safeRows = Array.isArray(flatRows) ? flatRows : [];
  const flatRowIds = safeRows.map((row) => String(row.id));

  const expandableRowIds = resolveExpandableHierarchyRowIds({
    childrenByParent,
    flatRowIds,
  });

  const displayRows = buildObjectTableHierarchyDisplayRows({
    flatRows: safeRows,
    parentByChild,
    childrenByParent,
    expandedRowIds: new Set(expandableRowIds),
  });

  return applyObjectTableDisplayPositions({
    rows: displayRows,
    sourceRows: displayRows,
    treeEnabled: true,
    parentByChild,
  });
}

/**
 * @param {Array<Record<string, unknown>>} exportColumns
 * @param {boolean} treeEnabled
 */
export function buildExportColumnsWithHierarchy(exportColumns = [], treeEnabled = false) {
  if (!treeEnabled) {
    return exportColumns;
  }

  const columns = Array.isArray(exportColumns) ? exportColumns : [];
  const hierarchyColumn = {
    key: EXPORT_HIERARCHY_NUMBER_COLUMN_KEY,
    label: "Иерархия",
    type: "text",
    visible: true,
    isSystem: true,
    fieldDef: null,
  };

  const rowNumberIndex = columns.findIndex((column) =>
    isTableRowNumberPresentationFieldKey(column?.key),
  );

  if (rowNumberIndex < 0) {
    return [hierarchyColumn, ...columns];
  }

  return [
    ...columns.slice(0, rowNumberIndex + 1),
    hierarchyColumn,
    ...columns.slice(rowNumberIndex + 1),
  ];
}
