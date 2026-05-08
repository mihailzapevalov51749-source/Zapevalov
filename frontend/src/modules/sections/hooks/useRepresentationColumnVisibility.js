import {
  normalizeIds,
  normalizeColumnId,
} from "../../universalTable/helpers/tableColumnIdentity";

export default function useRepresentationColumnVisibility({
  activeFilter,
  activeQuickFilterId,
  activeConditions,
  activeSort,
  sortDirection,

  getCurrentViewState,
  syncTableViewState,

  markCurrentViewDirty,

  dispatchUpdateHiddenColumns,
  dispatchTableViewState,
}) {
  const handleToggleColumnVisibility = (payload) => {
    const isObjectPayload =
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload);

    const columnId = normalizeColumnId(
      isObjectPayload
        ? payload.columnId || payload.id || payload.key
        : payload
    );

    if (!columnId) {
      return [];
    }

    const currentViewState =
      getCurrentViewState?.() || {};

    const currentHiddenIds = normalizeIds(
      currentViewState.hiddenColumnIds || []
    );

    const isCurrentlyHidden =
      currentHiddenIds.includes(columnId);

    const shouldHide =
      isObjectPayload &&
      typeof payload.hidden === "boolean"
        ? payload.hidden
        : !isCurrentlyHidden;

    const nextHiddenIds = shouldHide
      ? normalizeIds([
          ...currentHiddenIds,
          columnId,
        ])
      : currentHiddenIds.filter(
          (id) => String(id) !== String(columnId)
        );

    const currentColumnOrder = normalizeIds(
      currentViewState.columnOrder || []
    );

    const nextState = {
      ...currentViewState,

      hiddenColumnIds: nextHiddenIds,
      columnOrder: currentColumnOrder,

      activeFilter:
        currentViewState.activeFilter ??
        activeFilter ??
        "all",

      activeQuickFilterId:
        currentViewState.activeQuickFilterId ??
        activeQuickFilterId ??
        null,

      conditions: Array.isArray(
        currentViewState.conditions
      )
        ? currentViewState.conditions
        : activeConditions || [],

      activeSort:
        currentViewState.activeSort ??
        activeSort ??
        "none",

      sortDirection:
        currentViewState.sortDirection ??
        sortDirection ??
        "asc",
    };

    const syncedState =
      syncTableViewState?.(nextState) ||
      nextState;

    markCurrentViewDirty?.();

    dispatchUpdateHiddenColumns?.(
      nextHiddenIds
    );

    dispatchTableViewState?.(
      syncedState
    );

    return nextHiddenIds;
  };

  return {
    handleToggleColumnVisibility,
  };
}