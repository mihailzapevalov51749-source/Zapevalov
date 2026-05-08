import { useEffect } from "react";

import useTableRepresentations from "../../universalTable/hooks/useTableRepresentations";
import useTableDirtyState from "./useTableDirtyState";
import useTableViewState from "./useTableViewState";
import useUniversalTableDispatch from "./useUniversalTableDispatch";
import useTableBasicState from "./useTableBasicState";
import useTableRepresentationPayload from "./useTableRepresentationPayload";
import useTableRepresentationActions from "./useTableRepresentationActions";
import useTableRepresentationApply from "./useTableRepresentationApply";
import useQuickFilterEvents from "./useQuickFilterEvents";
import useTableStateEvents from "./useTableStateEvents";
import useTableFilterActions from "./useTableFilterActions";
import useTableSortActions from "./useTableSortActions";
import useTableColumnDnd from "../../universalTable/hooks/useTableColumnDnd";

import useRepresentationColumnVisibility from "./useRepresentationColumnVisibility";

import {
  normalizeQuickFilter,
  ensureSingleDefaultFilter,
} from "./useQuickFilters";

const UNIVERSAL_TABLE_TYPES = [
  "universal_table",
  "universalTable",
  "table",
  "tableBlock",
];

export {
  UNIVERSAL_TABLE_TYPES,
  normalizeQuickFilter,
  ensureSingleDefaultFilter,
};

export default function useSectionUniversalTableControls({
  section,
  blocks = [],
}) {
  const {
    isTableInlineActive,
    setIsTableInlineActive,

    activeFilter,
    setActiveFilter,
    activeQuickFilterId,
    setActiveQuickFilterId,
    activeConditions,
    setActiveConditions,

    activeSort,
    setActiveSort,
    sortDirection,
    setSortDirection,

    isFiltersOpen,
    filterModalMode,
    editingFilter,

    quickFilters,
    setQuickFilters,
    tableColumns,
    setTableColumns,
    tableRows,
    setTableRows,

    resetFilterState,
    resetSortState,
    resetFiltersModalState,
    openCreateFilterModal,
    openEditFilterModal,
  } = useTableBasicState();

  const {
    tableViewState,
    syncTableViewState,
    getCurrentViewState,
    getLatestViewState,
    resetTableViewState,
  } = useTableViewState();

  const tableBlock = blocks.find((block) =>
    UNIVERSAL_TABLE_TYPES.includes(block?.type)
  );

  const hasUniversalTable = Boolean(tableBlock);

  const {
    representations,
    activeRepresentation,
    activeRepresentationId,
    isRepresentationsHydrated,
    isRepresentationDirty,

    createRepresentation,
    updateRepresentation,
    deleteRepresentation,
    selectRepresentation,
    clearActiveRepresentation,
    toggleRepresentationVisibility,
    moveRepresentation,
    setDefaultRepresentation,
    markRepresentationDirty,
    clearRepresentationDirty,
  } = useTableRepresentations({
    blockId: tableBlock?.id,
    tableId: tableBlock?.content?.table_id || tableBlock?.table_id || null,
    initialRepresentations:
      tableBlock?.settings?.representations ||
      tableBlock?.content?.representations ||
      [],
  });

  const { isBaseStateDirty, markCurrentViewDirty, clearDirty } =
    useTableDirtyState({
      activeRepresentationId,
      markRepresentationDirty,
    });

  const {
    dispatchTableViewState,
    dispatchSortRules,
    dispatchResetFilter,
    dispatchChangeSort,
    dispatchChangeSortDirection,
    dispatchSaveFilters,
    dispatchSetConditions,
    dispatchChangeFilter,
    dispatchUpdateHiddenColumns,
    dispatchToggleInlineEdit,
    dispatchAddRow,
  } = useUniversalTableDispatch({
    tableBlock,
    section,
  });

  const { buildCurrentRepresentationPayload } = useTableRepresentationPayload({
    activeConditions,
    activeFilter,
    activeQuickFilterId,
    activeSort,
    sortDirection,
    getCurrentViewState: getLatestViewState,
  });

  const {
    resetTableToAllItems,
    applyRepresentationToTable,
    handleSelectRepresentation,
  } = useTableRepresentationApply({
    tableBlock,

    representations,
    activeRepresentation,
    isRepresentationsHydrated,

    quickFilters,

    selectRepresentation,
    clearActiveRepresentation,
    clearRepresentationDirty,
    clearDirty,

    resetFilterState,
    resetSortState,

    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
    setActiveSort,
    setSortDirection,

    syncTableViewState,
    resetTableViewState,

    dispatchTableViewState,
    dispatchSortRules,
    dispatchResetFilter,
    dispatchChangeSort,
    dispatchChangeSortDirection,
    dispatchSetConditions,
    dispatchChangeFilter,
  });

  const {
    handleCreateRepresentation,
    handleDeleteRepresentation,
    handleRenameRepresentation,
    handleSaveRepresentation,
    handleSaveAsRepresentation,
    handleDuplicateRepresentation,
    handleSetDefaultRepresentation,
  } = useTableRepresentationActions({
    representations,
    activeRepresentationId,

    createRepresentation,
    updateRepresentation,
    deleteRepresentation,
    setDefaultRepresentation,

    buildCurrentRepresentationPayload,

    clearRepresentationDirty,
    clearDirty,

    applyRepresentationToTable,
    resetTableToAllItems,
    handleSelectRepresentation,
  });

  const { handleSaveFilters, handleFilterChange } = useTableFilterActions({
    quickFilters,

    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
    setQuickFilters,

    markCurrentViewDirty,

    resetFiltersModalState,
    resetTableToAllItems,

    dispatchSaveFilters,
    dispatchSetConditions,
    dispatchChangeFilter,
  });

  const { handleSortChange, handleSortDirectionChange } =
    useTableSortActions({
      setActiveSort,
      setSortDirection,

      markCurrentViewDirty,

      dispatchChangeSort,
      dispatchChangeSortDirection,
    });

 
  const { handleToggleColumnVisibility } =
  useRepresentationColumnVisibility({
    activeFilter,
    activeQuickFilterId,
    activeConditions,
    activeSort,
    sortDirection,

    getCurrentViewState: getLatestViewState,
    syncTableViewState,

    markCurrentViewDirty,

    dispatchUpdateHiddenColumns,
    dispatchTableViewState,
  });

  const {
    handleStartDragColumnWithSystem,
    handleDragOverColumnWithSystem,
    handleDropColumnWithSystem,
  } = useTableColumnDnd({
    visibleColumnsWithSystem: tableColumns,
    allColumnsWithSystem: tableColumns,

    setLocalColumnOrder: (nextOrder) => {
      const currentViewState = getLatestViewState?.() || {};

      const nextViewState = {
        ...currentViewState,
        columnOrder: nextOrder,
      };

      syncTableViewState(nextViewState);
      markCurrentViewDirty();

      dispatchTableViewState(nextViewState);
    },

    onColumnOrderChanged: (nextOrder) => {
      const currentViewState = getLatestViewState?.() || {};

      const nextViewState = {
        ...currentViewState,
        columnOrder: nextOrder,
      };

      syncTableViewState(nextViewState);
      markCurrentViewDirty();

      dispatchTableViewState(nextViewState);
    },
  });

  useTableStateEvents({
    tableBlock,

    markCurrentViewDirty,

    syncTableViewState,

    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
    setActiveSort,
    setSortDirection,
  });

  useQuickFilterEvents({
    tableBlock,

    activeQuickFilterId,

    setActiveFilter,
    setActiveConditions,
    setActiveQuickFilterId,
    setQuickFilters,

    markCurrentViewDirty,

    dispatchSetConditions,
    dispatchSaveFilters,
    dispatchChangeFilter,

    resetFiltersModalState,
    openEditFilterModal,
  });

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId = event.detail?.blockId;
      const columns = event.detail?.columns;
      const filters = event.detail?.filters;
      const rows = event.detail?.rows;

      if (!eventBlockId) return;
      if (String(eventBlockId) !== String(tableBlock?.id)) return;

      setTableColumns(Array.isArray(columns) ? columns : []);
      setTableRows(Array.isArray(rows) ? rows : []);
      setQuickFilters(
        Array.isArray(filters) ? ensureSingleDefaultFilter(filters) : []
      );
    };

    window.addEventListener("universal-table:columns-ready", handler);

    return () => {
      window.removeEventListener("universal-table:columns-ready", handler);
    };
  }, [tableBlock?.id, setTableColumns, setTableRows, setQuickFilters]);

  const handleToggleUniversalTableInlineEdit = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!tableBlock?.id) return;

    setIsTableInlineActive((prev) => !prev);
    dispatchToggleInlineEdit();
  };

  const handleAddUniversalTableRow = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!tableBlock?.id) return;

    dispatchAddRow();
  };

  const handleOpenFilters = () => {
    openCreateFilterModal();
  };

  const handleCloseFilters = () => {
    resetFiltersModalState();
  };

  return {
    tableBlock,
    hasUniversalTable,

    isTableInlineActive,

    activeFilter,
    activeQuickFilterId,
    activeConditions,
    activeSort,
    sortDirection,

    isBaseStateDirty,

    isFiltersOpen,
    filterModalMode,
    editingFilter,

    quickFilters,
    tableColumns,
    tableRows,
    tableViewState,

    representations,
    activeRepresentation,
    activeRepresentationId,
    isRepresentationDirty,

    handleToggleUniversalTableInlineEdit,
    handleAddUniversalTableRow,
    handleAddTableView: handleCreateRepresentation,

    handleCreateRepresentation,
    handleSelectRepresentation,
    handleDeleteRepresentation,
    handleRenameRepresentation,
    handleSaveRepresentation,
    handleSaveAsRepresentation,
    handleDuplicateRepresentation,
    handleSetDefaultRepresentation,

    handleToggleColumnVisibility,

    handleStartDragColumnWithSystem,
    handleDragOverColumnWithSystem,
    handleDropColumnWithSystem,

    toggleRepresentationVisibility,
    moveRepresentation,

    handleOpenFilters,
    handleCloseFilters,
    handleSaveFilters,

    handleFilterChange,
    handleSortChange,
    handleSortDirectionChange,
  };
}