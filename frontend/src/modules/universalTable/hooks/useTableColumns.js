import { useEffect, useRef, useState } from "react";

import {
  createTableColumn,
  updateTableColumn,
  deleteTableColumn,
} from "../services/tableApi";

import {
  normalizeAlign,
  normalizeOptions,
  normalizeLookup,
} from "../services/tableUtils";

const DEFAULT_COLUMN_WIDTH = 180;
const SYSTEM_ROW_NUMBER_COLUMN_ID = "__row_number";
const PRIMARY_COLUMN_TITLE = "Название";

const MULTIPLE_SUPPORTED_TYPES = ["choice", "user"];

const normalizeTitle = (value) => {
  return String(value || "").trim().toLowerCase();
};

const safeNormalizeLookup = (lookup) => {
  const normalized = normalizeLookup(lookup || {});

  return {
    sourceTableId: normalized?.sourceTableId
      ? Number(normalized.sourceTableId)
      : null,

    displayColumnId: normalized?.displayColumnId
      ? Number(normalized.displayColumnId)
      : null,

    showAvatar: normalized?.showAvatar !== false,
    showTime: normalized?.showTime === true,
    showDateHint: normalized?.showDateHint !== false,
  };
};

const getColumnId = (column) => {
  return String(column?.id ?? column?.key ?? "");
};

const getColumnSystemKey = (column) => {
  return String(column?.system_key ?? column?.systemKey ?? "").trim();
};

const isSystemColumnId = (columnId) => {
  return String(columnId) === SYSTEM_ROW_NUMBER_COLUMN_ID;
};

const isSystemColumn = (column) => {
  return (
    isSystemColumnId(getColumnId(column)) ||
    Boolean(getColumnSystemKey(column)) ||
    column?.isSystem === true ||
    column?.is_system === true ||
    column?.system === true ||
    String(column?.type || "") === "system_row_number"
  );
};

const isExplicitPrimaryColumn = (column) => {
  return Boolean(
    getColumnSystemKey(column) === "title" ||
      column?.is_primary === true ||
      column?.isPrimary === true ||
      column?.settings?.is_primary === true ||
      column?.settings?.isPrimary === true
  );
};

const isTitlePrimaryColumn = (column) => {
  return (
    !isSystemColumn(column) &&
    normalizeTitle(column?.title || column?.name) ===
      normalizeTitle(PRIMARY_COLUMN_TITLE)
  );
};

const getPrimaryColumn = (columns = []) => {
  return (
    columns.find((column) => isExplicitPrimaryColumn(column)) ||
    columns.find((column) => isTitlePrimaryColumn(column)) ||
    columns.find((column) => !isSystemColumn(column)) ||
    null
  );
};

const isPrimaryColumn = (column, columns = []) => {
  if (!column) return false;

  const primaryColumn = getPrimaryColumn(columns);
  if (!primaryColumn) return false;

  return getColumnId(primaryColumn) === getColumnId(column);
};

const isValidColumnOrder = (nextColumns = []) => {
  const primaryColumn = getPrimaryColumn(nextColumns);
  if (!primaryColumn) return true;

  const primaryColumnId = getColumnId(primaryColumn);

  const primaryIndex = nextColumns.findIndex(
    (column) => getColumnId(column) === primaryColumnId
  );

  if (primaryIndex <= 0) return true;

  const beforePrimary = nextColumns.slice(0, primaryIndex);

  return beforePrimary.every((column) => isSystemColumnId(getColumnId(column)));
};

const moveColumnInList = (columns = [], sourceColumnId, targetColumnId) => {
  const sourceId = String(sourceColumnId || "");
  const targetId = String(targetColumnId || "");

  if (!sourceId || !targetId || sourceId === targetId) return columns;

  const sourceIndex = columns.findIndex(
    (column) => getColumnId(column) === sourceId
  );

  const targetIndex = columns.findIndex(
    (column) => getColumnId(column) === targetId
  );

  if (sourceIndex < 0 || targetIndex < 0) return columns;

  const nextColumns = [...columns];
  const [movedColumn] = nextColumns.splice(sourceIndex, 1);
  nextColumns.splice(targetIndex, 0, movedColumn);

  return nextColumns;
};

export default function useTableColumns({ table, columns = [], setColumns }) {
  const draggedColumnIdRef = useRef(null);
  const primaryCreationInProgressRef = useRef(false);
  const primaryCreationTableIdRef = useRef(null);

  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const [newColumnRequired, setNewColumnRequired] = useState(false);
  const [newColumnOptions, setNewColumnOptions] = useState([]);
  const [newColumnMultiple, setNewColumnMultiple] = useState(false);
  const [newColumnAlign, setNewColumnAlign] = useState("left");
  const [newColumnLookup, setNewColumnLookup] = useState({});
  const [openedColumnMenuId, setOpenedColumnMenuId] = useState(null);

  const resetNewColumnDraft = () => {
    setNewColumnTitle("");
    setNewColumnType("text");
    setNewColumnRequired(false);
    setNewColumnOptions([]);
    setNewColumnMultiple(false);
    setNewColumnAlign("left");
    setNewColumnLookup({});
  };

  useEffect(() => {
    const ensurePrimaryColumn = async () => {
      if (!table?.id) return;

      const tableId = String(table.id);
      const hasUserColumns = columns.some((column) => !isSystemColumn(column));

      if (hasUserColumns) return;
      if (primaryCreationInProgressRef.current) return;
      if (primaryCreationTableIdRef.current === tableId) return;

      try {
        primaryCreationInProgressRef.current = true;
        primaryCreationTableIdRef.current = tableId;

        const column = await createTableColumn(table.id, {
          title: PRIMARY_COLUMN_TITLE,
          type: "text",
          system_key: "title",
          width: DEFAULT_COLUMN_WIDTH,
          required: true,
          options: [],
          multiple: false,
          align: "left",
          lookup: {},
          position: 0,
          settings: {
            is_primary: true,
            lock_position: true,
            lock_visibility: true,
            lock_delete: true,
          },
        });

        setColumns?.((prev) => {
          const alreadyHasUserColumns = prev.some(
            (item) => !isSystemColumn(item)
          );

          if (alreadyHasUserColumns) return prev;

          return [column, ...prev];
        });
      } catch (error) {
        console.error("Ошибка создания основного поля таблицы", error);
        primaryCreationTableIdRef.current = null;
      } finally {
        primaryCreationInProgressRef.current = false;
      }
    };

    ensurePrimaryColumn();
  }, [table?.id, columns, setColumns]);

  const handleAddColumn = async () => {
    if (!table?.id || !newColumnTitle.trim()) return null;

    const backendColumns = columns.filter((column) => !isSystemColumn(column));

    const column = await createTableColumn(table.id, {
      title: newColumnTitle.trim(),
      type: newColumnType,
      system_key: null,
      width: DEFAULT_COLUMN_WIDTH,
      required: newColumnRequired,
      options: normalizeOptions(newColumnOptions),

      multiple: MULTIPLE_SUPPORTED_TYPES.includes(newColumnType)
        ? Boolean(newColumnMultiple)
        : false,

      align: normalizeAlign(newColumnAlign),
      lookup: safeNormalizeLookup(newColumnLookup),
      position: backendColumns.length,
    });

    setColumns?.((prev) => [...prev, column]);

    setIsAddColumnOpen(false);
    resetNewColumnDraft();

    return column;
  };

  const handleDeleteColumn = async (columnId) => {
    if (!columnId || isSystemColumnId(columnId)) return false;

    const targetColumn = columns.find(
      (column) => getColumnId(column) === String(columnId)
    );

    if (isPrimaryColumn(targetColumn, columns)) return false;

    await deleteTableColumn(columnId);

    setColumns?.((prev) =>
      prev.filter((column) => String(column.id) !== String(columnId))
    );

    return true;
  };

  const updateColumn = async (columnId, patch) => {
    if (!columnId || isSystemColumnId(columnId)) return null;

    const targetColumn = columns.find(
      (column) => getColumnId(column) === String(columnId)
    );

    const safePatch = { ...(patch || {}) };

    if (getColumnSystemKey(targetColumn)) {
      delete safePatch.system_key;
      delete safePatch.systemKey;
    }

    if (safePatch.lookup && typeof safePatch.lookup === "object") {
      safePatch.lookup = safeNormalizeLookup(safePatch.lookup);
    }

    if (
      "type" in safePatch &&
      !MULTIPLE_SUPPORTED_TYPES.includes(safePatch.type)
    ) {
      safePatch.multiple = false;
    }

    if ("multiple" in safePatch) {
      safePatch.multiple = Boolean(safePatch.multiple);
    }

    const updated = await updateTableColumn(columnId, safePatch);

    setColumns?.((prev) =>
      prev.map((column) =>
        String(column.id) === String(columnId) ? updated : column
      )
    );

    return updated;
  };

  const handleStartDragColumn = (sourceColumnId) => {
    draggedColumnIdRef.current = sourceColumnId;
  };

  const handleDragOverColumn = (event) => {
    event?.preventDefault?.();
  };

  const handleDropColumn = async ({
    sourceColumnId,
    targetColumnId,
    visibleColumns,
    setVisibleColumnOrder,
  } = {}) => {
    const resolvedSourceColumnId =
      sourceColumnId || draggedColumnIdRef.current;

    draggedColumnIdRef.current = null;

    if (
      !resolvedSourceColumnId ||
      !targetColumnId ||
      String(resolvedSourceColumnId) === String(targetColumnId)
    ) {
      return null;
    }

    const currentVisibleColumns = Array.isArray(visibleColumns)
      ? visibleColumns
      : columns;

    const sourceColumn = currentVisibleColumns.find(
      (column) => getColumnId(column) === String(resolvedSourceColumnId)
    );

    const targetColumn = currentVisibleColumns.find(
      (column) => getColumnId(column) === String(targetColumnId)
    );

    if (!sourceColumn || !targetColumn) return null;

    const sourceIsSystem = isSystemColumn(sourceColumn);
    const targetIsSystem = isSystemColumn(targetColumn);
    const sourceIsPrimary = isPrimaryColumn(sourceColumn, currentVisibleColumns);
    const targetIsPrimary = isPrimaryColumn(targetColumn, currentVisibleColumns);

    if (sourceIsPrimary) return null;
    if (targetIsPrimary && !sourceIsSystem) return null;

    const nextVisibleColumns = moveColumnInList(
      currentVisibleColumns,
      resolvedSourceColumnId,
      targetColumnId
    );

    if (!isValidColumnOrder(nextVisibleColumns)) {
      return null;
    }

    const nextVisibleColumnOrder = nextVisibleColumns.map((column) =>
      getColumnId(column)
    );

    setVisibleColumnOrder?.(nextVisibleColumnOrder);

    if (sourceIsSystem || targetIsSystem) {
      return {
        visibleColumns: nextVisibleColumns,
        savedToBackend: false,
      };
    }

    const nextBackendColumns = nextVisibleColumns.filter(
      (column) => !isSystemColumn(column)
    );

    await Promise.all(
      nextBackendColumns.map((column, index) =>
        updateTableColumn(column.id, {
          position: index,
        })
      )
    );

    setColumns?.((prev) => {
      const visibleColumnIds = new Set(
        nextBackendColumns.map((column) => String(column.id))
      );

      const untouchedColumns = prev.filter(
        (column) => !visibleColumnIds.has(String(column.id))
      );

      return [...nextBackendColumns, ...untouchedColumns];
    });

    return {
      visibleColumns: nextVisibleColumns,
      savedToBackend: true,
    };
  };

  const handleToggleAddColumn = () => {
    setIsAddColumnOpen((prev) => !prev);
  };

  const handleCancelAddColumn = () => {
    setIsAddColumnOpen(false);
    resetNewColumnDraft();
  };

  const closeColumnMenu = () => {
    setOpenedColumnMenuId(null);
  };

  const openColumnMenu = (id) => {
    setOpenedColumnMenuId(id);
  };

  return {
    isAddColumnOpen,
    newColumnTitle,
    newColumnType,
    newColumnRequired,
    newColumnOptions,
    newColumnMultiple,
    newColumnAlign,
    newColumnLookup,
    openedColumnMenuId,

    setNewColumnTitle,
    setNewColumnType,
    setNewColumnRequired,
    setNewColumnOptions,
    setNewColumnMultiple,
    setNewColumnAlign,
    setNewColumnLookup,

    handleToggleAddColumn,
    handleCancelAddColumn,

    openColumnMenu,
    closeColumnMenu,

    handleAddColumn,
    handleDeleteColumn,
    updateColumn,

    handleStartDragColumn,
    handleDragOverColumn,
    handleDropColumn,
  };
}