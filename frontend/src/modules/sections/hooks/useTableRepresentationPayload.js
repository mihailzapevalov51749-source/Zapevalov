import { normalizeIds, normalizeSortRules } from "./useTableViewState";

export function normalizeConditions(value) {
  return Array.isArray(value) ? value : [];
}

export function getRepresentationId(representationOrId) {
  return String(
    representationOrId?.id ??
      representationOrId?.key ??
      representationOrId?.representationId ??
      representationOrId ??
      ""
  );
}

export function getRepresentationName(
  representation,
  fallback = "Представление"
) {
  return (
    representation?.name ||
    representation?.title ||
    representation?.label ||
    fallback
  );
}

export function getRepresentationState(representation = {}) {
  const conditions = normalizeConditions(
    representation.conditions || representation.activeConditions
  );

  const hiddenColumnIds = normalizeIds(
    representation.hiddenColumnIds ||
      representation.hiddenColumns ||
      representation.hidden_fields ||
      representation.columnsHidden
  );

  const columnOrder = normalizeIds(
    representation.columnOrder ||
      representation.columnsOrder ||
      representation.visibleColumnOrder ||
      representation.column_order
  );

  return {
    conditions,
    activeConditions: conditions,

    activeFilter:
      representation.activeFilter ||
      representation.active_filter ||
      representation.id ||
      "custom",

    activeQuickFilterId:
      representation.activeQuickFilterId ||
      representation.active_quick_filter_id ||
      null,

    activeSort: representation.activeSort || representation.active_sort || "none",

    sortDirection:
      representation.sortDirection || representation.sort_direction || "asc",

    sortRules: normalizeSortRules(
      representation.sortRules || representation.sort_rules
    ),

    hiddenColumnIds,
    hiddenColumns: hiddenColumnIds,
    hidden_fields: hiddenColumnIds,
    columnsHidden: hiddenColumnIds,

    columnOrder,
    columnsOrder: columnOrder,
    visibleColumnOrder: columnOrder,
    column_order: columnOrder,
  };
}

export default function useTableRepresentationPayload({
  activeConditions,
  activeFilter,
  activeQuickFilterId,
  activeSort,
  sortDirection,
  getCurrentViewState,
}) {
  const buildCurrentRepresentationPayload = ({
    name,
    isDefault = false,
    isVisible = true,
  } = {}) => {
    const currentViewState = getCurrentViewState?.() || {};

    const nextConditions = normalizeConditions(
      currentViewState.conditions ||
        currentViewState.activeConditions ||
        activeConditions ||
        []
    );

    const nextHiddenColumnIds = normalizeIds(
      currentViewState.hiddenColumnIds ||
        currentViewState.hiddenColumns ||
        currentViewState.hidden_fields ||
        currentViewState.columnsHidden ||
        []
    );

    const nextColumnOrder = normalizeIds(
      currentViewState.columnOrder ||
        currentViewState.columnsOrder ||
        currentViewState.visibleColumnOrder ||
        currentViewState.column_order ||
        []
    );

    const nextSortRules = normalizeSortRules(
      currentViewState.sortRules || currentViewState.sort_rules || []
    );

    const nextActiveFilter =
      currentViewState.activeFilter ??
      currentViewState.active_filter ??
      activeFilter ??
      "all";

    const nextActiveQuickFilterId =
      currentViewState.activeQuickFilterId ??
      currentViewState.active_quick_filter_id ??
      activeQuickFilterId ??
      null;

    const nextActiveSort =
      currentViewState.activeSort ??
      currentViewState.active_sort ??
      activeSort ??
      "none";

    const nextSortDirection =
      currentViewState.sortDirection ??
      currentViewState.sort_direction ??
      sortDirection ??
      "asc";

    console.log("SAVE PAYLOAD SOURCE", {
      currentViewState,
      nextHiddenColumnIds,
      nextColumnOrder,
      nextConditions,
      nextActiveFilter,
      nextActiveQuickFilterId,
      nextActiveSort,
      nextSortDirection,
      nextSortRules,
    });

    return {
      name,
      title: name,
      label: name,

      isDefault,
      is_default: isDefault,
      default: isDefault,

      isVisible,
      is_visible: isVisible,

      conditions: nextConditions,
      activeConditions: nextConditions,

      activeFilter: nextActiveFilter,
      active_filter: nextActiveFilter,

      activeQuickFilterId: nextActiveQuickFilterId,
      active_quick_filter_id: nextActiveQuickFilterId,

      activeSort: nextActiveSort,
      active_sort: nextActiveSort,

      sortDirection: nextSortDirection,
      sort_direction: nextSortDirection,

      sortRules: nextSortRules,
      sort_rules: nextSortRules,

      hiddenColumnIds: nextHiddenColumnIds,
      hiddenColumns: nextHiddenColumnIds,
      hidden_fields: nextHiddenColumnIds,
      columnsHidden: nextHiddenColumnIds,

      columnOrder: nextColumnOrder,
      columnsOrder: nextColumnOrder,
      visibleColumnOrder: nextColumnOrder,
      column_order: nextColumnOrder,
    };
  };

  return {
    buildCurrentRepresentationPayload,
  };
}