import { useEffect, useState } from "react";

import {
  getTable,
  getTableByBlock,
  createTableForBlock,
  createTableRow,
  updateTableRow,
  deleteTableRow,
  updateTable,
} from "../services/tableApi";

import useTableColumns from "./useTableColumns";

const DEFAULT_TABLE_TITLE = "Таблица";

const DEFAULT_TABLE_SETTINGS = {
  show_title: true,
  filters: [],
};

const getInitialValueByColumn = (column) => {
  const type = column?.type;

  if (type === "lookup") return { rowId: null };
  if (type === "file") return [];
  if (type === "boolean") return false;
  if (type === "user") return null;
  if (type === "choice" && column?.multiple) return [];

  return "";
};

const getRowParentId = (row) => {
  return row?.parent_id ?? row?.parentId ?? row?.parent_row_id ?? null;
};

const normalizeParentId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
};

const isSameParent = (a, b) => {
  return normalizeParentId(a) === normalizeParentId(b);
};

const isEmptyTitle = (value) => {
  return !value || String(value).trim().length === 0;
};

const isDefaultTableTitle = (value) => {
  return String(value || "").trim() === DEFAULT_TABLE_TITLE;
};

const resolveInitialTableTitle = ({ blockTitle, initialTableTitle }) => {
  const fromInitial = String(initialTableTitle || "").trim();
  if (fromInitial) return fromInitial;

  const fromBlock = String(blockTitle || "").trim();
  if (fromBlock) return fromBlock;

  return DEFAULT_TABLE_TITLE;
};

const normalizeFilters = (filters) => {
  if (!Array.isArray(filters)) return [];

  return filters
    .filter((filter) => filter)
    .map((filter) => ({
      ...filter,
      key: String(filter.key ?? filter.id ?? `filter_${Date.now()}`),
      label: filter.label || filter.name || "Без названия",
      conditions: Array.isArray(filter.conditions) ? filter.conditions : [],
      isQuick: Boolean(filter.isQuick),
      isDefault: Boolean(filter.isDefault),
    }));
};

const normalizeSystemColumnLookup = (lookup) => {
  if (!lookup || typeof lookup !== "object") {
    return {
      sourceTableId: null,
      displayColumnId: null,
      showAvatar: true,
    };
  }

  return {
    sourceTableId: lookup.sourceTableId ? Number(lookup.sourceTableId) : null,
    displayColumnId: lookup.displayColumnId
      ? Number(lookup.displayColumnId)
      : null,
    showAvatar: lookup.showAvatar !== false,
  };
};

const normalizeTable = (tableData) => {
  if (!tableData) return tableData;

  const settings = {
    ...DEFAULT_TABLE_SETTINGS,
    ...(tableData.settings || {}),
  };

  const rawSystemColumns =
    settings.system_columns && typeof settings.system_columns === "object"
      ? settings.system_columns
      : {};

  const systemColumns = Object.fromEntries(
    Object.entries(rawSystemColumns).map(([columnId, columnSettings]) => [
      columnId,
      {
        ...(columnSettings || {}),
        lookup: normalizeSystemColumnLookup(columnSettings?.lookup),
      },
    ])
  );

  return {
    ...tableData,
    settings: {
      ...settings,
      filters: normalizeFilters(settings.filters),
      system_columns: systemColumns,
    },
  };
};

const getMaxPosition = (rows = []) => {
  if (!rows.length) return -1;
  return Math.max(...rows.map((row) => Number(row?.position ?? 0)));
};

const sortRowsByPosition = (rows = []) => {
  return [...rows].sort((a, b) => {
    const positionA = Number(a?.position ?? 0);
    const positionB = Number(b?.position ?? 0);

    if (positionA !== positionB) return positionA - positionB;

    return Number(a?.id ?? 0) - Number(b?.id ?? 0);
  });
};

export default function useUniversalTable({
  tableId,
  blockId,
  blockTitle,
  initialTableTitle,
}) {
  const [table, setTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);

  const handleToggleAddColumn = () => {
    setIsAddColumnOpen((prev) => !prev);
  };

  const handleCancelAddColumn = () => {
    setIsAddColumnOpen(false);
  };

  const applyInitialTableTitleIfNeeded = async (tableData) => {
    if (!tableData?.id) return tableData;

    const settings = tableData.settings || {};
    const alreadyInitialized = Boolean(settings.title_initialized_from_block);

    const nextTitle = resolveInitialTableTitle({
      blockTitle,
      initialTableTitle,
    });

    const shouldSetInitialTitle =
      !alreadyInitialized &&
      !isEmptyTitle(nextTitle) &&
      (isEmptyTitle(tableData.title) || isDefaultTableTitle(tableData.title));

    if (!shouldSetInitialTitle) return tableData;

    try {
      const updated = await updateTable(tableData.id, {
        title: nextTitle,
        settings: {
          ...settings,
          title_initialized_from_block: true,
        },
      });

      return updated || tableData;
    } catch {
      return {
        ...tableData,
        title: nextTitle,
        settings: {
          ...settings,
          title_initialized_from_block: true,
        },
      };
    }
  };

  const loadTable = async () => {
    try {
      setIsLoading(true);
      setError("");

      let tableData = null;

      if (tableId) {
        tableData = await getTable(tableId);
      } else if (blockId) {
        try {
          tableData = await getTableByBlock(blockId);
        } catch {
          tableData = await createTableForBlock(blockId);
        }
      }

      tableData = await applyInitialTableTitleIfNeeded(tableData);
      tableData = normalizeTable(tableData);

      setTable(tableData);
      setColumns(tableData?.columns || []);
      setRows(tableData?.rows || []);
    } catch (err) {
      console.error(err);
      setError("Ошибка загрузки таблицы");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTable();
  }, [tableId, blockId, blockTitle, initialTableTitle]);

  const handleUpdateTableTitle = async (title) => {
    if (!table?.id) return;

    const nextTitle = String(title || "").trim();

    const updated = await updateTable(table.id, {
      title: nextTitle || DEFAULT_TABLE_TITLE,
      settings: {
        ...(table.settings || {}),
        title_initialized_from_block: true,
      },
    });

    setTable(normalizeTable(updated));
  };

  const handleSaveFiltersToSettings = async (filters) => {
    if (!table?.id) return;

    const nextFilters = normalizeFilters(filters);

    const nextSettings = {
      ...(table.settings || {}),
      filters: nextFilters,
    };

    try {
      const updated = await updateTable(table.id, {
        settings: nextSettings,
      });

      setTable(normalizeTable(updated));
    } catch (err) {
      console.error("Ошибка сохранения фильтров", err);
    }
  };

  const handleSaveSystemColumnSettings = async (
    systemColumnId,
    settingsPatch = {}
  ) => {
    if (!table?.id || !systemColumnId) return null;

    const currentSettings = table?.settings || {};
    const currentSystemColumns = currentSettings.system_columns || {};
    const currentColumnSettings = currentSystemColumns[systemColumnId] || {};

    const nextLookup =
      settingsPatch.lookup && typeof settingsPatch.lookup === "object"
        ? normalizeSystemColumnLookup(settingsPatch.lookup)
        : normalizeSystemColumnLookup(currentColumnSettings.lookup);

    const nextSystemColumns = {
      ...currentSystemColumns,
      [systemColumnId]: {
        ...currentColumnSettings,
        ...settingsPatch,
        lookup: nextLookup,
      },
    };

    const nextSettings = {
      ...currentSettings,
      system_columns: nextSystemColumns,
    };

    try {
      const updated = await updateTable(table.id, {
        settings: nextSettings,
      });

      const normalized = normalizeTable(updated);
      setTable(normalized);

      return normalized;
    } catch (err) {
      console.error("Ошибка сохранения системной колонки", err);
      return null;
    }
  };

  const buildInitialRowValues = (title = "") => {
    const values = {};

    columns.forEach((column) => {
      values[column.id] = getInitialValueByColumn(column);
    });

    const firstColumnId = columns[0]?.id;

    if (firstColumnId && title) {
      values[firstColumnId] = title;
    }

    return values;
  };

  const handleAddRow = async ({ position = "bottom" } = {}) => {
    if (!table?.id) return null;

    const normalizedPosition = position === "top" ? "top" : "bottom";
    const values = buildInitialRowValues();

    const newRowPosition =
      normalizedPosition === "top" ? 0 : getMaxPosition(rows) + 1;

    const newRow = await createTableRow(table.id, {
      values,
      position: newRowPosition,
    });

    setRows((prev) => {
      if (normalizedPosition === "top") {
        const shiftedRows = prev.map((row) => ({
          ...row,
          position: Number(row?.position ?? 0) + 1,
        }));

        return [newRow, ...shiftedRows];
      }

      return [...prev, newRow];
    });

    return newRow;
  };

  const handleAddSubtask = async (parentRow) => {
    if (!table?.id || !parentRow?.id) return null;

    const values = buildInitialRowValues("Новая подзадача");

    const newRow = await createTableRow(table.id, {
      values,
      parent_id: parentRow.id,
      position: getMaxPosition(rows) + 1,
    });

    setRows((prev) => [...prev, newRow]);

    return newRow;
  };

  const collectRowAndChildrenIds = (targetIds) => {
    const idsToDelete = new Set(targetIds.map(String));
    let changed = true;

    while (changed) {
      changed = false;

      rows.forEach((row) => {
        const parentId = getRowParentId(row);

        if (
          parentId &&
          idsToDelete.has(String(parentId)) &&
          !idsToDelete.has(String(row.id))
        ) {
          idsToDelete.add(String(row.id));
          changed = true;
        }
      });
    }

    return Array.from(idsToDelete);
  };

  const collectDescendantIds = (sourceRowId, sourceRows = rows) => {
    const result = new Set();
    let changed = true;

    while (changed) {
      changed = false;

      sourceRows.forEach((row) => {
        const rowId = String(row?.id);
        const parentId = normalizeParentId(getRowParentId(row));

        if (
          parentId &&
          (parentId === String(sourceRowId) || result.has(parentId)) &&
          !result.has(rowId)
        ) {
          result.add(rowId);
          changed = true;
        }
      });
    }

    return result;
  };

  const handleDeleteRows = async (rowIds) => {
    const ids = Array.isArray(rowIds) ? rowIds : [rowIds];
    const idsToDelete = collectRowAndChildrenIds(ids);

    await Promise.all(idsToDelete.map((id) => deleteTableRow(id)));

    setRows((prev) =>
      prev.filter((row) => !idsToDelete.includes(String(row.id)))
    );
  };

  const handleDeleteRow = async (row) => {
    if (!row?.id) return;
    await handleDeleteRows([row.id]);
  };

  const handleCellChange = async (rowId, columnId, value) => {
    const row = rows.find((r) => String(r.id) === String(rowId));
    if (!row) return;

    const updatedValues = {
      ...row.values,
      [columnId]: value,
    };

    const updated = await updateTableRow(rowId, {
      values: updatedValues,
    });

    setRows((prev) =>
      prev.map((r) => (String(r.id) === String(rowId) ? updated : r))
    );
  };

  const handleRowValuesChange = async (rowId, values) => {
    const updated = await updateTableRow(rowId, { values });

    setRows((prev) =>
      prev.map((r) => (String(r.id) === String(rowId) ? updated : r))
    );

    return updated;
  };

  const handleMoveRow = async ({ sourceRowId, targetRowId, position }) => {
    const normalizedSourceRowId = String(sourceRowId || "");
    const normalizedTargetRowId = String(targetRowId || "");
    const normalizedPosition = ["top", "bottom", "inside"].includes(position)
      ? position
      : "inside";

    if (!normalizedSourceRowId || !normalizedTargetRowId) return null;
    if (normalizedSourceRowId === normalizedTargetRowId) return null;

    const sourceRow = rows.find(
      (row) => String(row.id) === normalizedSourceRowId
    );
    const targetRow = rows.find(
      (row) => String(row.id) === normalizedTargetRowId
    );

    if (!sourceRow || !targetRow) return null;

    const descendantIds = collectDescendantIds(normalizedSourceRowId, rows);

    if (descendantIds.has(normalizedTargetRowId)) {
      return null;
    }

    const nextParentId =
      normalizedPosition === "inside"
        ? targetRow.id
        : getRowParentId(targetRow);

    const siblings = sortRowsByPosition(
      rows.filter((row) => {
        if (String(row.id) === normalizedSourceRowId) return false;
        return isSameParent(getRowParentId(row), nextParentId);
      })
    );

    let insertIndex = siblings.length;

    if (normalizedPosition !== "inside") {
      const targetIndex = siblings.findIndex(
        (row) => String(row.id) === normalizedTargetRowId
      );

      if (targetIndex >= 0) {
        insertIndex =
          normalizedPosition === "top" ? targetIndex : targetIndex + 1;
      }
    }

    const nextSiblings = [...siblings];
    const movedRow = {
      ...sourceRow,
      parent_id: nextParentId,
      parentId: nextParentId,
    };

    nextSiblings.splice(insertIndex, 0, movedRow);

    const rowsToUpdate = nextSiblings.map((row, index) => ({
      ...row,
      parent_id: nextParentId,
      parentId: nextParentId,
      position: index,
    }));

    const previousRows = rows;

    setRows((prev) => {
      const updatesById = new Map(
        rowsToUpdate.map((row) => [String(row.id), row])
      );

      return prev.map((row) => {
        const updated = updatesById.get(String(row.id));
        return updated || row;
      });
    });

    try {
      const updatedRows = await Promise.all(
        rowsToUpdate.map((row) =>
          updateTableRow(row.id, {
            parent_id: nextParentId,
            position: row.position,
          })
        )
      );

      setRows((prev) => {
        const updatedById = new Map(
          updatedRows.map((row) => [String(row.id), row])
        );

        return prev.map((row) => updatedById.get(String(row.id)) || row);
      });

      return updatedRows;
    } catch (err) {
      console.error("Ошибка перемещения строки", err);
      setRows(previousRows);
      return null;
    }
  };

  const columnApi = useTableColumns({
    table,
    columns,
    setColumns,
  });

  return {
    table,
    columns,
    rows,

    isLoading,
    error,

    isAddColumnOpen,
    handleToggleAddColumn,
    handleCancelAddColumn,

    handleUpdateTableTitle,
    handleSaveFiltersToSettings,
    handleSaveSystemColumnSettings,

    handleAddRow,
    handleAddSubtask,
    handleDeleteRows,
    handleDeleteRow,
    handleCellChange,
    handleRowValuesChange,
    handleMoveRow,

    reloadTable: loadTable,

    ...columnApi,
  };
}