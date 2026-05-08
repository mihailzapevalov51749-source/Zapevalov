import { useEffect, useMemo, useRef, useState } from "react";

import UniversalTableTopBar from "./UniversalTableTopBar";
import UniversalTableState from "./UniversalTableState";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import TableToolbar from "./TableToolbar";
import EntityCardModal from "./entityCard/EntityCardModal";
import TableFiltersModal from "./TableFiltersModal";

import useUniversalTable from "../hooks/useUniversalTable";
import useRowSelection from "../hooks/useRowSelection";
import useColumnResize from "../hooks/useColumnResize";
import useColumnMenus from "../hooks/useColumnMenus";
import useTableRows from "../hooks/useTableRows";
import useTableRowCard, {
  normalizeRowCardSettings,
} from "../hooks/useTableRowCard";
import useTableAutoHeight from "../hooks/useTableAutoHeight";
import useUniversalTableLayout from "../hooks/useUniversalTableLayout";
import useUniversalTableEvents from "../hooks/useUniversalTableEvents";
import useUniversalTableActions from "../hooks/useUniversalTableActions";
import useSavedTableFilters from "../hooks/useSavedTableFilters";
import useTableDataProcessing from "../hooks/useTableDataProcessing";
import useTableColumnVisibility from "../hooks/useTableColumnVisibility";
import useCreatedRowFocus from "../hooks/useCreatedRowFocus";
import useTableColumnSorting from "../hooks/useTableColumnSorting";
import useTableColumnDnd from "../hooks/useTableColumnDnd";

import {
  tableViewRootStyle,
  tableViewScrollWrapperStyle,
  getTableViewInnerStyle,
  getTableViewBodyScrollStyle,
} from "../styles/tableStyles";

import { normalizeAlign, normalizeOptions } from "../services/tableUtils";
import { normalizeSavedFilter } from "../services/tableFilterUtils";

const noop = () => {};
const noopAsync = async () => null;

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

const getColumnId = (column) => String(column?.id ?? column?.key ?? "").trim();

const normalizeColumn = (column = {}) => {
  const normalizedId = getColumnId(column);

  return {
    ...column,
    id: normalizedId,
    key: normalizedId,
  };
};

const normalizeColumns = (columns = []) => {
  return Array.isArray(columns) ? columns.map(normalizeColumn) : [];
};

const getPersistentRowNumber = (row) => {
  return (
    row?.number ??
    row?.system_number ??
    row?.systemNumber ??
    row?.row_number ??
    row?.rowNumber ??
    row?.id ??
    ""
  );
};

const isQuickFilter = (filter) => {
  return Boolean(
    filter?.isQuick ??
      filter?.isQuickFilter ??
      filter?.is_quick ??
      filter?.quick ??
      false
  );
};

export default function UniversalTableView({
  block,
  tableId,
  blockId,
  isEditMode,
  onEdit,
  onBlockUpdated,
  tableRepresentationProps = {},
}) {
  const resolvedBlockId = blockId || block?.id || null;
  const bodyScrollRef = useRef(null);

  const canEditColumns = Boolean(isEditMode);

  const {
    tableViewState,
    onToggleColumnVisibility,
  } = tableRepresentationProps || {};

  const [isInlineEditMode, setIsInlineEditMode] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);
  const [activeConditions, setActiveConditions] = useState([]);

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [filtersModalMode, setFiltersModalMode] = useState("create");
  const [editingFilter, setEditingFilter] = useState(null);

  const [forcedVisibleRowIds, setForcedVisibleRowIds] = useState(new Set());
  const [isRepresentationDirty, setIsRepresentationDirty] = useState(false);

  const {
    activeSort,
    setActiveSort,
    sortDirection,
    setSortDirection,
    sortRules,
    setSortRules,
    handleToggleColumnSort,
  } = useTableColumnSorting();

  const tableState = useUniversalTable({
    tableId,
    blockId: resolvedBlockId,
    blockTitle: block?.title,
    initialTableTitle: block?.content?.initial_table_title,
  });

  const {
    table,
    columns = [],
    rows = [],
    isLoading,
    error,

    isAddColumnOpen = false,
    newColumnTitle = "",
    newColumnType = "text",
    newColumnRequired = false,
    newColumnOptions = [],
    newColumnMultiple = false,
    newColumnAlign = "left",
    newColumnLookup = {},

    openedColumnMenuId = null,

    setNewColumnTitle = noop,
    setNewColumnType = noop,
    setNewColumnRequired = noop,
    setNewColumnOptions = noop,
    setNewColumnMultiple = noop,
    setNewColumnAlign = noop,
    setNewColumnLookup = noop,

    updateColumn = noopAsync,

    handleCancelAddColumn = noop,
    handleToggleAddColumn = noop,
    handleAddColumn = noopAsync,
    handleAddRow = noopAsync,
    handleAddSubtask = noopAsync,
    handleCellChange = noopAsync,
    handleRowValuesChange = noopAsync,
    handleMoveRow = noopAsync,
    handleDeleteColumn = noopAsync,
    handleDeleteRows = noopAsync,
    handleDeleteRow = noopAsync,
    handleUpdateTableTitle = noopAsync,
    handleSaveFiltersToSettings = noopAsync,
    handleSaveSystemColumnSettings = noopAsync,

    closeColumnMenu = noop,
    openColumnMenu = noop,

    handleStartDragColumn = noop,
    handleDragOverColumn = noop,
    handleDropColumn = noopAsync,
  } = tableState || {};

  const handleMarkDirty = () => {
    if (!resolvedBlockId) return;

    setIsRepresentationDirty(true);
    window.__UNIVERSAL_TABLE_DIRTY__ = true;

    window.dispatchEvent(
      new CustomEvent("universal-table:mark-dirty", {
        detail: {
          blockId: resolvedBlockId,
          tableId: table?.id || tableId || null,
        },
      })
    );
  };

  const {
    SYSTEM_ROW_NUMBER_COLUMN_ID,
    columnsWithSystem,
    visibleColumnsWithSystem,

    columnOrder,

    hiddenColumnIds,

    setHiddenColumnIds,
    setColumnOrder,

    setLocalColumnOrder: baseSetLocalColumnOrder,
    handleToggleColumnVisibility,
  } = useTableColumnVisibility({
    block,
    table,
    tableId,
    resolvedBlockId,
    columns,

    tableViewState,

    onBlockUpdated,
    onSortRulesChange: setSortRules,
  });

  const normalizedColumnsWithSystem = useMemo(() => {
    return normalizeColumns(columnsWithSystem);
  }, [columnsWithSystem]);

  const normalizedVisibleColumnsWithSystem = useMemo(() => {
    return normalizeColumns(visibleColumnsWithSystem);
  }, [visibleColumnsWithSystem]);

  const setLocalColumnOrder = (nextOrder) => {
    const normalizedOrder = normalizeIds(nextOrder);

    baseSetLocalColumnOrder?.(normalizedOrder);
    handleMarkDirty();
  };

  const rowsWithSystem = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    return rows.map((row) => ({
      ...row,
      values: {
        ...(row?.values || {}),
        [SYSTEM_ROW_NUMBER_COLUMN_ID]: getPersistentRowNumber(row),

        created_at:
          row?.values?.created_at ??
          row?.values?.createdAt ??
          row?.created_at ??
          row?.createdAt ??
          row?.created ??
          "",

        updated_at:
          row?.values?.updated_at ??
          row?.values?.updatedAt ??
          row?.values?.modified_at ??
          row?.values?.modifiedAt ??
          row?.updated_at ??
          row?.updatedAt ??
          row?.modified_at ??
          row?.modifiedAt ??
          "",
      },
    }));
  }, [rows, SYSTEM_ROW_NUMBER_COLUMN_ID]);

  const {
    savedFilters,
    saveFilters,
    handleDeleteSavedFilter,
    handleUpdateSavedFilter,
  } = useSavedTableFilters({
    table,
    block,
    activeFilter,
    setActiveFilter,
    setActiveConditions,
    handleSaveFiltersToSettings,
  });

  const normalizedSavedFilters = useMemo(() => {
    return Array.isArray(savedFilters)
      ? savedFilters.map((filter) => normalizeSavedFilter(filter))
      : [];
  }, [savedFilters]);

  const activeQuickFilter = useMemo(() => {
    if (!activeQuickFilterId) return null;

    return (
      normalizedSavedFilters.find(
        (filter) =>
          isQuickFilter(filter) &&
          String(filter.key) === String(activeQuickFilterId)
      ) || null
    );
  }, [normalizedSavedFilters, activeQuickFilterId]);

  const baseConditions = useMemo(() => {
    return Array.isArray(activeConditions) ? activeConditions : [];
  }, [activeConditions]);

  const quickFilterConditions = useMemo(() => {
    if (!activeQuickFilter) return [];

    return Array.isArray(activeQuickFilter.conditions)
      ? activeQuickFilter.conditions
      : [];
  }, [activeQuickFilter]);

  const handleSetActiveFilter = (nextActiveFilter) => {
    setActiveFilter(nextActiveFilter);
  };

  const handleSetActiveQuickFilter = (nextQuickFilterId) => {
    setActiveQuickFilterId((prev) => {
      const normalizedPrev = prev ? String(prev) : null;
      const normalizedNext = nextQuickFilterId ? String(nextQuickFilterId) : null;

      return normalizedPrev === normalizedNext ? null : normalizedNext;
    });
  };

  const handleToggleColumnSortAndMarkDirty = (column) => {
    handleToggleColumnSort(column);
    handleMarkDirty();
  };

  const handleToggleColumnVisibilityAndMarkDirty = (payload) => {
    const isObjectPayload =
      payload && typeof payload === "object" && !Array.isArray(payload);

    const columnId = isObjectPayload
      ? String(payload.columnId || payload.id || payload.key || "").trim()
      : String(payload || "").trim();

    if (!columnId) return;

    if (!isObjectPayload || typeof payload.hidden !== "boolean") {
      handleToggleColumnVisibility?.(columnId);
      onToggleColumnVisibility?.(columnId);
      handleMarkDirty();
      return;
    }

    setHiddenColumnIds((currentHiddenIds) => {
      const normalizedHiddenIds = normalizeIds(currentHiddenIds);
      const shouldHide = Boolean(payload.hidden);

      if (shouldHide) {
        return normalizeIds([...normalizedHiddenIds, columnId]);
      }

      return normalizedHiddenIds.filter((item) => String(item) !== columnId);
    });

    onToggleColumnVisibility?.(payload);
    handleMarkDirty();
  };

  const handleDeleteSavedFilterAndResetState = async (filterKey) => {
    const normalizedFilterKey = filterKey ? String(filterKey) : "";

    if (
      normalizedFilterKey &&
      String(activeQuickFilterId || "") === normalizedFilterKey
    ) {
      setActiveQuickFilterId(null);
    }

    if (normalizedFilterKey && String(activeFilter) === normalizedFilterKey) {
      setActiveFilter("all");
      setActiveConditions([]);
    }

    return handleDeleteSavedFilter?.(filterKey);
  };

  const handleUpdateSavedFilterAndSyncState = async (nextFilter) => {
    const normalizedFilter = normalizeSavedFilter(nextFilter);

    const result = await handleUpdateSavedFilter?.(normalizedFilter);

    if (
      normalizedFilter?.key &&
      String(activeQuickFilterId || "") === String(normalizedFilter.key)
    ) {
      setActiveQuickFilterId(normalizedFilter.key);
    }

    if (
      normalizedFilter?.key &&
      String(activeFilter || "") === String(normalizedFilter.key) &&
      !isQuickFilter(normalizedFilter)
    ) {
      setActiveConditions(
        Array.isArray(normalizedFilter.conditions)
          ? normalizedFilter.conditions
          : []
      );
    }

    return result;
  };

  const { filteredRows, visibleRows } = useTableDataProcessing({
    rows: rowsWithSystem,
    columns: normalizedColumnsWithSystem,

    activeFilter,
    activeConditions,

    baseConditions,
    quickFilterConditions,

    activeSort,
    sortDirection,
    sortRules,
    forcedVisibleRowIds,
    setForcedVisibleRowIds,
  });

  const createdRowFocus = useCreatedRowFocus({
    visibleRows,
    forcedVisibleRowIds,
    setForcedVisibleRowIds,
  });

  const showTableTitle = block
    ? block?.settings?.show_title !== false
    : table?.settings?.show_title !== false;

  const rowCardSettings = useMemo(() => {
    return normalizeRowCardSettings(
      table?.settings?.rowCard || block?.settings?.rowCard
    );
  }, [table?.settings?.rowCard, block?.settings?.rowCard]);

  const { tableRef, requestTableHeightReport } = useTableAutoHeight({
    block,
    rowCardSettings,
    onBlockUpdated,
  });

  const {
    expandedRowIds,
    setExpandedRowIds,
    rowsWithChildrenIds,
    allTreeRowsExpanded,
    handleToggleExpandAll,
    handleToggleRowExpanded,
    expandRow,
  } = useTableRows({
    rows: visibleRows,
    tableId,
    blockId: resolvedBlockId,
    tableInternalId: table?.id,
    isLoading,
    onAfterChange: requestTableHeightReport,
  });

  const {
    activeOpenedRow,
    handleOpenRowCard,
    handleCloseRowCard,
    markShouldOpenCreatedRowCard,
    clearShouldOpenCreatedRowCard,
  } = useTableRowCard({
    rows: rowsWithSystem,
    tableId,
    blockId: resolvedBlockId,
    isInlineEditMode,
    closeColumnMenu,
  });

  const {
    handleAddRowAndUpdateHeight: baseHandleAddRowAndUpdateHeight,
    handleAddSubtaskAndUpdateHeight,
    handleDeleteRowAndUpdateHeight,
    handleCardCellChange,
    handleSaveRowValues,
  } = useUniversalTableActions({
    isEditMode,
    isInlineEditMode,
    handleAddRow,
    handleAddSubtask,
    handleDeleteRow,
    handleCellChange,
    handleRowValuesChange,
    expandRow,
    requestTableHeightReport,
    markShouldOpenCreatedRowCard,
    clearShouldOpenCreatedRowCard,
  });

  const handleAddRowAndUpdateHeight = async (payloadOrEvent) => {
    const result = await baseHandleAddRowAndUpdateHeight(payloadOrEvent);

    createdRowFocus.registerCreatedRowFocus({
      result,
      payloadOrEvent,
    });

    return result;
  };

  const handleMoveRowAndUpdateHeight = async (payload) => {
    const result = await handleMoveRow?.(payload);
    requestTableHeightReport?.();
    return result;
  };

  const handleUpdateRowCardSettings = (nextRowCardSettings) => {
    if (!block?.id) return;

    onBlockUpdated?.({
      ...block,
      settings: {
        ...(block.settings || {}),
        rowCard: normalizeRowCardSettings(nextRowCardSettings),
      },
    });

    requestTableHeightReport();
  };

  const {
    selectedRowIds,
    selectedRowsCount,
    allRowsSelected,
    someRowsSelected,
    handleToggleRowSelection,
    handleToggleAllRowsSelection,
    handleDeleteSelectedRows,
    handleClearSelection,
  } = useRowSelection({
    rows: visibleRows,
    onDeleteRows: handleDeleteRows,
    onAfterChange: requestTableHeightReport,
  });

  const columnMenus = useColumnMenus({
    isAddColumnOpen,
    openedColumnMenuId,

    newColumnOptions,
    newColumnMultiple,
    newColumnAlign,
    newColumnLookup,
    newColumnTitle,

    handleCancelAddColumn,
    handleToggleAddColumn,
    handleAddColumn,
    handleDeleteColumn,

    updateColumn,
    handleSaveSystemColumnSettings,

    closeColumnMenu,
    openColumnMenu,

    setNewColumnType,
    setNewColumnOptions,
    setNewColumnMultiple,
    setNewColumnAlign,
    setNewColumnLookup,

    onAfterChange: requestTableHeightReport,
  });

  const { isResizingColumnRef, getColumnWidth, handleStartResizeColumn } =
    useColumnResize({
      updateColumn,
      closeColumnMenu,
      setEditingColumnDraft: columnMenus.setEditingColumnDraft,
      setColumnMenuAnchorRect: columnMenus.setColumnMenuAnchorRect,
      onAfterResize: requestTableHeightReport,
    });

  const { tableGridTemplateColumns, fullTableMinWidth } =
    useUniversalTableLayout({
      columns: normalizedVisibleColumnsWithSystem,
      getColumnWidth,
    });

  const {
    handleStartDragColumnWithSystem,
    handleDragOverColumnWithSystem,
    handleDropColumnWithSystem,
  } = useTableColumnDnd({
    handleStartDragColumn,
    handleDragOverColumn,
    handleDropColumn,
    visibleColumnsWithSystem: normalizedVisibleColumnsWithSystem,
    allColumnsWithSystem: normalizedColumnsWithSystem,
    setLocalColumnOrder,
    requestTableHeightReport,
    onColumnOrderChanged: () => {
      handleMarkDirty();
    },
  });

  const handleRootClick = (event) => {
    const isTableAction = event.target.closest("[data-table-action='true']");
    if (isTableAction) return;
    if (!isEditMode) return;

    event.stopPropagation();

    if (block) {
      onEdit?.(block);
    }
  };

  const handleCloseFiltersModal = () => {
    setIsFiltersModalOpen(false);
    setFiltersModalMode("create");
    setEditingFilter(null);
  };

  useUniversalTableEvents({
    resolvedBlockId,

    setActiveFilter: handleSetActiveFilter,
    setActiveQuickFilterId: handleSetActiveQuickFilter,
    setActiveConditions,
    setActiveSort,
    setSortDirection,
    setSortRules,
    setIsInlineEditMode,

    setHiddenColumnIds,
    setColumnOrder,
    setLocalColumnOrder: baseSetLocalColumnOrder,

    handleAddRowAndUpdateHeight,
    handleMoveRow: handleMoveRowAndUpdateHeight,
    closeColumnMenu,

    saveFilters,
    handleDeleteSavedFilter: handleDeleteSavedFilterAndResetState,
    handleUpdateSavedFilter: handleUpdateSavedFilterAndSyncState,

    setEditingFilter,
    setFiltersModalMode,
    setIsFiltersModalOpen,

    requestTableHeightReport,
    markShouldOpenCreatedRowCard,
    clearShouldOpenCreatedRowCard,
    isEditMode,
    isInlineEditMode,
  });

  useEffect(() => {
    const handler = (event) => {
      const { blockId: eventBlockId, sortRules: nextSortRules } =
        event.detail || {};

      if (!eventBlockId) return;
      if (String(eventBlockId) !== String(resolvedBlockId)) return;

      setSortRules(Array.isArray(nextSortRules) ? nextSortRules : []);
    };

    window.addEventListener("universal-table:change-sort-rules", handler);

    return () => {
      window.removeEventListener("universal-table:change-sort-rules", handler);
    };
  }, [resolvedBlockId, setSortRules]);

  useEffect(() => {
    if (!activeQuickFilterId) return;

    const exists = normalizedSavedFilters.some(
      (filter) =>
        isQuickFilter(filter) &&
        String(filter.key) === String(activeQuickFilterId)
    );

    if (!exists) {
      setActiveQuickFilterId(null);
    }
  }, [activeQuickFilterId, normalizedSavedFilters]);

  useEffect(() => {
    if (!resolvedBlockId) return;

    window.dispatchEvent(
      new CustomEvent("universal-table:columns-ready", {
        detail: {
          blockId: resolvedBlockId,
          tableId: table?.id || tableId || null,
          columns: normalizedColumnsWithSystem,
          visibleColumns: normalizedVisibleColumnsWithSystem,
          hiddenColumnIds,
          filters: savedFilters,
          rows: rowsWithSystem,
        },
      })
    );
  }, [
    resolvedBlockId,
    table?.id,
    tableId,
    normalizedColumnsWithSystem,
    normalizedVisibleColumnsWithSystem,
    hiddenColumnIds,
    savedFilters,
    rowsWithSystem,
  ]);

  useEffect(() => {
    if (!resolvedBlockId) return;

    window.dispatchEvent(
      new CustomEvent("universal-table:state-changed", {
        detail: {
          blockId: resolvedBlockId,
          tableId: table?.id || tableId || null,
          activeFilter,
          activeQuickFilterId,
          activeConditions,
          baseConditions,
          quickFilterConditions,
          activeSort,
          sortDirection,
          sortRules,
          hiddenColumnIds,
          columnOrder,
        },
      })
    );
  }, [
    resolvedBlockId,
    table?.id,
    tableId,
    activeFilter,
    activeQuickFilterId,
    activeConditions,
    baseConditions,
    quickFilterConditions,
    activeSort,
    sortDirection,
    sortRules,
    hiddenColumnIds,
    columnOrder,
  ]);

  useEffect(() => {
    requestTableHeightReport();
  }, [
    rowsWithSystem.length,
    filteredRows.length,
    visibleRows.length,
    normalizedColumnsWithSystem.length,
    normalizedVisibleColumnsWithSystem.length,
    selectedRowsCount,
    isLoading,
    error,
    isAddColumnOpen,
    openedColumnMenuId,
    table?.title,
    showTableTitle,
    isInlineEditMode,
    activeFilter,
    activeQuickFilterId,
    activeConditions,
    quickFilterConditions,
    activeSort,
    sortDirection,
    sortRules,
    hiddenColumnIds,
    expandedRowIds,
    requestTableHeightReport,
  ]);

  useEffect(() => {
    if (!isRepresentationDirty) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRepresentationDirty]);

  const handleToggleInlineEditMode = (event) => {
    event.preventDefault();
    event.stopPropagation();

    closeColumnMenu?.();
    createdRowFocus.clearCreatedRowFocusRequest();
    setIsInlineEditMode((prev) => !prev);
  };

  return (
    <div ref={tableRef} onClick={handleRootClick} style={tableViewRootStyle}>
      <UniversalTableTopBar
        table={table}
        showTitle={showTableTitle}
        isPageEditMode={isEditMode}
        isInlineEditMode={isInlineEditMode}
        onToggleInlineEditMode={handleToggleInlineEditMode}
        onSaveTitle={handleUpdateTableTitle}
        onAfterChange={requestTableHeightReport}
        onAddRow={handleAddRowAndUpdateHeight}
      />

      <div data-table-action="true" style={tableViewScrollWrapperStyle}>
        <div style={getTableViewInnerStyle(fullTableMinWidth)}>
          <TableHeader
            columns={normalizedVisibleColumnsWithSystem}
            allColumns={normalizedColumnsWithSystem}
            hiddenColumnIds={hiddenColumnIds}
            onToggleColumnVisibility={handleToggleColumnVisibilityAndMarkDirty}
            rows={visibleRows}
            tableGridTemplateColumns={tableGridTemplateColumns}
            fullTableMinWidth={fullTableMinWidth}
            allRowsSelected={allRowsSelected}
            someRowsSelected={someRowsSelected}
            onToggleAllRowsSelection={handleToggleAllRowsSelection}
            expandedRowIds={expandedRowIds}
            allTreeRowsExpanded={allTreeRowsExpanded}
            hasTreeRows={rowsWithChildrenIds.size > 0}
            onToggleExpandAll={handleToggleExpandAll}
            sortRules={sortRules}
            onToggleColumnSort={handleToggleColumnSortAndMarkDirty}
            openedColumnMenuId={openedColumnMenuId}
            editingColumnDraft={columnMenus.editingColumnDraft}
            columnMenuAnchorRect={columnMenus.columnMenuAnchorRect}
            createColumnAnchorRect={columnMenus.createColumnAnchorRect}
            isAddColumnOpen={isAddColumnOpen}
            newColumnTitle={newColumnTitle}
            newColumnType={newColumnType}
            newColumnRequired={newColumnRequired}
            newColumnOptions={newColumnOptions}
            newColumnMultiple={newColumnMultiple}
            newColumnAlign={newColumnAlign}
            newColumnLookup={newColumnLookup}
            createColumnTitleError={columnMenus.createColumnTitleError}
            onClearCreateColumnTitleError={() =>
              columnMenus.setCreateColumnTitleError("")
            }
            isEditMode={isEditMode || isInlineEditMode}
            canEditColumns={canEditColumns}
            onStartDragColumn={handleStartDragColumnWithSystem}
            onDragOverColumn={handleDragOverColumnWithSystem}
            onDropColumn={handleDropColumnWithSystem}
            onOpenEditColumnMenu={(event, column) =>
              columnMenus.handleOpenEditColumnMenu({
                event,
                column,
                isResizingColumn: isResizingColumnRef.current,
              })
            }
            onStartResizeColumn={handleStartResizeColumn}
            onOpenCreateColumnMenu={columnMenus.handleOpenCreateColumnMenu}
            onEditColumnTitleChange={(title) =>
              columnMenus.setEditingColumnDraft((draft) => ({
                ...draft,
                title,
              }))
            }
            onEditColumnTypeChange={columnMenus.handleEditColumnTypeChange}
            onEditColumnRequiredChange={(required) =>
              columnMenus.setEditingColumnDraft((draft) => ({
                ...draft,
                required,
              }))
            }
            onEditColumnOptionsChange={(options) =>
              columnMenus.setEditingColumnDraft((draft) => ({
                ...draft,
                options: normalizeOptions(options),
              }))
            }
            onEditColumnMultipleChange={(multiple) =>
              columnMenus.setEditingColumnDraft((draft) => ({
                ...draft,
                multiple: Boolean(multiple),
              }))
            }
            onEditColumnAlignChange={(align) =>
              columnMenus.setEditingColumnDraft((draft) => ({
                ...draft,
                align: normalizeAlign(align),
              }))
            }
            onEditColumnWidthChange={(width) =>
              columnMenus.setEditingColumnDraft((draft) => ({
                ...draft,
                width: Number(width || 180),
              }))
            }
            onEditColumnLookupChange={columnMenus.handleEditColumnLookupChange}
            onSaveEditColumn={columnMenus.handleSaveEditColumn}
            onCancelEditColumn={columnMenus.handleCancelEditColumn}
            onDeleteColumn={columnMenus.handleDeleteColumnAndClose}
            onCreateColumnTitleChange={setNewColumnTitle}
            onCreateColumnTypeChange={columnMenus.handleCreateColumnTypeChange}
            onCreateColumnRequiredChange={setNewColumnRequired}
            onCreateColumnOptionsChange={(options) =>
              setNewColumnOptions(normalizeOptions(options))
            }
            onCreateColumnMultipleChange={(multiple) =>
              setNewColumnMultiple(Boolean(multiple))
            }
            onCreateColumnAlignChange={(align) =>
              setNewColumnAlign(normalizeAlign(align))
            }
            onCreateColumnLookupChange={columnMenus.handleCreateColumnLookupChange}
            onSaveCreateColumn={columnMenus.handleSaveCreateColumn}
            onCancelCreateColumn={columnMenus.handleCancelCreateColumn}
          />

          <div
            ref={bodyScrollRef}
            data-table-action="true"
            style={getTableViewBodyScrollStyle(fullTableMinWidth)}
          >
            <UniversalTableState
              isLoading={isLoading}
              error={error}
              rowsCount={visibleRows.length}
              fullTableMinWidth={fullTableMinWidth}
            />

            {!isLoading && !error && (
              <TableBody
                rows={visibleRows}
                columns={normalizedVisibleColumnsWithSystem}
                selectedRowIds={selectedRowIds}
                tableGridTemplateColumns={tableGridTemplateColumns}
                fullTableMinWidth={fullTableMinWidth}
                onToggleRowSelection={handleToggleRowSelection}
                onCellChange={handleCellChange}
                onOpenRowCard={handleOpenRowCard}
                onAddSubtask={handleAddSubtaskAndUpdateHeight}
                onDeleteRow={handleDeleteRowAndUpdateHeight}
                onMoveRow={handleMoveRowAndUpdateHeight}
                isInlineEditMode={isInlineEditMode}
                expandedRowIds={expandedRowIds}
                setExpandedRowIds={setExpandedRowIds}
                onToggleRowExpanded={handleToggleRowExpanded}
                createdRowFocusRequest={createdRowFocus.effectiveCreatedRowFocusRequest}
              />
            )}
          </div>

          <TableToolbar
            fullTableMinWidth={fullTableMinWidth}
            selectedRowsCount={selectedRowsCount}
            isEditMode={isInlineEditMode}
            isPageEditMode={isEditMode}
            onAddRow={handleAddRowAndUpdateHeight}
            onDeleteSelectedRows={(event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              handleDeleteSelectedRows();
            }}
            onClearSelection={(event) => {
              event?.preventDefault?.();
              event.stopPropagation?.();
              handleClearSelection();
            }}
          />
        </div>
      </div>

      {!isInlineEditMode && (
        <EntityCardModal
          row={activeOpenedRow}
          table={table}
          columns={normalizedColumnsWithSystem}
          onClose={handleCloseRowCard}
        />
      )}

      <TableFiltersModal
        isOpen={isFiltersModalOpen}
        columns={normalizedColumnsWithSystem}
        rows={rowsWithSystem}
        initialConditions={activeConditions}
        savedFilters={savedFilters}
        mode={filtersModalMode}
        editingFilter={editingFilter}
        blockId={resolvedBlockId}
        onClose={handleCloseFiltersModal}
        onSave={({ conditions, quickFilter }) => {
          const nextConditions = Array.isArray(conditions) ? conditions : [];

          if (!quickFilter) {
            setActiveConditions(nextConditions);
            setActiveFilter("custom");
            handleMarkDirty();
            return;
          }

          const normalizedQuickFilter = normalizeSavedFilter({
            ...quickFilter,
            conditions: nextConditions,
            isQuick: true,
            isQuickFilter: true,
            is_quick: true,
          });

          setActiveQuickFilterId(normalizedQuickFilter.key);
          saveFilters([...savedFilters, normalizedQuickFilter]);
          handleMarkDirty();
        }}
      />
    </div>
  );
}