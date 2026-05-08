import { useEffect, useRef } from "react";

import {
  createEmptyTableViewState,
  normalizeSortRules,
} from "./useTableViewState";

import {
  getRepresentationState,
} from "./useTableRepresentationPayload";

export default function useTableRepresentationApply({
  tableBlock,

  representations = [],
  activeRepresentation,
  isRepresentationsHydrated,

  quickFilters = [],

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
}) {
  const hasAppliedInitialViewRef = useRef(false);
  const previousTableBlockIdRef = useRef(null);

  const resetTableToAllItems = () => {
    const emptyState = createEmptyTableViewState();

    resetFilterState?.();
    resetSortState?.();

    syncTableViewState?.(emptyState);

    clearRepresentationDirty?.();
    clearDirty?.();
    clearActiveRepresentation?.();

    dispatchResetFilter?.();

    dispatchChangeSort?.("none");
    dispatchChangeSortDirection?.("asc");

    dispatchSortRules?.([]);

    dispatchTableViewState?.({
      ...emptyState,

      activeFilter: "all",
      activeQuickFilterId: null,

      conditions: [],

      activeSort: "none",
      sortDirection: "asc",
    });
  };

  const applyRepresentationToTable = (
    representation,
    options = {}
  ) => {
    if (!representation || !tableBlock?.id) {
      resetTableToAllItems();
      return;
    }

    const representationState =
      getRepresentationState(representation);

    const quickFilter =
      options.quickFilter || null;

    const nextActiveFilter =
      representation.id;

    const nextActiveQuickFilterId =
      quickFilter?.key || null;

    setActiveConditions?.(
      representationState.conditions
    );

    setActiveFilter?.(
      nextActiveFilter
    );

    setActiveQuickFilterId?.(
      nextActiveQuickFilterId
    );

    setActiveSort?.(
      representationState.activeSort
    );

    setSortDirection?.(
      representationState.sortDirection
    );

    syncTableViewState?.({
      hiddenColumnIds:
        representationState.hiddenColumnIds,

      hiddenColumns:
        representationState.hiddenColumnIds,

      hidden_fields:
        representationState.hiddenColumnIds,

      columnsHidden:
        representationState.hiddenColumnIds,

      columnOrder:
        representationState.columnOrder,

      columnsOrder:
        representationState.columnOrder,

      visibleColumnOrder:
        representationState.columnOrder,

      column_order:
        representationState.columnOrder,

      sortRules: normalizeSortRules(
        representationState.sortRules
      ),
    });

    clearRepresentationDirty?.();
    clearDirty?.();

    dispatchSetConditions?.({
      filter: nextActiveFilter,

      conditions:
        representationState.conditions,

      isQuickFilter: false,
    });

    if (quickFilter) {
      dispatchChangeFilter?.({
        filter: quickFilter.key,
        quickFilter,
        isQuickFilter: true,
      });
    } else {
      dispatchChangeFilter?.({
        filter: null,
        isQuickFilter: true,
      });
    }

    dispatchChangeSort?.(
      representationState.activeSort
    );

    dispatchChangeSortDirection?.(
      representationState.sortDirection
    );

    dispatchSortRules?.(
      representationState.sortRules
    );

    dispatchTableViewState?.({
      ...representationState,

      activeFilter:
        nextActiveFilter,

      activeQuickFilterId:
        nextActiveQuickFilterId,
    });
  };

  const handleSelectRepresentation = (
    representationOrId
  ) => {
    const representation =
      selectRepresentation?.(
        representationOrId
      );

    const defaultQuickFilter =
      quickFilters.find(
        (filter) => filter.isDefault
      ) || null;

    applyRepresentationToTable(
      representation,
      {
        quickFilter:
          defaultQuickFilter,
      }
    );
  };

  useEffect(() => {
    const currentTableBlockId =
      tableBlock?.id ?? null;

    if (
      String(
        previousTableBlockIdRef.current
      ) !==
      String(currentTableBlockId)
    ) {
      previousTableBlockIdRef.current =
        currentTableBlockId;

      hasAppliedInitialViewRef.current =
        false;

      setActiveQuickFilterId?.(null);

      clearDirty?.();

      resetTableViewState?.();
    }
  }, [
    tableBlock?.id,
    clearDirty,
    resetTableViewState,
    setActiveQuickFilterId,
  ]);

  useEffect(() => {
    if (!tableBlock?.id) return;
    if (!isRepresentationsHydrated) return;
    if (hasAppliedInitialViewRef.current)
      return;

    const defaultRepresentation =
      activeRepresentation ||
      representations.find(
        (representation) =>
          representation.isDefault
      ) ||
      representations[0] ||
      null;

    hasAppliedInitialViewRef.current =
      true;

    if (!defaultRepresentation) {
      resetTableToAllItems();
      return;
    }

    const defaultQuickFilter =
      quickFilters.find(
        (filter) => filter.isDefault
      ) || null;

    applyRepresentationToTable(
      defaultRepresentation,
      {
        quickFilter:
          defaultQuickFilter,
      }
    );
  }, [
    tableBlock?.id,
    isRepresentationsHydrated,
    activeRepresentation,
    representations,
    quickFilters,
  ]);

  return {
    resetTableToAllItems,
    applyRepresentationToTable,
    handleSelectRepresentation,
  };
}