import { useEffect } from "react";

export default function useTableStateEvents({
  tableBlock,

  markCurrentViewDirty,

  syncTableViewState,

  setActiveFilter,
  setActiveQuickFilterId,
  setActiveConditions,
  setActiveSort,
  setSortDirection,
}) {
  useEffect(() => {
    const handler = (event) => {
      const { blockId } = event.detail || {};

      if (!blockId) return;
      if (String(blockId) !== String(tableBlock?.id)) return;

      markCurrentViewDirty?.();
    };

    window.addEventListener("universal-table:mark-dirty", handler);

    return () => {
      window.removeEventListener("universal-table:mark-dirty", handler);
    };
  }, [tableBlock?.id, markCurrentViewDirty]);

  useEffect(() => {
    const handler = (event) => {
      const {
        blockId,
        hiddenColumnIds,
        hiddenColumns,
        hidden_fields,
        columnsHidden,
        columnOrder,
        columnsOrder,
        visibleColumnOrder,
        column_order,
        sortRules,
        sort_rules,
        activeFilter: eventActiveFilter,
        active_filter,
        activeQuickFilterId: eventActiveQuickFilterId,
        active_quick_filter_id,
        conditions,
        activeConditions: eventActiveConditions,
        activeSort: eventActiveSort,
        active_sort,
        sortDirection: eventSortDirection,
        sort_direction,
      } = event.detail || {};

      if (!blockId) return;
      if (String(blockId) !== String(tableBlock?.id)) return;

      const nextHiddenColumnIds =
        hiddenColumnIds ||
        hiddenColumns ||
        hidden_fields ||
        columnsHidden;

      const nextColumnOrder =
        columnOrder ||
        columnsOrder ||
        visibleColumnOrder ||
        column_order;

      const nextSortRules =
        sortRules ||
        sort_rules;

      const nextActiveFilter =
        eventActiveFilter ??
        active_filter;

      const nextActiveQuickFilterId =
        eventActiveQuickFilterId ??
        active_quick_filter_id;

      const nextActiveSort =
        eventActiveSort ??
        active_sort;

      const nextSortDirection =
        eventSortDirection ??
        sort_direction;

      const nextConditions = Array.isArray(eventActiveConditions)
        ? eventActiveConditions
        : Array.isArray(conditions)
          ? conditions
          : [];

      const nextState = {
        hiddenColumnIds: Array.isArray(nextHiddenColumnIds)
          ? nextHiddenColumnIds
          : undefined,

        columnOrder: Array.isArray(nextColumnOrder)
          ? nextColumnOrder
          : undefined,

        sortRules: Array.isArray(nextSortRules)
          ? nextSortRules
          : undefined,

        activeFilter:
          nextActiveFilter !== undefined
            ? nextActiveFilter || "all"
            : undefined,

        activeQuickFilterId:
          nextActiveQuickFilterId !== undefined
            ? nextActiveQuickFilterId || null
            : undefined,

        conditions: nextConditions,
        activeConditions: nextConditions,

        activeSort:
          nextActiveSort !== undefined
            ? nextActiveSort || "none"
            : undefined,

        sortDirection:
          nextSortDirection !== undefined
            ? nextSortDirection || "asc"
            : undefined,
      };

      Object.keys(nextState).forEach((key) => {
        if (nextState[key] === undefined) {
          delete nextState[key];
        }
      });

      syncTableViewState?.(nextState);

      if (nextActiveFilter !== undefined) {
        setActiveFilter?.(nextActiveFilter || "all");
      }

      if (nextActiveQuickFilterId !== undefined) {
        setActiveQuickFilterId?.(nextActiveQuickFilterId || null);
      }

      setActiveConditions?.(nextConditions);

      if (nextActiveSort !== undefined) {
        setActiveSort?.(nextActiveSort || "none");
      }

      if (nextSortDirection !== undefined) {
        setSortDirection?.(nextSortDirection || "asc");
      }
    };

    window.addEventListener("universal-table:state-changed", handler);

    return () => {
      window.removeEventListener("universal-table:state-changed", handler);
    };
  }, [
    tableBlock?.id,
    syncTableViewState,
    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
    setActiveSort,
    setSortDirection,
  ]);
}