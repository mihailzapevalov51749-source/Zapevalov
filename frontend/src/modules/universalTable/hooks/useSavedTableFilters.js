import { useEffect, useMemo, useState } from "react";

import {
  normalizeSavedFilter,
  getUniqueSavedFilters,
} from "../services/tableFilterUtils";

function isQuickFilter(filter) {
  return Boolean(
    filter?.isQuick ??
      filter?.isQuickFilter ??
      filter?.is_quick ??
      filter?.quick ??
      false
  );
}

export default function useSavedTableFilters({
  table,
  block,
  activeFilter,
  setActiveFilter,
  setActiveConditions,
  handleSaveFiltersToSettings,
}) {
  const [localSavedFilters, setLocalSavedFilters] = useState([]);

  const settingsFilters = useMemo(() => {
    const filters =
      table?.settings?.filters ||
      table?.settings?.quickFilters ||
      block?.settings?.filters ||
      [];

    return Array.isArray(filters) ? getUniqueSavedFilters(filters) : [];
  }, [
    table?.settings?.filters,
    table?.settings?.quickFilters,
    block?.settings?.filters,
  ]);

  useEffect(() => {
    if (!settingsFilters.length) return;
    setLocalSavedFilters(settingsFilters);
  }, [settingsFilters]);

  const savedFilters = useMemo(() => {
    return getUniqueSavedFilters(
      localSavedFilters.length ? localSavedFilters : settingsFilters
    );
  }, [localSavedFilters, settingsFilters]);

  const saveFilters = async (filters = []) => {
    const uniqueFilters = getUniqueSavedFilters(filters);

    setLocalSavedFilters(uniqueFilters);

    await handleSaveFiltersToSettings?.(uniqueFilters);

    return uniqueFilters;
  };

  const handleDeleteSavedFilter = async (filterToDelete) => {
    const normalizedTarget = normalizeSavedFilter(filterToDelete);

    const nextFilters = savedFilters.filter((filter) => {
      const normalizedFilter = normalizeSavedFilter(filter);

      return (
        String(normalizedFilter.key || normalizedFilter.id) !==
        String(normalizedTarget.key || normalizedTarget.id)
      );
    });

    if (String(activeFilter) === String(normalizedTarget.key)) {
      setActiveFilter("all");

      // ВАЖНО:
      // если удаляем быстрый фильтр, не трогаем activeConditions,
      // потому что там могут лежать условия активного представления.
      if (!isQuickFilter(normalizedTarget)) {
        setActiveConditions([]);
      }
    }

    await saveFilters(nextFilters);
  };

  const handleUpdateSavedFilter = async (updatedFilter) => {
    const normalizedUpdated = normalizeSavedFilter(updatedFilter);

    const nextFilters = savedFilters.map((filter) => {
      const normalizedFilter = normalizeSavedFilter(filter);

      if (
        String(normalizedFilter.key || normalizedFilter.id) ===
        String(normalizedUpdated.key || normalizedUpdated.id)
      ) {
        return normalizedUpdated;
      }

      if (normalizedUpdated.isDefault) {
        return {
          ...normalizedFilter,
          isDefault: false,
          is_default: false,
        };
      }

      return normalizedFilter;
    });

    await saveFilters(nextFilters);

    if (String(activeFilter) === String(normalizedUpdated.key)) {
      // ВАЖНО:
      // быстрый фильтр не должен затирать условия представления.
      if (!isQuickFilter(normalizedUpdated)) {
        setActiveConditions(normalizedUpdated.conditions);
      }
    }
  };

  return {
    savedFilters,
    saveFilters,
    handleDeleteSavedFilter,
    handleUpdateSavedFilter,
  };
}