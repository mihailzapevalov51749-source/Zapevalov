import { useState } from "react";

export default function useTableBasicState() {
  const [isTableInlineActive, setIsTableInlineActive] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);
  const [activeConditions, setActiveConditions] = useState([]);

  const [activeSort, setActiveSort] = useState("none");
  const [sortDirection, setSortDirection] = useState("asc");

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterModalMode, setFilterModalMode] = useState("create");
  const [editingFilter, setEditingFilter] = useState(null);

  const [quickFilters, setQuickFilters] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableRows, setTableRows] = useState([]);

  const resetFilterState = () => {
    setActiveFilter("all");
    setActiveQuickFilterId(null);
    setActiveConditions([]);
  };

  const resetSortState = () => {
    setActiveSort("none");
    setSortDirection("asc");
  };

  const resetFiltersModalState = () => {
    setIsFiltersOpen(false);
    setFilterModalMode("create");
    setEditingFilter(null);
  };

  const openCreateFilterModal = () => {
    setFilterModalMode("create");
    setEditingFilter(null);
    setIsFiltersOpen(true);
  };

  const openEditFilterModal = (filter) => {
    setEditingFilter(filter || null);
    setFilterModalMode("edit");
    setIsFiltersOpen(true);
  };

  const resetTableRuntimeState = () => {
    resetFilterState();
    resetSortState();
  };

  return {
    isTableInlineActive,
    setIsTableInlineActive,

    activeFilter,
    setActiveFilter,
    activeQuickFilterId,
    setActiveQuickFilterId,
    activeConditions,
    setActiveConditions,

    activeSort,
    setActiveSort,
    sortDirection,
    setSortDirection,

    isFiltersOpen,
    setIsFiltersOpen,
    filterModalMode,
    setFilterModalMode,
    editingFilter,
    setEditingFilter,

    quickFilters,
    setQuickFilters,
    tableColumns,
    setTableColumns,
    tableRows,
    setTableRows,

    resetFilterState,
    resetSortState,
    resetFiltersModalState,
    openCreateFilterModal,
    openEditFilterModal,
    resetTableRuntimeState,
  };
}