import {
  normalizeIds,
  normalizeSortRules,
} from "./useTableViewState";

function normalizeConditions(value) {
  return Array.isArray(value) ? value : [];
}

export default function useUniversalTableDispatch({
  tableBlock,
  section,
}) {
  const getBaseDetail = () => ({
    blockId: tableBlock?.id,
    sectionId: section?.id,
  });

  const canDispatch = () =>
    Boolean(tableBlock?.id);

  const dispatchStateChanged = (
    detail = {}
  ) => {
    if (!canDispatch()) return;

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:state-changed",
        {
          detail: {
            ...getBaseDetail(),
            ...detail,
          },
        }
      )
    );
  };

  const dispatchTableViewState = (
    nextState = {}
  ) => {
    if (!canDispatch()) return;

    const hiddenColumnIds =
      normalizeIds(
        nextState.hiddenColumnIds ||
          nextState.hiddenColumns ||
          nextState.hidden_fields ||
          nextState.columnsHidden
      );

    const columnOrder =
      normalizeIds(
        nextState.columnOrder ||
          nextState.columnsOrder ||
          nextState.visibleColumnOrder ||
          nextState.column_order
      );

    const sortRules =
      normalizeSortRules(
        nextState.sortRules ||
          nextState.sort_rules
      );

    const activeConditions =
      normalizeConditions(
        nextState.activeConditions ||
          nextState.conditions
      );

    const detail = {
      hiddenColumnIds,
      hiddenColumns:
        hiddenColumnIds,
      hidden_fields:
        hiddenColumnIds,
      columnsHidden:
        hiddenColumnIds,

      columnOrder,
      columnsOrder:
        columnOrder,
      visibleColumnOrder:
        columnOrder,
      column_order:
        columnOrder,

      sortRules,
      sort_rules:
        sortRules,

      activeFilter:
        nextState.activeFilter ??
        nextState.active_filter ??
        "all",

      activeQuickFilterId:
        nextState.activeQuickFilterId ??
        nextState.active_quick_filter_id ??
        null,

      activeConditions,
      conditions:
        activeConditions,

      activeSort:
        nextState.activeSort ??
        nextState.active_sort ??
        "none",

      sortDirection:
        nextState.sortDirection ??
        nextState.sort_direction ??
        "asc",
    };

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:apply-view-state",
        {
          detail: {
            ...getBaseDetail(),
            ...detail,
          },
        }
      )
    );

    dispatchStateChanged(detail);
  };

  const dispatchSortRules = (
    nextSortRules = []
  ) => {
    if (!canDispatch()) return;

    const sortRules =
      Array.isArray(nextSortRules)
        ? nextSortRules
        : [];

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:change-sort-rules",
        {
          detail: {
            ...getBaseDetail(),
            sortRules,
          },
        }
      )
    );

    dispatchStateChanged({
      sortRules,
    });
  };

  const dispatchResetFilter = () => {
    if (!canDispatch()) return;

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:reset-filter",
        {
          detail: getBaseDetail(),
        }
      )
    );

    dispatchStateChanged({
      activeFilter: "all",
      activeQuickFilterId:
        null,
      activeConditions: [],
    });
  };

  const dispatchChangeSort = (
    sort = "none"
  ) => {
    if (!canDispatch()) return;

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:change-sort",
        {
          detail: {
            ...getBaseDetail(),
            sort,
          },
        }
      )
    );

    dispatchStateChanged({
      activeSort:
        sort || "none",
    });
  };

  const dispatchChangeSortDirection = (
    direction = "asc"
  ) => {
    if (!canDispatch()) return;

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:change-sort-direction",
        {
          detail: {
            ...getBaseDetail(),
            direction,
          },
        }
      )
    );

    dispatchStateChanged({
      sortDirection:
        direction || "asc",
    });
  };

  const dispatchSaveFilters = (
    filters = []
  ) => {
    if (!canDispatch()) return;

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:save-filters",
        {
          detail: {
            ...getBaseDetail(),
            filters,
          },
        }
      )
    );
  };

  const dispatchSetConditions = ({
    filter = "custom",
    conditions = [],
    quickFilter = null,
    isQuickFilter = false,
  } = {}) => {
    if (!canDispatch()) return;

    const nextConditions =
      normalizeConditions(
        conditions
      );

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:set-conditions",
        {
          detail: {
            ...getBaseDetail(),
            filter,
            conditions:
              nextConditions,
            quickFilter,
            isQuickFilter,
          },
        }
      )
    );

    dispatchStateChanged({
      activeFilter: filter,
      activeQuickFilterId:
        quickFilter?.key ||
        null,

      activeConditions:
        nextConditions,

      conditions:
        nextConditions,
    });
  };

  const dispatchChangeFilter = ({
    filter = null,
    conditions = [],
    quickFilter = null,
    isQuickFilter = false,
  } = {}) => {
    if (!canDispatch()) return;

    const nextConditions =
      normalizeConditions(
        conditions
      );

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:change-filter",
        {
          detail: {
            ...getBaseDetail(),
            filter,
            conditions:
              nextConditions,
            quickFilter,
            isQuickFilter,
          },
        }
      )
    );

    dispatchStateChanged({
      activeFilter:
        filter || "all",

      activeQuickFilterId:
        quickFilter?.key ||
        null,

      activeConditions:
        nextConditions,

      conditions:
        nextConditions,
    });
  };

  const dispatchUpdateHiddenColumns = (
    hiddenColumnIds = []
  ) => {
    if (!canDispatch()) return;

    const nextHiddenColumnIds =
      normalizeIds(
        hiddenColumnIds
      );

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:update-hidden-columns",
        {
          detail: {
            ...getBaseDetail(),

            hiddenColumnIds:
              nextHiddenColumnIds,

            hiddenColumns:
              nextHiddenColumnIds,

            hidden_fields:
              nextHiddenColumnIds,

            columnsHidden:
              nextHiddenColumnIds,
          },
        }
      )
    );

    dispatchStateChanged({
      hiddenColumnIds:
        nextHiddenColumnIds,

      hiddenColumns:
        nextHiddenColumnIds,

      hidden_fields:
        nextHiddenColumnIds,

      columnsHidden:
        nextHiddenColumnIds,
    });
  };

  const dispatchToggleInlineEdit =
    () => {
      if (!canDispatch()) return;

      window.dispatchEvent(
        new CustomEvent(
          "universal-table:toggle-inline-edit",
          {
            detail:
              getBaseDetail(),
          }
        )
      );
    };

  const dispatchAddRow = () => {
    if (!canDispatch()) return;

    window.dispatchEvent(
      new CustomEvent(
        "universal-table:add-row",
        {
          detail: getBaseDetail(),
        }
      )
    );
  };

  return {
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
  };
}