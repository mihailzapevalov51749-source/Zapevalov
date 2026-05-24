import { useEffect, useMemo, useRef, useState } from "react";

import useUniversalTable from "./useUniversalTable";
import useRowSelection from "./useRowSelection";
import useColumnResize from "./useColumnResize";
import useColumnMenus from "./useColumnMenus";
import useTableRows from "./useTableRows";

import useTableRowCard, {
  normalizeRowCardSettings,
} from "./useTableRowCard";

import useTableAutoHeight from "./useTableAutoHeight";
import useUniversalTableLayout from "./useUniversalTableLayout";
import useUniversalTableEvents from "./useUniversalTableEvents";
import useUniversalTableActions from "./useUniversalTableActions";
import useTableDataProcessing from "./useTableDataProcessing";
import useTableColumnVisibility from "./useTableColumnVisibility";
import useCreatedRowFocus from "./useCreatedRowFocus";
import useTableColumnSorting from "./useTableColumnSorting";
import useTableColumnDnd from "./useTableColumnDnd";
import useTableFilePreview from "./useTableFilePreview";
import useTableRowAttachments from "./useTableRowAttachments";
import useTableEntityCardNavigation from "./useTableEntityCardNavigation";
import useTableDirtyState from "./useTableDirtyState";
import useTableRowsWithSystem from "./useTableRowsWithSystem";
import useTableFiltersState from "./useTableFiltersState";
import useTableLocationRegistry from "./useTableLocationRegistry";

import { tableViewRootStyle } from "../styles/tableStyles";

import {
  normalizeIds,
  isQuickFilter,
} from "../services/tableNormalization";

const noop = () => {};
const noopAsync = async () => null;

export default function useUniversalTableController({
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

  const { tableViewState, onToggleColumnVisibility } =
    tableRepresentationProps || {};

  const [isInlineEditMode, setIsInlineEditMode] = useState(false);
  const [forcedVisibleRowIds, setForcedVisibleRowIds] = useState(new Set());
  const [localRowCardSettings, setLocalRowCardSettings] = useState(null);

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

  useTableLocationRegistry({
    table,
    tableId,
    resolvedBlockId,
  });

  const { handleMarkDirty } = useTableDirtyState({
    resolvedBlockId,
    tableId: table?.id || tableId || null,
  });

  useEffect(() => {
    setLocalRowCardSettings(
      normalizeRowCardSettings(
        block?.settings?.rowCard ||
          table?.settings?.rowCard ||
          {}
      )
    );
  }, [block?.settings?.rowCard, table?.settings?.rowCard]);

  const {
    activeFilter,
    setActiveFilter,

    activeQuickFilterId,
    setActiveQuickFilterId,

    activeConditions,
    setActiveConditions,

    isFiltersModalOpen,
    setIsFiltersModalOpen,

    filtersModalMode,
    setFiltersModalMode,

    editingFilter,
    setEditingFilter,

    savedFilters,
    saveFilters,

    normalizedSavedFilters,

    baseConditions,
    quickFilterConditions,

    handleSetActiveFilter,
    handleSetActiveQuickFilter,

    handleDeleteSavedFilterAndResetState,
    handleUpdateSavedFilterAndSyncState,

    handleCloseFiltersModal,
  } = useTableFiltersState({
    table,
    block,
    handleSaveFiltersToSettings,
  });

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

  const {
    normalizedColumnsWithSystem,
    normalizedVisibleColumnsWithSystem,
    rowsWithSystem,
  } = useTableRowsWithSystem({
    rows,
    columnsWithSystem,
    visibleColumnsWithSystem,
    systemRowNumberColumnId: SYSTEM_ROW_NUMBER_COLUMN_ID,
  });

  const setLocalColumnOrder = (nextOrder) => {
    const normalizedOrder = normalizeIds(nextOrder);

    baseSetLocalColumnOrder?.(normalizedOrder);
    handleMarkDirty();
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
    return normalizeRowCardSettings(localRowCardSettings || {});
  }, [localRowCardSettings]);

  const tableForEntityCard = useMemo(() => {
    return {
      ...(table || {}),
      settings: {
        ...(table?.settings || {}),
        rowCard: rowCardSettings,
      },
    };
  }, [table, rowCardSettings]);

  const { tableRef, requestTableHeightReport } = useTableAutoHeight({
    block,
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
    notificationContext,
    handleOpenBaseRowCard,
    handleCloseEntityCard,
    handleOpenRelatedRow,
    handleBackRowCard,
  } = useTableEntityCardNavigation({
    rows: rowsWithSystem,
    activeOpenedRow,
    handleOpenRowCard,
    handleCloseRowCard,
  });

  const {
    previewFile,
    handleOpenFileFromTable,
    handleClosePreviewFile,
  } = useTableFilePreview({
    rows: rowsWithSystem,
    activeOpenedRow,
    columns: normalizedColumnsWithSystem,
  });

  const {
    handleUploadAttachment,
    handleDeleteAttachment,
  } = useTableRowAttachments({
    columns: normalizedColumnsWithSystem,
    rows: rowsWithSystem,
    handleRowValuesChange,
    handleOpenRowCard,
  });

  const {
    handleAddRowAndUpdateHeight: baseHandleAddRowAndUpdateHeight,
    handleAddSubtaskAndUpdateHeight,
    handleDeleteRowAndUpdateHeight,
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

    const normalizedSettings = normalizeRowCardSettings(nextRowCardSettings);

    setLocalRowCardSettings(normalizedSettings);

    onBlockUpdated?.({
      ...block,
      settings: {
        ...(block.settings || {}),
        rowCard: normalizedSettings,
      },
    });

    requestTableHeightReport?.();
  };

  const handleUpdateRowField = async ({
    rowId,
    columnId,
    value,
  }) => {
    if (!rowId || !columnId) return;

    const targetRow =
      rowsWithSystem.find(
        (row) => String(row.id) === String(rowId)
      ) || activeOpenedRow;

    if (!targetRow) return;

    const normalizedColumnId = String(columnId);

    const nextValues = {
      ...(targetRow.values || {}),
      [normalizedColumnId]: value,
    };

    await handleRowValuesChange?.(
      rowId,
      nextValues
    );

    requestTableHeightReport?.();
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
    if (!activeQuickFilterId) return;

    const exists = normalizedSavedFilters.some(
      (filter) =>
        isQuickFilter(filter) &&
        String(filter.key) === String(activeQuickFilterId)
    );

    if (!exists) {
      setActiveQuickFilterId(null);
    }
  }, [activeQuickFilterId, normalizedSavedFilters, setActiveQuickFilterId]);

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

  const handleToggleInlineEditMode = (event) => {
    event.preventDefault();
    event.stopPropagation();

    closeColumnMenu?.();
    createdRowFocus.clearCreatedRowFocusRequest();
    setIsInlineEditMode((prev) => !prev);
  };

  return {
  table,
  block,

  rows: rowsWithSystem,
  columns: normalizedColumnsWithSystem,
  fields: normalizedColumnsWithSystem,

  rootProps: {
      ref: tableRef,
      onClick: handleRootClick,
      style: {
        ...tableViewRootStyle,
        position: "relative",
      },
    },

    

    topBarProps: {
      table,
      showTitle: showTableTitle,
      isPageEditMode: isEditMode,
      isInlineEditMode,
      onToggleInlineEditMode: handleToggleInlineEditMode,
      onSaveTitle: handleUpdateTableTitle,
      onAfterChange: requestTableHeightReport,
      onAddRow: handleAddRowAndUpdateHeight,
    },

tableViewBarProps: {
  hasTable: true,

  blockId: resolvedBlockId,

  isInlineEditMode,
onToggleInlineEditMode: handleToggleInlineEditMode,
onAddRow: handleAddRowAndUpdateHeight,

  quickFilters: normalizedSavedFilters.filter((filter) =>
    isQuickFilter(filter)
  ),

  activeFilter,
  activeQuickFilterId,

  onFilterChange: handleSetActiveQuickFilter,

  onOpenFilters: () => {
    setFiltersModalMode("manage");
    setIsFiltersModalOpen(true);
  },

  representationsBarProps: {
    representations:
      tableRepresentationProps?.representations || [],

    activeRepresentationId:
      tableRepresentationProps?.activeRepresentationId || null,

    isRepresentationDirty:
      tableRepresentationProps?.isRepresentationDirty || false,

    isBaseStateDirty:
      tableRepresentationProps?.isBaseStateDirty || false,

    columns: normalizedColumnsWithSystem,

    tableViewState,

    tableIdentity:
      tableRepresentationProps?.tableIdentity || {},

    viewsVisibleLimit:
      tableRepresentationProps?.viewsVisibleLimit ?? 2,

    onViewsVisibleLimitChange:
      tableRepresentationProps?.onViewsVisibleLimitChange,

    onSelectRepresentation:
      tableRepresentationProps?.onSelectRepresentation,

    onCreateRepresentation:
      tableRepresentationProps?.onCreateRepresentation,

    onDeleteRepresentation:
      tableRepresentationProps?.onDeleteRepresentation,

    onToggleRepresentationVisibility:
      tableRepresentationProps?.onToggleRepresentationVisibility,

    onToggleColumnVisibility:
      handleToggleColumnVisibilityAndMarkDirty,

    onOpenRepresentationFilters: () => {
      setFiltersModalMode("manage");
      setIsFiltersModalOpen(true);
    },

    onRenameRepresentation:
      tableRepresentationProps?.onRenameRepresentation,

    onSaveRepresentation:
      tableRepresentationProps?.onSaveRepresentation,

    onSaveAsRepresentation:
      tableRepresentationProps?.onSaveAsRepresentation,

    onDuplicateRepresentation:
      tableRepresentationProps?.onDuplicateRepresentation,

    onSetDefaultRepresentation:
      tableRepresentationProps?.onSetDefaultRepresentation,

    handleStartDragColumnWithSystem,
    handleDragOverColumnWithSystem,
    handleDropColumnWithSystem,
  },
},

    mainContentProps: {
      bodyScrollRef,
      fullTableMinWidth,
      tableGridTemplateColumns,

      normalizedVisibleColumnsWithSystem,
      normalizedColumnsWithSystem,

      hiddenColumnIds,

      visibleRows,

      rowsWithChildrenIds,

      expandedRowIds,
      setExpandedRowIds,

      allTreeRowsExpanded,

      sortRules,

      selectedRowIds,

      selectedRowsCount,

      allRowsSelected,
      someRowsSelected,

      isLoading,
      error,

      isEditMode,
      isInlineEditMode,
      canEditColumns,

      openedColumnMenuId,

      editingColumnDraft: columnMenus.editingColumnDraft,
      columnMenuAnchorRect: columnMenus.columnMenuAnchorRect,
      createColumnAnchorRect: columnMenus.createColumnAnchorRect,

      isAddColumnOpen,

      newColumnTitle,
      newColumnType,
      newColumnRequired,
      newColumnOptions,
      newColumnMultiple,
      newColumnAlign,
      newColumnLookup,

      createColumnTitleError: columnMenus.createColumnTitleError,

      isResizingColumnRef,

      createdRowFocus,

      rows: visibleRows,

      onToggleColumnVisibility: handleToggleColumnVisibilityAndMarkDirty,
      onToggleAllRowsSelection: handleToggleAllRowsSelection,
      onToggleExpandAll: handleToggleExpandAll,
      onToggleColumnSort: handleToggleColumnSortAndMarkDirty,

      onStartDragColumn: handleStartDragColumnWithSystem,
      onDragOverColumn: handleDragOverColumnWithSystem,
      onDropColumn: handleDropColumnWithSystem,

      onOpenEditColumnMenu: columnMenus.handleOpenEditColumnMenu,
      onStartResizeColumn: handleStartResizeColumn,
      onOpenCreateColumnMenu: columnMenus.handleOpenCreateColumnMenu,

      onEditColumnTitleChange: (title) =>
        columnMenus.setEditingColumnDraft((draft) => ({
          ...draft,
          title,
        })),

      onEditColumnTypeChange: columnMenus.handleEditColumnTypeChange,

      onEditColumnRequiredChange: (required) =>
        columnMenus.setEditingColumnDraft((draft) => ({
          ...draft,
          required,
        })),

      onEditColumnOptionsChange: (options) =>
        columnMenus.setEditingColumnDraft((draft) => ({
          ...draft,
          options,
        })),

      onEditColumnMultipleChange: (multiple) =>
        columnMenus.setEditingColumnDraft((draft) => ({
          ...draft,
          multiple: Boolean(multiple),
        })),

      onEditColumnAlignChange: (align) =>
        columnMenus.setEditingColumnDraft((draft) => ({
          ...draft,
          align,
        })),

      onEditColumnWidthChange: (width) =>
        columnMenus.setEditingColumnDraft((draft) => ({
          ...draft,
          width: Number(width || 180),
        })),

      onEditColumnLookupChange: columnMenus.handleEditColumnLookupChange,
      onSaveEditColumn: columnMenus.handleSaveEditColumn,
      onCancelEditColumn: columnMenus.handleCancelEditColumn,
      onDeleteColumn: columnMenus.handleDeleteColumnAndClose,

      onCreateColumnTitleChange: setNewColumnTitle,
      onCreateColumnTypeChange: columnMenus.handleCreateColumnTypeChange,
      onCreateColumnRequiredChange: setNewColumnRequired,
      onCreateColumnOptionsChange: setNewColumnOptions,
      onCreateColumnMultipleChange: (multiple) =>
        setNewColumnMultiple(Boolean(multiple)),
      onCreateColumnAlignChange: setNewColumnAlign,
      onCreateColumnLookupChange: columnMenus.handleCreateColumnLookupChange,

      onSaveCreateColumn: columnMenus.handleSaveCreateColumn,
      onCancelCreateColumn: columnMenus.handleCancelCreateColumn,

      onToggleRowSelection: handleToggleRowSelection,
      onCellChange: handleCellChange,
      onOpenRowCard: handleOpenBaseRowCard,
      onOpenFile: handleOpenFileFromTable,
      onAddSubtask: handleAddSubtaskAndUpdateHeight,
      onDeleteRow: handleDeleteRowAndUpdateHeight,
      onMoveRow: handleMoveRowAndUpdateHeight,

      onToggleRowExpanded: handleToggleRowExpanded,

      onAddRow: handleAddRowAndUpdateHeight,

      onDeleteSelectedRows: (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        handleDeleteSelectedRows();
      },

      onClearSelection: (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        handleClearSelection();
      },

      columnMenus,
    },

    modalsProps: {
      isInlineEditMode,

      activeOpenedRow,

      table,
      tableId,

      tableForEntityCard,

      rowsWithSystem,
      normalizedColumnsWithSystem,

      notificationContext,

      previewFile,

      isFiltersModalOpen,
      activeConditions,
      savedFilters,
      filtersModalMode,
      editingFilter,
      resolvedBlockId,

      setActiveConditions,
      setActiveFilter,
      setActiveQuickFilterId,

      saveFilters,
      handleMarkDirty,

      onBack: handleBackRowCard,
      onOpenParent: handleOpenRelatedRow,
      onOpenRelatedRow: handleOpenRelatedRow,
      onOpenFile: handleOpenFileFromTable,
      onCloseEntityCard: handleCloseEntityCard,
      onUploadAttachment: handleUploadAttachment,
      onDeleteAttachment: handleDeleteAttachment,
      onSaveCardSettings: handleUpdateRowCardSettings,
      onUpdateRowField: handleUpdateRowField,

      onClosePreviewFile: handleClosePreviewFile,
      onCloseFiltersModal: handleCloseFiltersModal,
    },
  };
}
