import { useEffect } from "react";
import { clearTableSessionDirty } from "../session/tableSessionStore";

import { normalizeSavedFilter } from "../services/tableFilterUtils";

const normalizeIds = (value) => {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        )
      )
    : [];
};

export default function useUniversalTableEvents({
  resolvedBlockId,

  setActiveFilter,
  setActiveQuickFilterId,
  setActiveConditions,
  setActiveSort,
  setSortDirection,
  setSortRules,
  setIsInlineEditMode,
  setIsRepresentationDirty,

  setHiddenColumnIds,
  setColumnOrder,
  setLocalColumnOrder,

  handleAddRowAndUpdateHeight,
  handleMoveRow,
  closeColumnMenu,

  saveFilters,
  handleDeleteSavedFilter,
  handleUpdateSavedFilter,

  setEditingFilter,
  setFiltersModalMode,
  setIsFiltersModalOpen,

  requestTableHeightReport,
  markShouldOpenCreatedRowCard,
  clearShouldOpenCreatedRowCard,
  isEditMode,
  isInlineEditMode,
}) {
  const isCurrentTableEvent = (eventBlockId) => {
    if (!eventBlockId) return false;

    return String(eventBlockId) === String(resolvedBlockId);
  };

  const clearRepresentationDirtyState = () => {
    setIsRepresentationDirty?.(false);
    clearTableSessionDirty({
      blockId: resolvedBlockId,
    });
  };

  const handleOpenFiltersModal = () => {
    setFiltersModalMode?.("create");
    setEditingFilter?.(null);
    setIsFiltersModalOpen?.(true);
  };

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId = event.detail?.blockId;

      if (!isCurrentTableEvent(eventBlockId)) return;

      closeColumnMenu?.();
      setIsInlineEditMode?.((prev) => !prev);
    };

    window.addEventListener(
      "universal-table:toggle-inline-edit",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:toggle-inline-edit",
        handler
      );
    };
  }, [
    resolvedBlockId,
    closeColumnMenu,
    setIsInlineEditMode,
  ]);

  useEffect(() => {
    const handler = async (event) => {
      const eventBlockId = event.detail?.blockId;

      if (!isCurrentTableEvent(eventBlockId)) return;

      const position =
        event.detail?.position === "top"
          ? "top"
          : "bottom";

      const openCard =
        event.detail?.openCard !== false;

      const focusFirstCell =
        event.detail?.focusFirstCell !== false;

      await handleAddRowAndUpdateHeight?.({
        position,
        openCard,
        focusFirstCell,
      });

      requestTableHeightReport?.();
    };

    window.addEventListener(
      "universal-table:add-row",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:add-row",
        handler
      );
    };
  }, [
    resolvedBlockId,
    handleAddRowAndUpdateHeight,
    requestTableHeightReport,
    isEditMode,
    isInlineEditMode,
  ]);

  useEffect(() => {
    const handler = async (event) => {
      const eventBlockId =
        event.detail?.blockId;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      await handleMoveRow?.(
        event.detail || {}
      );

      requestTableHeightReport?.();
    };

    window.addEventListener(
      "universal-table:move-row",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:move-row",
        handler
      );
    };
  }, [
    resolvedBlockId,
    handleMoveRow,
    requestTableHeightReport,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      if (
        eventBlockId &&
        !isCurrentTableEvent(eventBlockId)
      ) {
        return;
      }

      setActiveFilter?.("all");
      setActiveQuickFilterId?.(null);
      setActiveConditions?.([]);

      setActiveSort?.("none");
      setSortDirection?.("asc");
      setSortRules?.([]);

      setHiddenColumnIds?.([]);
      setColumnOrder?.([]);
      setLocalColumnOrder?.([]);

      clearRepresentationDirtyState();

      requestTableHeightReport?.();
    };

    window.addEventListener(
      "universal-table:reset-filter",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:reset-filter",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
    setActiveSort,
    setSortDirection,
    setSortRules,
    setHiddenColumnIds,
    setColumnOrder,
    setLocalColumnOrder,
    requestTableHeightReport,
    setIsRepresentationDirty,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const filter =
        event.detail?.filter;

      const conditions =
        event.detail?.conditions;

      const isQuickFilter = Boolean(
        event.detail?.isQuickFilter
      );

      if (!isCurrentTableEvent(eventBlockId))
        return;

      if (isQuickFilter) {
        setActiveQuickFilterId?.(
          filter || null
        );

        return;
      }

      setActiveFilter?.(
        filter || "all"
      );

      setActiveQuickFilterId?.(null);

      setActiveConditions?.(
        Array.isArray(conditions)
          ? conditions
          : []
      );
    };

    window.addEventListener(
      "universal-table:change-filter",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:change-filter",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const filter =
        event.detail?.filter;

      const conditions =
        event.detail?.conditions;

      const isQuickFilter = Boolean(
        event.detail?.isQuickFilter
      );

      if (!isCurrentTableEvent(eventBlockId))
        return;

      if (isQuickFilter) {
        setActiveQuickFilterId?.(
          filter || null
        );

        return;
      }

      setActiveFilter?.(
        filter || "custom"
      );

      setActiveQuickFilterId?.(null);

      setActiveConditions?.(
        Array.isArray(conditions)
          ? conditions
          : []
      );
    };

    window.addEventListener(
      "universal-table:set-conditions",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:set-conditions",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const sort =
        event.detail?.sort;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      setActiveSort?.(
        sort || "none"
      );
    };

    window.addEventListener(
      "universal-table:change-sort",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:change-sort",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setActiveSort,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const direction =
        event.detail?.direction;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      setSortDirection?.(
        direction === "desc"
          ? "desc"
          : "asc"
      );
    };

    window.addEventListener(
      "universal-table:change-sort-direction",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:change-sort-direction",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setSortDirection,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const nextSortRules =
        event.detail?.sortRules;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      setSortRules?.(
        Array.isArray(nextSortRules)
          ? nextSortRules
          : []
      );
    };

    window.addEventListener(
      "universal-table:change-sort-rules",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:change-sort-rules",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setSortRules,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      const {
        hiddenColumnIds,
        hiddenColumns,
        hidden_fields,
        columnsHidden,

        columnOrder,
        columnsOrder,
        visibleColumnOrder,
        column_order,

        sortRules,

        activeFilter,
        activeQuickFilterId,
        activeConditions,

        activeSort,
        sortDirection,
      } = event.detail || {};

      const nextHiddenColumnIds =
        normalizeIds(
          hiddenColumnIds ||
            hiddenColumns ||
            hidden_fields ||
            columnsHidden
        );

      const nextColumnOrder =
        normalizeIds(
          columnOrder ||
            columnsOrder ||
            visibleColumnOrder ||
            column_order
        );

      const nextSortRules =
        Array.isArray(sortRules)
          ? sortRules
          : [];

      setHiddenColumnIds?.(
        nextHiddenColumnIds
      );

      setColumnOrder?.(
        nextColumnOrder
      );

      setLocalColumnOrder?.(
        nextColumnOrder
      );

      setSortRules?.(
        nextSortRules
      );

      setActiveFilter?.(
        activeFilter || "all"
      );

      setActiveQuickFilterId?.(
        activeQuickFilterId || null
      );

      setActiveConditions?.(
        Array.isArray(activeConditions)
          ? activeConditions
          : []
      );

      setActiveSort?.(
        activeSort || "none"
      );

      setSortDirection?.(
        sortDirection === "desc"
          ? "desc"
          : "asc"
      );

      closeColumnMenu?.();

      clearRepresentationDirtyState();

      requestTableHeightReport?.();
    };

    window.addEventListener(
      "universal-table:apply-view-state",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:apply-view-state",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setHiddenColumnIds,
    setColumnOrder,
    setLocalColumnOrder,
    setSortRules,
    setActiveFilter,
    setActiveQuickFilterId,
    setActiveConditions,
    setActiveSort,
    setSortDirection,
    closeColumnMenu,
    requestTableHeightReport,
    setIsRepresentationDirty,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      const nextHiddenColumnIds =
        normalizeIds(
          event.detail?.hiddenColumnIds ||
            event.detail?.hiddenColumns ||
            event.detail?.hidden_fields ||
            event.detail?.columnsHidden
        );

      setHiddenColumnIds?.(
        nextHiddenColumnIds
      );

      closeColumnMenu?.();

      requestTableHeightReport?.();
    };

    window.addEventListener(
      "universal-table:update-hidden-columns",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:update-hidden-columns",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setHiddenColumnIds,
    closeColumnMenu,
    requestTableHeightReport,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      if (
        eventBlockId &&
        resolvedBlockId &&
        String(eventBlockId) !==
          String(resolvedBlockId)
      ) {
        return;
      }

      handleOpenFiltersModal();
    };

    window.addEventListener(
      "universal-table:open-filters",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:open-filters",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setEditingFilter,
    setFiltersModalMode,
    setIsFiltersModalOpen,
  ]);

  useEffect(() => {
    const handler = async (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const filters =
        event.detail?.filters;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      await saveFilters?.(
        filters || []
      );
    };

    window.addEventListener(
      "universal-table:save-filters",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:save-filters",
        handler
      );
    };
  }, [
    resolvedBlockId,
    saveFilters,
  ]);

  useEffect(() => {
    const handler = async (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const filter =
        event.detail?.filter;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      if (!filter) return;

      await handleDeleteSavedFilter?.(
        filter
      );
    };

    window.addEventListener(
      "universal-table:delete-filter",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:delete-filter",
        handler
      );
    };
  }, [
    resolvedBlockId,
    handleDeleteSavedFilter,
  ]);

  useEffect(() => {
    const handler = (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const filter =
        event.detail?.filter;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      if (!filter) return;

      setEditingFilter?.(
        normalizeSavedFilter(filter)
      );

      setFiltersModalMode?.(
        "edit"
      );

      setIsFiltersModalOpen?.(
        true
      );
    };

    window.addEventListener(
      "universal-table:edit-filter",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:edit-filter",
        handler
      );
    };
  }, [
    resolvedBlockId,
    setEditingFilter,
    setFiltersModalMode,
    setIsFiltersModalOpen,
  ]);

  useEffect(() => {
    const handler = async (event) => {
      const eventBlockId =
        event.detail?.blockId;

      const filter =
        event.detail?.filter;

      if (!isCurrentTableEvent(eventBlockId))
        return;

      if (!filter) return;

      await handleUpdateSavedFilter?.(
        filter
      );
    };

    window.addEventListener(
      "universal-table:update-filter",
      handler
    );

    return () => {
      window.removeEventListener(
        "universal-table:update-filter",
        handler
      );
    };
  }, [
    resolvedBlockId,
    handleUpdateSavedFilter,
  ]);

  return {
    handleOpenFiltersModal,
  };
}