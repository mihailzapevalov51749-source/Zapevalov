import { useMemo, useState } from "react";

import useSavedTableFilters from "./useSavedTableFilters";

import {
  normalizeSavedFilter,
} from "../services/tableFilterUtils";

import {
  isQuickFilter,
} from "../services/tableNormalization";

export default function useTableFiltersState({
  table,
  block,
  handleSaveFiltersToSettings,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);
  const [activeConditions, setActiveConditions] = useState([]);

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [filtersModalMode, setFiltersModalMode] = useState("create");
  const [editingFilter, setEditingFilter] = useState(null);

  const {
    savedFilters,
    saveFilters,
    handleDeleteSavedFilter,
    handleUpdateSavedFilter,
  } = useSavedTableFilters({
    table,
    block,
    activeFilter,
    setActiveFilter,
    setActiveConditions,
    handleSaveFiltersToSettings,
  });

  const normalizedSavedFilters = useMemo(() => {
    return Array.isArray(savedFilters)
      ? savedFilters.map((filter) =>
          normalizeSavedFilter(filter)
        )
      : [];
  }, [savedFilters]);

  const activeQuickFilter = useMemo(() => {
    if (!activeQuickFilterId) return null;

    return (
      normalizedSavedFilters.find(
        (filter) =>
          isQuickFilter(filter) &&
          String(filter.key) ===
            String(activeQuickFilterId)
      ) || null
    );
  }, [
    normalizedSavedFilters,
    activeQuickFilterId,
  ]);

  const baseConditions = useMemo(() => {
    return Array.isArray(activeConditions)
      ? activeConditions
      : [];
  }, [activeConditions]);

  const quickFilterConditions = useMemo(() => {
    if (!activeQuickFilter) return [];

    return Array.isArray(
      activeQuickFilter.conditions
    )
      ? activeQuickFilter.conditions
      : [];
  }, [activeQuickFilter]);

  const handleSetActiveFilter = (
    nextActiveFilter
  ) => {
    setActiveFilter(nextActiveFilter);
  };

  const handleSetActiveQuickFilter = (
    nextQuickFilterId
  ) => {
    setActiveQuickFilterId((prev) => {
      const normalizedPrev = prev
        ? String(prev)
        : null;

      const normalizedNext =
        nextQuickFilterId
          ? String(nextQuickFilterId)
          : null;

      return normalizedPrev === normalizedNext
        ? null
        : normalizedNext;
    });
  };

  const handleDeleteSavedFilterAndResetState =
    async (filterKey) => {
      const normalizedFilterKey = filterKey
        ? String(filterKey)
        : "";

      if (
        normalizedFilterKey &&
        String(activeQuickFilterId || "") ===
          normalizedFilterKey
      ) {
        setActiveQuickFilterId(null);
      }

      if (
        normalizedFilterKey &&
        String(activeFilter) ===
          normalizedFilterKey
      ) {
        setActiveFilter("all");
        setActiveConditions([]);
      }

      return handleDeleteSavedFilter?.(
        filterKey
      );
    };

  const handleUpdateSavedFilterAndSyncState =
    async (nextFilter) => {
      const normalizedFilter =
        normalizeSavedFilter(nextFilter);

      const result =
        await handleUpdateSavedFilter?.(
          normalizedFilter
        );

      if (
        normalizedFilter?.key &&
        String(activeQuickFilterId || "") ===
          String(normalizedFilter.key)
      ) {
        setActiveQuickFilterId(
          normalizedFilter.key
        );
      }

      if (
        normalizedFilter?.key &&
        String(activeFilter || "") ===
          String(normalizedFilter.key) &&
        !isQuickFilter(normalizedFilter)
      ) {
        setActiveConditions(
          Array.isArray(
            normalizedFilter.conditions
          )
            ? normalizedFilter.conditions
            : []
        );
      }

      return result;
    };

  const handleCloseFiltersModal = () => {
    setIsFiltersModalOpen(false);
    setFiltersModalMode("create");
    setEditingFilter(null);
  };

  return {
    activeFilter,
    setActiveFilter,

    activeQuickFilterId,
    setActiveQuickFilterId,

    activeConditions,
    setActiveConditions,

    isFiltersModalOpen,
    setIsFiltersModalOpen,

    filtersModalMode,
    setFiltersModalMode,

    editingFilter,
    setEditingFilter,

    savedFilters,
    saveFilters,

    normalizedSavedFilters,

    activeQuickFilter,

    baseConditions,
    quickFilterConditions,

    handleSetActiveFilter,
    handleSetActiveQuickFilter,

    handleDeleteSavedFilterAndResetState,
    handleUpdateSavedFilterAndSyncState,

    handleCloseFiltersModal,
  };
}