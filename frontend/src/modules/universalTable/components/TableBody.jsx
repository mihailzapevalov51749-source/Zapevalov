import { useMemo } from "react";

import TableRow from "./TableRow";
import { buildRowNumbers } from "../services/tableViewUtils";

const getRowParentId = (row) => {
  return row?.parent_id ?? row?.parentId ?? row?.parent_row_id ?? null;
};

const buildTreeRows = (rows = []) => {
  const childrenByParentId = new Map();
  const rootRows = [];
  const rowIds = new Set(rows.map((row) => String(row?.id)));

  rows.forEach((row) => {
    const parentId = getRowParentId(row);
    const normalizedParentId =
      parentId === null || parentId === undefined || parentId === ""
        ? null
        : String(parentId);

    if (!normalizedParentId || !rowIds.has(normalizedParentId)) {
      rootRows.push(row);
      return;
    }

    if (!childrenByParentId.has(normalizedParentId)) {
      childrenByParentId.set(normalizedParentId, []);
    }

    childrenByParentId.get(normalizedParentId).push(row);
  });

  return {
    rootRows,
    childrenByParentId,
  };
};

const hasExpandedChildren = ({ row, childrenByParentId, expandedRowIds }) => {
  const rowId = String(row?.id);
  const children = childrenByParentId.get(rowId) || [];

  return children.length > 0 && expandedRowIds?.has(rowId);
};

export default function TableBody({
  rows = [],
  columns = [],
  selectedRowIds = [],
  tableGridTemplateColumns,
  fullTableMinWidth,
  onToggleRowSelection,
  onCellChange,
  onOpenRowCard,
  onAddSubtask,
  onDeleteRow,
  onMoveRow,
  isInlineEditMode = false,

  expandedRowIds = new Set(),
  onToggleRowExpanded,

  numberingMode = "tree",

  createdRowFocusRequest = null,
}) {
  const { rootRows, childrenByParentId } = useMemo(() => {
    return buildTreeRows(rows);
  }, [rows]);

  const rowNumbers = useMemo(() => {
    return buildRowNumbers({
      rows,
      mode: numberingMode,
      separator: ".",
    });
  }, [rows, numberingMode]);

  if (!rows.length) return null;

  const handleToggleExpand = (rowId) => {
    onToggleRowExpanded?.(rowId);
  };

  const handleAddSubtask = async (row) => {
    return await onAddSubtask?.(row);
  };

  const handleMoveRow = (payload) => {
    onMoveRow?.(payload);
  };

  const renderRow = (row, level = 0) => {
    const rowId = String(row.id);
    const children = childrenByParentId.get(rowId) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedRowIds?.has(rowId);
    const isSelected = selectedRowIds.some(
      (selectedRowId) => String(selectedRowId) === rowId
    );

    return (
      <TableRow
        key={row.id}
        row={row}
        columns={columns}
        isSelected={isSelected}
        tableGridTemplateColumns={tableGridTemplateColumns}
        fullTableMinWidth={fullTableMinWidth}
        onToggleRowSelection={onToggleRowSelection}
        onCellChange={onCellChange}
        onOpenRowCard={onOpenRowCard}
        isInlineEditMode={isInlineEditMode}
        isExpanded={Boolean(isExpanded)}
        hasChildren={hasChildren}
        level={level}
        positionNumber={rowNumbers[rowId] || ""}
        onToggleExpand={handleToggleExpand}
        onAddSubtask={handleAddSubtask}
        onDeleteRow={onDeleteRow}
        onMoveRow={handleMoveRow}
        shouldFocusFirstCell={
          String(createdRowFocusRequest?.rowId || "") === rowId &&
          createdRowFocusRequest?.focusFirstCell !== false
        }
      />
    );
  };

  const renderTreeGroup = (row, level = 0) => {
    const rowId = String(row.id);
    const children = childrenByParentId.get(rowId) || [];
    const isExpanded = expandedRowIds?.has(rowId);
    const shouldStickyParent = hasExpandedChildren({
      row,
      childrenByParentId,
      expandedRowIds,
    });

    if (!shouldStickyParent) {
      return (
        <div key={rowId}>
          {renderRow(row, level)}

          {children.length > 0 &&
            isExpanded &&
            children.map((childRow) => renderTreeGroup(childRow, level + 1))}
        </div>
      );
    }

    return (
      <div
        key={rowId}
        style={{
          position: "relative",
          width: fullTableMinWidth,
          minWidth: fullTableMinWidth,
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30 + level,
            width: fullTableMinWidth,
            minWidth: fullTableMinWidth,
            background: "#ffffff",
            boxShadow: "0 1px 0 #e2e8f0, 0 6px 14px rgba(15, 23, 42, 0.08)",
          }}
        >
          {renderRow(row, level)}
        </div>

        {children.map((childRow) => renderTreeGroup(childRow, level + 1))}
      </div>
    );
  };

  return (
    <div
      style={{
        width: fullTableMinWidth,
        minWidth: fullTableMinWidth,
        position: "relative",
      }}
    >
      {rootRows.map((row) => renderTreeGroup(row, 0))}
    </div>
  );
}