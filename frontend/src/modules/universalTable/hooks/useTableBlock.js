import { useEffect, useMemo, useRef, useState } from "react";

import {
  createTableForBlock,
  getTableByBlock,
  createTableColumn,
  updateTableColumn,
  deleteTableColumn,
  createTableRow,
  updateTableRow,
  deleteTableRow,
  updateTable,
  getLookupOptions,
} from "../services/tableApi";

import {
  normalizeAlign,
  normalizeOptions,
  normalizeLookup,
} from "../services/tableUtils";

const DEFAULT_COLUMN_WIDTH = 180;

const getInitialValueByColumnType = (type) => {
  if (type === "lookup") return { rowId: null };
  if (type === "file") return [];
  if (type === "boolean") return false;
  return "";
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
  };
};

export default function useTableBlock({ block, onBlockUpdated }) {
  const draggedColumnIdRef = useRef(null);
  const loadRequestRef = useRef({ key: "", seq: 0 });

  const beginLoadRequest = (blockId) => {
    const key =
      blockId != null && blockId !== "" ? `block:${blockId}` : "";
    const nextSeq = loadRequestRef.current.seq + 1;

    loadRequestRef.current = { key, seq: nextSeq };

    return { key, seq: nextSeq };
  };

  const isStaleLoadRequest = (request) => {
    if (!request?.key) {
      return true;
    }

    const current = loadRequestRef.current;

    return current.key !== request.key || current.seq !== request.seq;
  };

  const [table, setTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const [newColumnRequired, setNewColumnRequired] = useState(false);
  const [newColumnOptions, setNewColumnOptions] = useState([]);
  const [newColumnAlign, setNewColumnAlign] = useState("left");
  const [newColumnLookup, setNewColumnLookup] = useState({});

  const [openedColumnMenuId, setOpenedColumnMenuId] = useState(null);
  const [draggedColumnId, setDraggedColumnId] = useState(null);

  const enrichColumnsWithLookupDisplayMap = async (rawColumns = []) => {
    const safeColumns = Array.isArray(rawColumns) ? rawColumns : [];

    return Promise.all(
      safeColumns.map(async (column) => {
        const normalizedColumn = {
          ...column,
          align: normalizeAlign(column?.align),
          options: normalizeOptions(column?.options),
          lookup: safeNormalizeLookup(column?.lookup),
        };

        if (normalizedColumn.type !== "lookup") return normalizedColumn;

        const sourceTableId = normalizedColumn?.lookup?.sourceTableId;
        const displayColumnId = normalizedColumn?.lookup?.displayColumnId;

        if (!sourceTableId || !displayColumnId) return normalizedColumn;

        try {
          const options = await getLookupOptions(sourceTableId, displayColumnId);
          const displayMap = {};

          if (Array.isArray(options)) {
            options.forEach((option) => {
              if (option?.row_id === null || option?.row_id === undefined) {
                return;
              }

              displayMap[String(option.row_id)] =
                option.label || `Строка ${option.row_id}`;
            });
          }

          return {
            ...normalizedColumn,
            lookup: {
              ...(normalizedColumn.lookup || {}),
              displayMap,
            },
          };
        } catch (err) {
          console.error("Ошибка загрузки displayMap для lookup:", err);
          return normalizedColumn;
        }
      })
    );
  };

  const normalizeTable = async (tableData, request) => {
    const rawColumns = Array.isArray(tableData?.columns)
      ? tableData.columns
      : [];

    const enrichedColumns = await enrichColumnsWithLookupDisplayMap(rawColumns);

    if (isStaleLoadRequest(request)) {
      return;
    }

    setTable(tableData);
    setColumns(enrichedColumns);
    setRows(Array.isArray(tableData?.rows) ? tableData.rows : []);
  };

  const loadTable = async () => {
    if (!block?.id) return;

    const request = beginLoadRequest(block.id);

    try {
      setIsLoading(true);
      setError("");
      setTable(null);
      setColumns([]);
      setRows([]);

      let tableData;

      try {
        tableData = await getTableByBlock(block.id);
      } catch {
        if (isStaleLoadRequest(request)) {
          return;
        }

        tableData = await createTableForBlock(block.id);
      }

      if (isStaleLoadRequest(request)) {
        return;
      }

      await normalizeTable(tableData, request);

      if (isStaleLoadRequest(request)) {
        return;
      }

      if (tableData?.id && block?.content?.table_id !== tableData.id) {
        onBlockUpdated?.({
          ...block,
          content: {
            ...(block.content || {}),
            table_id: tableData.id,
          },
        });
      }
    } catch (err) {
      if (isStaleLoadRequest(request)) {
        return;
      }

      console.error("Ошибка загрузки таблицы:", err);
      setError("Не удалось загрузить таблицу");
    } finally {
      if (!isStaleLoadRequest(request)) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadTable();
  }, [block?.id]);

  const gridTemplateColumns = useMemo(() => {
    return columns
      .map((column) => `${column.width || DEFAULT_COLUMN_WIDTH}px`)
      .join(" ");
  }, [columns]);

  const tableMinWidth = useMemo(() => {
    return columns.reduce(
      (sum, column) => sum + (column.width || DEFAULT_COLUMN_WIDTH),
      0
    );
  }, [columns]);

  const handleUpdateTableTitle = async (title) => {
    if (!table?.id) return;

    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      const updated = await updateTable(table.id, {
        title: trimmed,
      });

      setTable(updated);
    } catch (err) {
      console.error("Ошибка обновления названия таблицы:", err);
      setError("Не удалось обновить название таблицы");
    }
  };

  const resetNewColumnForm = () => {
    setNewColumnTitle("");
    setNewColumnType("text");
    setNewColumnRequired(false);
    setNewColumnOptions([]);
    setNewColumnAlign("left");
    setNewColumnLookup({});
  };

  const closeAddColumnMenu = () => {
    resetNewColumnForm();
    setIsAddColumnOpen(false);
  };

  const handleToggleAddColumn = () => {
    setOpenedColumnMenuId(null);

    setIsAddColumnOpen((current) => {
      if (current) {
        resetNewColumnForm();
        return false;
      }

      return true;
    });
  };

  const handleCancelAddColumn = () => {
    closeAddColumnMenu();
  };

  const handleAddColumn = async (extra = {}) => {
    const title = newColumnTitle.trim();

    if (!title || !table?.id) return null;

    const columnType = extra.type || newColumnType || "text";
    const columnAlign = normalizeAlign(extra.align || newColumnAlign);

    const columnOptions =
      columnType === "choice"
        ? normalizeOptions(extra.options || newColumnOptions)
        : [];

    const lookupPayload =
      columnType === "lookup"
        ? safeNormalizeLookup(extra.lookup || newColumnLookup)
        : {};

    try {
      const newColumn = await createTableColumn(table.id, {
        title,
        type: columnType,
        required: Boolean(newColumnRequired),
        width: DEFAULT_COLUMN_WIDTH,
        options: columnOptions,
        align: columnAlign,
        lookup: lookupPayload,
      });

      const enrichedColumns = await enrichColumnsWithLookupDisplayMap([
        newColumn,
      ]);

      const finalColumn = enrichedColumns[0] || {
        ...newColumn,
        align: columnAlign,
      };

      setColumns((prev) => [...prev, finalColumn]);

      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          values: {
            ...(row.values || {}),
            [String(newColumn.id)]: getInitialValueByColumnType(columnType),
          },
        }))
      );

      closeAddColumnMenu();
      return finalColumn;
    } catch (err) {
      console.error("Ошибка создания столбца:", err);
      setError("Не удалось создать столбец");
      return null;
    }
  };

  const updateColumn = async (columnId, patch = {}) => {
    try {
      const normalizedPatch = { ...patch };

      if ("align" in patch) {
        normalizedPatch.align = normalizeAlign(patch.align);
      }

      if ("options" in patch) {
        normalizedPatch.options =
          patch.type === "choice" ? normalizeOptions(patch.options) : [];
      }

      if ("lookup" in patch) {
        normalizedPatch.lookup =
          patch.type === "lookup" ? safeNormalizeLookup(patch.lookup) : {};
      }

      const updatedColumn = await updateTableColumn(columnId, normalizedPatch);

      const enrichedColumns = await enrichColumnsWithLookupDisplayMap([
        updatedColumn,
      ]);

      const finalColumn = enrichedColumns[0] || updatedColumn;

      setColumns((prev) =>
        prev.map((column) =>
          String(column.id) === String(columnId) ? finalColumn : column
        )
      );

      return finalColumn;
    } catch (err) {
      console.error("Ошибка обновления столбца:", err);
      setError("Не удалось обновить столбец");
      return null;
    }
  };

  const resetDragColumn = () => {
    draggedColumnIdRef.current = null;
    setDraggedColumnId(null);
  };

  const handleStartDragColumn = (columnId) => {
    if (!columnId) return;

    const normalizedColumnId = String(columnId);

    draggedColumnIdRef.current = normalizedColumnId;
    setDraggedColumnId(normalizedColumnId);
  };

  const handleDragOverColumn = () => {};

  const handleDropColumn = async (targetColumnId) => {
    const currentDraggedColumnId = draggedColumnIdRef.current || draggedColumnId;

    if (!currentDraggedColumnId || !targetColumnId) return;

    const sourceId = String(currentDraggedColumnId);
    const targetId = String(targetColumnId);

    if (sourceId === targetId) {
      resetDragColumn();
      return;
    }

    const sourceIndex = columns.findIndex(
      (column) => String(column.id) === sourceId
    );

    const targetIndex = columns.findIndex(
      (column) => String(column.id) === targetId
    );

    if (sourceIndex < 0 || targetIndex < 0) {
      resetDragColumn();
      return;
    }

    if (sourceIndex === 0 || targetIndex === 0) {
      resetDragColumn();
      return;
    }

    const nextColumns = [...columns];
    const [movedColumn] = nextColumns.splice(sourceIndex, 1);

    const nextTargetIndex =
      sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;

    nextColumns.splice(nextTargetIndex, 0, movedColumn);

    const columnsWithPositions = nextColumns.map((column, index) => ({
      ...column,
      position: index,
    }));

    const enrichedColumns = await enrichColumnsWithLookupDisplayMap(
      columnsWithPositions
    );

    setColumns(enrichedColumns);

    try {
      await Promise.all(
        columnsWithPositions.map((column) =>
          updateTableColumn(column.id, { position: column.position })
        )
      );
    } catch (err) {
      console.error("Ошибка изменения порядка столбцов:", err);
      setError("Не удалось изменить порядок столбцов");
      await loadTable();
    } finally {
      resetDragColumn();
    }
  };

  const handleAddRow = async () => {
    if (!table?.id) return null;

    try {
      const initialValues = {};

      columns.forEach((column) => {
        initialValues[String(column.id)] = getInitialValueByColumnType(
          column.type
        );
      });

      const newRow = await createTableRow(table.id, {
        values: initialValues,
      });

      setRows((prev) => [...prev, newRow]);
      return newRow;
    } catch (err) {
      console.error("Ошибка создания строки:", err);
      setError("Не удалось создать строку");
      return null;
    }
  };

  const handleRowValuesChange = async (rowId, nextValues = {}) => {
    const normalizedRowId = String(rowId);

    const currentRow = rows.find((row) => String(row.id) === normalizedRowId);

    if (!currentRow) return null;

    const normalizedValues = {
      ...(currentRow.values || {}),
      ...(nextValues || {}),
    };

    const optimisticRow = {
      ...currentRow,
      values: normalizedValues,
    };

    setRows((prev) =>
      prev.map((row) =>
        String(row.id) === normalizedRowId ? optimisticRow : row
      )
    );

    try {
      const updatedRow = await updateTableRow(rowId, {
        values: normalizedValues,
      });

      setRows((prev) =>
        prev.map((row) =>
          String(row.id) === normalizedRowId ? updatedRow : row
        )
      );

      return updatedRow;
    } catch (err) {
      console.error("Ошибка обновления строки:", err);
      setError("Не удалось сохранить строку");

      setRows((prev) =>
        prev.map((row) =>
          String(row.id) === normalizedRowId ? currentRow : row
        )
      );

      return null;
    }
  };

  const handleCellChange = async (rowId, columnId, value) => {
    const columnKey = String(columnId);

    return handleRowValuesChange(rowId, {
      [columnKey]: value,
    });
  };

  const handleDeleteColumn = async (columnId) => {
    const confirmed = window.confirm("Удалить столбец?");
    if (!confirmed) return false;

    try {
      await deleteTableColumn(columnId);

      setColumns((prev) =>
        prev.filter((column) => String(column.id) !== String(columnId))
      );

      setRows((prev) =>
        prev.map((row) => {
          const nextValues = { ...(row.values || {}) };
          delete nextValues[String(columnId)];

          return {
            ...row,
            values: nextValues,
          };
        })
      );

      setOpenedColumnMenuId(null);
      return true;
    } catch (err) {
      console.error("Ошибка удаления столбца:", err);
      setError("Не удалось удалить столбец");
      return false;
    }
  };

  const handleDeleteRows = async (rowIds = []) => {
    const normalizedRowIds = rowIds
      .filter(Boolean)
      .map((rowId) => String(rowId));

    if (normalizedRowIds.length === 0) return false;

    const confirmed = window.confirm(
      normalizedRowIds.length === 1
        ? "Удалить выбранную строку?"
        : `Удалить выбранные строки: ${normalizedRowIds.length}?`
    );

    if (!confirmed) return false;

    try {
      await Promise.all(normalizedRowIds.map((rowId) => deleteTableRow(rowId)));

      setRows((prev) =>
        prev.filter((row) => !normalizedRowIds.includes(String(row.id)))
      );

      return true;
    } catch (err) {
      console.error("Ошибка удаления строк:", err);
      setError("Не удалось удалить выбранные строки");
      return false;
    }
  };

  const closeColumnMenu = () => {
    setOpenedColumnMenuId(null);
  };

  const openColumnMenu = (columnId) => {
    closeAddColumnMenu();

    setOpenedColumnMenuId((current) =>
      String(current) === String(columnId) ? null : columnId
    );
  };

  return {
    table,

    columns,
    rows,
    gridTemplateColumns,
    tableMinWidth,

    isLoading,
    error,

    isAddColumnOpen,
    newColumnTitle,
    newColumnType,
    newColumnRequired,
    newColumnOptions,
    newColumnAlign,

    newColumnLookup,
    setNewColumnLookup,

    openedColumnMenuId,

    setNewColumnTitle,
    setNewColumnType,
    setNewColumnRequired,
    setNewColumnOptions,
    setNewColumnAlign,

    updateColumn,

    handleToggleAddColumn,
    handleCancelAddColumn,
    handleAddColumn,
    handleAddRow,
    handleCellChange,
    handleRowValuesChange,
    handleDeleteColumn,
    handleDeleteRows,

    handleStartDragColumn,
    handleDragOverColumn,
    handleDropColumn,

    handleUpdateTableTitle,

    closeColumnMenu,
    openColumnMenu,

    reloadTable: loadTable,
  };
}