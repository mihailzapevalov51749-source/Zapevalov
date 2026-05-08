import { useRef, useState } from "react";

export function normalizeIds(value) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        )
      )
    : [];
}

export function normalizeSortRules(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeConditions(value) {
  return Array.isArray(value) ? value : [];
}

export function createEmptyTableViewState() {
  return {
    hiddenColumnIds: [],
    hiddenColumns: [],
    hidden_fields: [],
    columnsHidden: [],

    columnOrder: [],
    columnsOrder: [],
    visibleColumnOrder: [],
    column_order: [],

    activeFilter: "all",
    active_filter: "all",

    activeQuickFilterId: null,
    active_quick_filter_id: null,

    conditions: [],
    activeConditions: [],

    activeSort: "none",
    active_sort: "none",

    sortDirection: "asc",
    sort_direction: "asc",

    sortRules: [],
    sort_rules: [],
  };
}

export default function useTableViewState() {
  const [tableViewState, setTableViewState] = useState(
    createEmptyTableViewState
  );

  const tableViewStateRef = useRef(createEmptyTableViewState());

  const normalizeTableViewState = (state = {}) => {
    const hiddenColumnIds = normalizeIds(
      state.hiddenColumnIds ||
        state.hiddenColumns ||
        state.hidden_fields ||
        state.columnsHidden
    );

    const columnOrder = normalizeIds(
      state.columnOrder ||
        state.columnsOrder ||
        state.visibleColumnOrder ||
        state.column_order
    );

    const activeFilter = state.activeFilter ?? state.active_filter ?? "all";

    const activeQuickFilterId =
      state.activeQuickFilterId ?? state.active_quick_filter_id ?? null;

    const conditions = normalizeConditions(
      state.conditions || state.activeConditions
    );

    const activeSort = state.activeSort ?? state.active_sort ?? "none";

    const sortDirection =
      state.sortDirection ?? state.sort_direction ?? "asc";

    const sortRules = normalizeSortRules(state.sortRules || state.sort_rules);

    return {
      hiddenColumnIds,
      hiddenColumns: hiddenColumnIds,
      hidden_fields: hiddenColumnIds,
      columnsHidden: hiddenColumnIds,

      columnOrder,
      columnsOrder: columnOrder,
      visibleColumnOrder: columnOrder,
      column_order: columnOrder,

      activeFilter,
      active_filter: activeFilter,

      activeQuickFilterId,
      active_quick_filter_id: activeQuickFilterId,

      conditions,
      activeConditions: conditions,

      activeSort,
      active_sort: activeSort,

      sortDirection,
      sort_direction: sortDirection,

      sortRules,
      sort_rules: sortRules,
    };
  };

  const syncTableViewState = (nextState = {}) => {
    const previousState =
      tableViewStateRef.current || createEmptyTableViewState();

    const mergedState = {
      ...previousState,
      ...nextState,
    };

    const normalizedState = normalizeTableViewState(mergedState);

    tableViewStateRef.current = normalizedState;

    setTableViewState(() => normalizedState);

    return normalizedState;
  };

  const getCurrentViewState = () => {
    return tableViewStateRef.current || createEmptyTableViewState();
  };

  const getLatestViewState = () => {
    return tableViewStateRef.current || createEmptyTableViewState();
  };

  const resetTableViewState = () => {
    return syncTableViewState(createEmptyTableViewState());
  };

  return {
    tableViewState,
    tableViewStateRef,

    syncTableViewState,
    getCurrentViewState,
    getLatestViewState,
    resetTableViewState,

    createEmptyTableViewState,
    normalizeIds,
    normalizeSortRules,
    normalizeConditions,
  };
}