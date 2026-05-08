import { useEffect } from "react";

import {
  normalizeQuickFilter,
  ensureSingleDefaultFilter,
} from "./useQuickFilters";

export default function useQuickFilterEvents({
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
}) {
  useEffect(() => {
    const handleUpdateFilter = (event) => {
      const { blockId, filter } = event.detail || {};

      if (!blockId || String(blockId) !== String(tableBlock?.id)) return;

      const normalizedFilter = normalizeQuickFilter(filter);

      if (!normalizedFilter.isQuick) {
        setActiveFilter("custom");
        setActiveConditions(normalizedFilter.conditions || []);
        markCurrentViewDirty();

        dispatchSetConditions({
          filter: "custom",
          conditions: normalizedFilter.conditions || [],
          quickFilter: null,
          isQuickFilter: false,
        });

        return;
      }

      setQuickFilters((prev) => {
        const currentFilters = Array.isArray(prev) ? prev : [];
        const exists = currentFilters.some(
          (item) => String(item.key) === String(normalizedFilter.key)
        );

        const nextFilters = ensureSingleDefaultFilter(
          exists
            ? currentFilters.map((item) => {
                if (String(item.key) === String(normalizedFilter.key)) {
                  return normalizedFilter;
                }

                if (normalizedFilter.isDefault) {
                  return {
                    ...item,
                    isDefault: false,
                    is_default: false,
                  };
                }

                return item;
              })
            : [
                ...currentFilters.map((item) => {
                  if (normalizedFilter.isDefault) {
                    return {
                      ...item,
                      isDefault: false,
                      is_default: false,
                    };
                  }

                  return item;
                }),
                normalizedFilter,
              ]
        );

        dispatchSaveFilters(nextFilters);

        return nextFilters;
      });

      setActiveQuickFilterId(normalizedFilter.key);

      dispatchChangeFilter({
        filter: normalizedFilter.key,
        quickFilter: normalizedFilter,
        isQuickFilter: true,
      });
    };

    const handleDeleteFilter = (event) => {
      const { blockId, filter } = event.detail || {};

      if (!blockId || String(blockId) !== String(tableBlock?.id)) return;

      const normalizedFilter = normalizeQuickFilter(filter);
      const filterKey = String(
        normalizedFilter?.key ?? normalizedFilter?.id ?? ""
      );

      setQuickFilters((prev) => {
        const currentFilters = Array.isArray(prev) ? prev : [];
        const nextFilters = ensureSingleDefaultFilter(
          currentFilters.filter((item) => String(item.key) !== filterKey)
        );

        dispatchSaveFilters(nextFilters);

        return nextFilters;
      });

      if (String(activeQuickFilterId) === filterKey) {
        setActiveQuickFilterId(null);

        dispatchChangeFilter({
          filter: null,
          isQuickFilter: true,
        });
      }

      resetFiltersModalState();
    };

    const handleEditFilter = (event) => {
      const { blockId, filter } = event.detail || {};

      if (!blockId || String(blockId) !== String(tableBlock?.id)) return;

      openEditFilterModal(normalizeQuickFilter(filter));
    };

    window.addEventListener("universal-table:update-filter", handleUpdateFilter);
    window.addEventListener("universal-table:delete-filter", handleDeleteFilter);
    window.addEventListener("universal-table:edit-filter", handleEditFilter);

    return () => {
      window.removeEventListener(
        "universal-table:update-filter",
        handleUpdateFilter
      );
      window.removeEventListener(
        "universal-table:delete-filter",
        handleDeleteFilter
      );
      window.removeEventListener(
        "universal-table:edit-filter",
        handleEditFilter
      );
    };
  }, [
    tableBlock?.id,
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
  ]);
}