import { normalizeConditions } from "./useTableRepresentationPayload";
import {
  normalizeQuickFilter,
  ensureSingleDefaultFilter,
} from "./useQuickFilters";

export default function useTableFilterActions({
  quickFilters = [],

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
}) {
  const syncQuickFilters = (nextFilters = []) => {
    const normalizedFilters = ensureSingleDefaultFilter(nextFilters);

    setQuickFilters(normalizedFilters);
    dispatchSaveFilters(normalizedFilters);

    return normalizedFilters;
  };

  const handleSaveFilters = ({ conditions, quickFilter }) => {
    const nextConditions = Array.isArray(conditions) ? conditions : [];

    let normalizedQuickFilter = null;

    if (quickFilter) {
      normalizedQuickFilter = normalizeQuickFilter(quickFilter, nextConditions);

      const updatedFilters = [
        ...quickFilters
          .filter(
            (filter) => String(filter.key) !== String(normalizedQuickFilter.key)
          )
          .map((filter) => {
            if (normalizedQuickFilter.isDefault) {
              return {
                ...filter,
                isDefault: false,
                is_default: false,
              };
            }

            return filter;
          }),
        normalizedQuickFilter,
      ];

      syncQuickFilters(updatedFilters);
      setActiveQuickFilterId(normalizedQuickFilter.key);
    } else {
      setActiveConditions(nextConditions);
      setActiveFilter("custom");
      markCurrentViewDirty();
    }

    resetFiltersModalState();

    if (normalizedQuickFilter) {
      dispatchChangeFilter({
        filter: normalizedQuickFilter.key,
        quickFilter: normalizedQuickFilter,
        isQuickFilter: true,
      });

      return;
    }

    dispatchSetConditions({
      filter: "custom",
      conditions: normalizeConditions(nextConditions),
      quickFilter: null,
      isQuickFilter: false,
    });
  };

  const handleFilterChange = (nextFilter) => {
    const nextFilterKey = String(nextFilter || "all");

    if (nextFilterKey === "all") {
      resetTableToAllItems();
      return;
    }

    const selectedQuickFilter = quickFilters.find(
      (filter) => String(filter.key) === nextFilterKey
    );

    if (selectedQuickFilter) {
      setActiveQuickFilterId(nextFilterKey);

      dispatchChangeFilter({
        filter: nextFilterKey,
        quickFilter: selectedQuickFilter,
        isQuickFilter: true,
      });

      return;
    }

    markCurrentViewDirty();

    setActiveFilter(nextFilterKey);

    dispatchChangeFilter({
      filter: nextFilterKey,
      conditions: [],
      isQuickFilter: false,
    });
  };

  return {
    syncQuickFilters,
    handleSaveFilters,
    handleFilterChange,
  };
}