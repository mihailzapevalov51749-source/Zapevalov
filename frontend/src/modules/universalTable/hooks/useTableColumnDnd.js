import { useState } from "react";

const SYSTEM_ROW_NUMBER_COLUMN_ID = "__row_number";
const PRIMARY_COLUMN_TITLE = "название";

const SYSTEM_COLUMN_IDS = [
  "__row_number",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
];

const getColumnId = (column) => String(column?.id ?? column?.key ?? "");

const normalizeTitle = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
};

const isRowNumberColumn = (column) => {
  return (
    getColumnId(column) === SYSTEM_ROW_NUMBER_COLUMN_ID ||
    String(column?.type || "").toLowerCase() ===
      "system_row_number"
  );
};

const isSystemColumn = (column) => {
  const columnType = String(column?.type || "").toLowerCase();

  return Boolean(
    column?.system ||
      column?.isSystem ||
      column?.is_system ||
      columnType === "system_row_number" ||
      SYSTEM_COLUMN_IDS.includes(getColumnId(column))
  );
};

const isExplicitPrimaryColumn = (column) => {
  return Boolean(
    column?.is_primary ||
      column?.isPrimary ||
      column?.settings?.is_primary ||
      column?.settings?.isPrimary
  );
};

const isTitlePrimaryColumn = (column) => {
  return (
    !isSystemColumn(column) &&
    normalizeTitle(column?.title || column?.name) ===
      PRIMARY_COLUMN_TITLE
  );
};

const getPrimaryDataColumn = (columns = []) => {
  return (
    columns.find((column) =>
      isExplicitPrimaryColumn(column)
    ) ||
    columns.find((column) =>
      isTitlePrimaryColumn(column)
    ) ||
    columns.find((column) => !isSystemColumn(column)) ||
    null
  );
};

const isPrimaryDataColumn = (column, columns = []) => {
  const primaryColumn = getPrimaryDataColumn(columns);

  if (!primaryColumn) return false;

  return (
    getColumnId(primaryColumn) ===
    getColumnId(column)
  );
};

const getUniqueColumnsById = (columns = []) => {
  if (!Array.isArray(columns)) return [];

  const seen = new Set();

  return columns.filter((column) => {
    const columnId = getColumnId(column);

    if (!columnId || seen.has(columnId)) {
      return false;
    }

    seen.add(columnId);

    return true;
  });
};

const enforceColumnOrderRules = (columns = []) => {
  const safeColumns = getUniqueColumnsById(columns);

  if (!safeColumns.length) return [];

  const primaryColumn =
    getPrimaryDataColumn(safeColumns);

  const primaryColumnId = primaryColumn
    ? getColumnId(primaryColumn)
    : "";

  if (!primaryColumnId) return safeColumns;

  const primaryIndex = safeColumns.findIndex(
    (column) =>
      getColumnId(column) === primaryColumnId
  );

  if (primaryIndex <= 0) return safeColumns;

  const rowNumberColumn = safeColumns.find((column) =>
    isRowNumberColumn(column)
  );

  const rowNumberColumnId = rowNumberColumn
    ? getColumnId(rowNumberColumn)
    : "";

  const columnsBeforePrimary = safeColumns.slice(
    0,
    primaryIndex
  );

  const invalidColumnsBeforePrimary =
    columnsBeforePrimary.filter((column) => {
      const columnId = getColumnId(column);

      return columnId !== rowNumberColumnId;
    });

  if (!invalidColumnsBeforePrimary.length) {
    return safeColumns;
  }

  const invalidColumnIds = new Set(
    invalidColumnsBeforePrimary.map((column) =>
      getColumnId(column)
    )
  );

  const withoutInvalidBeforePrimary =
    safeColumns.filter(
      (column) =>
        !invalidColumnIds.has(getColumnId(column))
    );

  const nextPrimaryIndex =
    withoutInvalidBeforePrimary.findIndex(
      (column) =>
        getColumnId(column) === primaryColumnId
    );

  return [
    ...withoutInvalidBeforePrimary.slice(
      0,
      nextPrimaryIndex + 1
    ),

    ...invalidColumnsBeforePrimary,

    ...withoutInvalidBeforePrimary.slice(
      nextPrimaryIndex + 1
    ),
  ];
};

const moveColumn = ({
  sourceColumnId,
  targetColumnId,
  dropPosition = "before",
  columns = [],
}) => {
  const sourceId = String(sourceColumnId || "");
  const targetId = String(targetColumnId || "");

  const safeColumns = getUniqueColumnsById(columns);

  if (!sourceId || !targetId) return safeColumns;
  if (sourceId === targetId) return safeColumns;

  const sourceColumn = safeColumns.find(
    (column) => getColumnId(column) === sourceId
  );

  if (!sourceColumn) return safeColumns;

  const withoutSource = safeColumns.filter(
    (column) => getColumnId(column) !== sourceId
  );

  const targetIndex = withoutSource.findIndex(
    (column) => getColumnId(column) === targetId
  );

  if (targetIndex < 0) return safeColumns;

  const insertIndex =
    dropPosition === "after"
      ? targetIndex + 1
      : targetIndex;

  return [
    ...withoutSource.slice(0, insertIndex),

    sourceColumn,

    ...withoutSource.slice(insertIndex),
  ];
};

const buildFullColumnOrderAfterMove = ({
  allColumns = [],
  visibleColumns = [],

  sourceColumnId,
  targetColumnId,

  dropPosition = "before",
}) => {
  const sourceId = String(sourceColumnId || "");
  const targetId = String(targetColumnId || "");

  const fullColumns = getUniqueColumnsById(
    Array.isArray(allColumns) && allColumns.length
      ? allColumns
      : visibleColumns
  );

  if (!fullColumns.length) return [];

  const movedFullColumns = moveColumn({
    sourceColumnId: sourceId,
    targetColumnId: targetId,
    dropPosition,
    columns: fullColumns,
  });

  const correctedFullColumns =
    enforceColumnOrderRules(movedFullColumns);

  return normalizeIds(
    correctedFullColumns.map((column) =>
      getColumnId(column)
    )
  );
};

const canDropColumnByRules = ({
  sourceColumn,
  targetColumn,
  allColumns = [],
}) => {
  if (!sourceColumn || !targetColumn) return false;

  const sourceId = getColumnId(sourceColumn);
  const targetId = getColumnId(targetColumn);

  if (!sourceId || !targetId) return false;
  if (sourceId === targetId) return false;

  const sourceIsPrimary =
    isPrimaryDataColumn(sourceColumn, allColumns);

  const targetIsPrimary =
    isPrimaryDataColumn(targetColumn, allColumns);

  const sourceIsRowNumber =
    isRowNumberColumn(sourceColumn);

  const targetIsRowNumber =
    isRowNumberColumn(targetColumn);

  if (sourceIsPrimary) return false;

  if (targetIsPrimary && !sourceIsRowNumber) {
    return false;
  }

  if (targetIsRowNumber) return false;

  return true;
};

export default function useTableColumnDnd({
  handleStartDragColumn,
  handleDragOverColumn,
  handleDropColumn,

  visibleColumnsWithSystem = [],
  allColumnsWithSystem = [],

  setLocalColumnOrder,
  requestTableHeightReport,

  onColumnOrderChanged,
}) {
  const [draggedColumnId, setDraggedColumnId] =
    useState(null);

  const effectiveAllColumns =
    Array.isArray(allColumnsWithSystem) &&
    allColumnsWithSystem.length
      ? allColumnsWithSystem
      : visibleColumnsWithSystem;

  const getColumnById = (columnId) => {
    const normalizedColumnId = String(
      columnId || ""
    );

    return (
      effectiveAllColumns.find(
        (column) =>
          getColumnId(column) ===
          normalizedColumnId
      ) || null
    );
  };

  const handleStartDragColumnWithSystem = (
    columnId
  ) => {
    const normalizedColumnId = String(
      columnId || ""
    );

    if (!normalizedColumnId) return;

    const sourceColumn =
      getColumnById(normalizedColumnId);

    if (!sourceColumn) return;

    if (
      isPrimaryDataColumn(
        sourceColumn,
        effectiveAllColumns
      )
    ) {
      return;
    }

    setDraggedColumnId(normalizedColumnId);

    handleStartDragColumn?.(normalizedColumnId);
  };

  const handleDragOverColumnWithSystem = (
    event,
    targetColumnId
  ) => {
    const normalizedSourceId = String(
      event?.dataTransfer?.getData?.(
        "text/plain"
      ) ||
        draggedColumnId ||
        ""
    );

    const normalizedTargetId = String(
      targetColumnId || ""
    );

    const sourceColumn =
      getColumnById(normalizedSourceId);

    const targetColumn =
      getColumnById(normalizedTargetId);

    const canDrop = canDropColumnByRules({
      sourceColumn,
      targetColumn,
      allColumns: effectiveAllColumns,
    });

    if (!canDrop) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    handleDragOverColumn?.(
      event,
      targetColumnId
    );
  };

  const handleDropColumnWithSystem = async (
    targetColumnId,
    sourceColumnId,
    dropPosition = "before"
  ) => {
    const normalizedSourceId = String(
      sourceColumnId ||
        draggedColumnId ||
        ""
    );

    const normalizedTargetId = String(
      targetColumnId || ""
    );

    setDraggedColumnId(null);

    if (
      !normalizedSourceId ||
      !normalizedTargetId
    ) {
      return null;
    }

    if (
      normalizedSourceId === normalizedTargetId
    ) {
      return null;
    }

    const sourceColumn =
      getColumnById(normalizedSourceId);

    const targetColumn =
      getColumnById(normalizedTargetId);

    const canDrop = canDropColumnByRules({
      sourceColumn,
      targetColumn,
      allColumns: effectiveAllColumns,
    });

    if (!canDrop) return null;

    const nextFullOrder =
      buildFullColumnOrderAfterMove({
        allColumns: effectiveAllColumns,
        visibleColumns: visibleColumnsWithSystem,

        sourceColumnId: normalizedSourceId,
        targetColumnId: normalizedTargetId,

        dropPosition,
      });

    setLocalColumnOrder?.(nextFullOrder);

    onColumnOrderChanged?.(nextFullOrder);

    const result = await handleDropColumn?.({
      sourceColumnId: normalizedSourceId,
      targetColumnId: normalizedTargetId,
      dropPosition,

      visibleColumns:
        visibleColumnsWithSystem,

      allColumns: effectiveAllColumns,

      nextColumnOrder: nextFullOrder,
    });

    requestTableHeightReport?.();

    return result;
  };

  const clearDraggedColumn = () => {
    setDraggedColumnId(null);
  };

  return {
    draggedColumnId,
    setDraggedColumnId,

    handleStartDragColumnWithSystem,
    handleDragOverColumnWithSystem,
    handleDropColumnWithSystem,

    clearDraggedColumn,
  };
}