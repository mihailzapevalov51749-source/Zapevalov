import { useEffect, useMemo, useRef, useState } from "react";

const MAX_VISIBLE_FILTERS = 4;

export default function TableViewBar({
  hasTable,
  blockId,

  quickFilters = [],

  activeFilter = "all",
  activeQuickFilterId = null,
  onFilterChange,
  onOpenFilters,

  activeView = "table",
  onViewChange,
}) {
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isUserChangedFilter, setIsUserChangedFilter] = useState(false);
  const [draggedFilterKey, setDraggedFilterKey] = useState(null);
  const [dragOverFilterKey, setDragOverFilterKey] = useState(null);
  const [filterOrder, setFilterOrder] = useState([]);

  const moreFiltersRef = useRef(null);

  const storageKey = blockId
    ? `universal-table:${blockId}:quick-filter-order`
    : "";

  const normalizeFilter = (filter) => ({
    ...filter,
    key: String(filter?.key ?? filter?.id ?? ""),
    label: filter?.label || filter?.name || "Без названия",
    conditions: Array.isArray(filter?.conditions) ? filter.conditions : [],
    isDefault: Boolean(
      filter?.isDefault ??
        filter?.is_default ??
        filter?.default ??
        filter?.isDefaultFilter ??
        false
    ),
  });

  const isSameFilter = (a, b) =>
    String(a.label) === String(b.label) &&
    JSON.stringify(a.conditions || []) === JSON.stringify(b.conditions || []);

  const uniqueQuickFilters = useMemo(() => {
    const result = [];

    quickFilters.forEach((filter) => {
      const normalized = normalizeFilter(filter);

      if (!normalized.key) return;

      const exists = result.some((item) => isSameFilter(item, normalized));

      if (!exists) {
        result.push(normalized);
      }
    });

    return result;
  }, [quickFilters]);

  const defaultFilter = useMemo(() => {
    return uniqueQuickFilters.find((filter) => filter.isDefault) || null;
  }, [uniqueQuickFilters]);

  const fixedFilters = useMemo(() => {
    return [
      { key: "all", label: "Все", isSystem: true, conditions: [] },
      ...(defaultFilter ? [defaultFilter] : []),
    ];
  }, [defaultFilter]);

  const movableFilters = useMemo(() => {
    return uniqueQuickFilters.filter(
      (filter) =>
        !defaultFilter || String(filter.key) !== String(defaultFilter.key)
    );
  }, [uniqueQuickFilters, defaultFilter]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const rawValue = window.localStorage.getItem(storageKey);
      const parsedValue = rawValue ? JSON.parse(rawValue) : [];

      setFilterOrder(Array.isArray(parsedValue) ? parsedValue.map(String) : []);
    } catch {
      setFilterOrder([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isMoreFiltersOpen) return;

    const handleOutsideClick = (event) => {
      if (moreFiltersRef.current?.contains(event.target)) return;
      setIsMoreFiltersOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMoreFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMoreFiltersOpen]);

  const orderedMovableFilters = useMemo(() => {
    if (!filterOrder.length) return movableFilters;

    const filterByKey = new Map(
      movableFilters.map((filter) => [String(filter.key), filter])
    );

    const ordered = [];

    filterOrder.forEach((key) => {
      const filter = filterByKey.get(String(key));

      if (filter) {
        ordered.push(filter);
        filterByKey.delete(String(key));
      }
    });

    return [...ordered, ...Array.from(filterByKey.values())];
  }, [movableFilters, filterOrder]);

  const filterItems = useMemo(() => {
    return [...fixedFilters, ...orderedMovableFilters];
  }, [fixedFilters, orderedMovableFilters]);

  const visibleFilters = filterItems.slice(0, MAX_VISIBLE_FILTERS);
  const hiddenFilters = filterItems.slice(MAX_VISIBLE_FILTERS);

  const fixedFilterKeysSet = useMemo(() => {
    return new Set(fixedFilters.map((filter) => String(filter.key)));
  }, [fixedFilters]);

  const isFilterFixed = (filter) => {
    return fixedFilterKeysSet.has(String(filter?.key));
  };

  const saveFilterOrder = (nextOrder) => {
    const normalizedOrder = Array.from(
      new Set(nextOrder.map((item) => String(item)).filter(Boolean))
    );

    setFilterOrder(normalizedOrder);

    if (!storageKey) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(normalizedOrder));
    } catch {
      // localStorage может быть недоступен
    }
  };

  const handleMoveFilter = (sourceKey, targetKey) => {
    const normalizedSourceKey = String(sourceKey || "");
    const normalizedTargetKey = String(targetKey || "");

    if (!normalizedSourceKey || !normalizedTargetKey) return;
    if (normalizedSourceKey === normalizedTargetKey) return;
    if (fixedFilterKeysSet.has(normalizedSourceKey)) return;
    if (fixedFilterKeysSet.has(normalizedTargetKey)) return;

    const currentKeys = orderedMovableFilters.map((filter) =>
      String(filter.key)
    );

    const sourceIndex = currentKeys.indexOf(normalizedSourceKey);
    const targetIndex = currentKeys.indexOf(normalizedTargetKey);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextKeys = [...currentKeys];
    const [movedKey] = nextKeys.splice(sourceIndex, 1);

    nextKeys.splice(targetIndex, 0, movedKey);

    saveFilterOrder(nextKeys);
  };

  useEffect(() => {
    if (!hasTable) return;
    if (!blockId) return;
    if (!defaultFilter) return;
    if (isUserChangedFilter) return;
    if (String(activeFilter) !== "all") return;
    if (activeQuickFilterId) return;

    const filterKey = String(defaultFilter.key);

    if (onFilterChange) {
      onFilterChange(filterKey);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("universal-table:change-filter", {
        detail: {
          blockId,
          filter: filterKey,
          isQuickFilter: true,
        },
      })
    );
  }, [
    hasTable,
    blockId,
    defaultFilter,
    activeFilter,
    activeQuickFilterId,
    isUserChangedFilter,
    onFilterChange,
  ]);

  if (!hasTable) return null;

  const handleOpenFilters = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (onOpenFilters) {
      onOpenFilters();
      return;
    }

    window.dispatchEvent(
      new CustomEvent("universal-table:open-filters", {
        detail: {
          blockId,
        },
      })
    );
  };

  const handleFilterClick = (filter) => {
    const filterKey = String(filter.key);

    setIsUserChangedFilter(true);

    if (onFilterChange) {
      onFilterChange(filterKey);
      setIsMoreFiltersOpen(false);
      return;
    }

    if (!blockId) {
      setIsMoreFiltersOpen(false);
      return;
    }

    if (filterKey === "all") {
      window.dispatchEvent(
        new CustomEvent("universal-table:reset-filter", {
          detail: {
            blockId,
          },
        })
      );

      setIsMoreFiltersOpen(false);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("universal-table:change-filter", {
        detail: {
          blockId,
          filter: filterKey,
          isQuickFilter: true,
        },
      })
    );

    setIsMoreFiltersOpen(false);
  };

  const handleToggleMoreFilters = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsMoreFiltersOpen((prev) => !prev);
  };

  const handleViewChange = (viewKey) => {
    onViewChange?.(viewKey);
  };

  const handleDragStart = (event, filter) => {
    if (isFilterFixed(filter)) return;

    const filterKey = String(filter.key);

    setDraggedFilterKey(filterKey);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", filterKey);
      event.dataTransfer.setData(
        "application/x-table-quick-filter",
        JSON.stringify({
          key: filterKey,
        })
      );
    }
  };

  const handleDragOver = (event, filter) => {
    if (isFilterFixed(filter)) return;
    if (!draggedFilterKey) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    setDragOverFilterKey(String(filter.key));
  };

  const handleDrop = (event, filter) => {
    if (isFilterFixed(filter)) return;

    event.preventDefault();
    event.stopPropagation();

    const sourceKey =
      event.dataTransfer?.getData("text/plain") || draggedFilterKey;

    handleMoveFilter(sourceKey, filter.key);

    setDraggedFilterKey(null);
    setDragOverFilterKey(null);
  };

  const handleDragEnd = () => {
    setDraggedFilterKey(null);
    setDragOverFilterKey(null);
  };

  const renderFilterButton = (filter) => {
    const filterKey = String(filter.key);
    const isActive =
      filterKey === "all"
        ? String(activeFilter) === "all" && !activeQuickFilterId
        : String(activeQuickFilterId) === filterKey;

    const isFixed = isFilterFixed(filter);
    const isDragging = String(draggedFilterKey) === filterKey;
    const isDragOver = String(dragOverFilterKey) === filterKey;

    return (
      <button
        key={filterKey}
        type="button"
        draggable={!isFixed}
        onDragStart={(event) => handleDragStart(event, filter)}
        onDragOver={(event) => handleDragOver(event, filter)}
        onDrop={(event) => handleDrop(event, filter)}
        onDragEnd={handleDragEnd}
        onClick={() => handleFilterClick(filter)}
        style={getFilterStyle({
          active: isActive,
          isDefault: filter.isDefault,
          isFixed,
          isDragging,
          isDragOver,
        })}
        title={
          isFixed
            ? filter.label
            : `${filter.label}. Можно перетащить для изменения порядка`
        }
      >
        {filter.label}
      </button>
    );
  };

  const renderDropdownFilterButton = (filter) => {
    const filterKey = String(filter.key);
    const isActive =
      filterKey === "all"
        ? String(activeFilter) === "all" && !activeQuickFilterId
        : String(activeQuickFilterId) === filterKey;

    const isFixed = isFilterFixed(filter);
    const isDragging = String(draggedFilterKey) === filterKey;
    const isDragOver = String(dragOverFilterKey) === filterKey;

    return (
      <button
        key={filterKey}
        type="button"
        draggable={!isFixed}
        onDragStart={(event) => handleDragStart(event, filter)}
        onDragOver={(event) => handleDragOver(event, filter)}
        onDrop={(event) => handleDrop(event, filter)}
        onDragEnd={handleDragEnd}
        onClick={() => handleFilterClick(filter)}
        style={getDropdownItemStyle({
          active: isActive,
          isDefault: filter.isDefault,
          isFixed,
          isDragging,
          isDragOver,
        })}
        title={
          isFixed
            ? filter.label
            : `${filter.label}. Можно перетащить для изменения порядка`
        }
      >
        {filter.label}
      </button>
    );
  };

  return (
    <div data-table-action="true" style={barStyle}>
      <div style={filtersAreaStyle}>
        <button type="button" onClick={handleOpenFilters} style={filterButton}>
          Фильтры
        </button>

        <div style={quickFiltersRowStyle}>
          {visibleFilters.map((filter) => renderFilterButton(filter))}

          {hiddenFilters.length > 0 && (
            <div ref={moreFiltersRef} style={moreFiltersWrapperStyle}>
              <button
                type="button"
                onClick={handleToggleMoreFilters}
                style={moreButtonStyle}
                title="Другие фильтры"
              >
                ...
              </button>

              {isMoreFiltersOpen && (
                <div style={moreDropdownStyle}>
                  {hiddenFilters.map((filter) =>
                    renderDropdownFilterButton(filter)
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={rightAreaStyle}>
        <button
          type="button"
          onClick={() => handleViewChange("table")}
          style={getViewButtonStyle(activeView === "table")}
          title="Таблица"
        >
          ▦
        </button>

        <button
          type="button"
          onClick={() => handleViewChange("list")}
          style={getViewButtonStyle(activeView === "list")}
          title="Список"
        >
          ☷
        </button>

        <button
          type="button"
          onClick={() => handleViewChange("calendar")}
          style={getViewButtonStyle(activeView === "calendar")}
          title="Календарь"
        >
          📅
        </button>
      </div>
    </div>
  );
}

const barStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  marginBottom: 12,
  userSelect: "none",
  flexWrap: "nowrap",
  minWidth: 0,
};

const filtersAreaStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  flex: "1 1 auto",
};

const quickFiltersRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  flexWrap: "nowrap",
};

const rightAreaStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
};

const filterButton = {
  height: 30,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "#ffffff",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
};

const getFilterStyle = ({
  active,
  isDefault = false,
  isFixed = false,
  isDragging = false,
  isDragOver = false,
}) => ({
  height: 30,
  maxWidth: 180,
  padding: "0 10px",
  borderRadius: 8,
  border: isDragOver
    ? "1px dashed #2563eb"
    : active
      ? "1px solid #2563eb"
      : isDefault
        ? "1px solid #bfdbfe"
        : "1px solid #e2e8f0",
  background: isDragOver
    ? "#dbeafe"
    : active
      ? "#eff6ff"
      : isDefault
        ? "#f8fbff"
        : "#ffffff",
  color: active ? "#2563eb" : "#334155",
  cursor: isFixed ? "pointer" : isDragging ? "grabbing" : "grab",
  fontSize: 13,
  fontWeight: active || isDefault ? 700 : 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flexShrink: 0,
  opacity: isDragging ? 0.55 : 1,
  transform: isDragging ? "scale(0.98)" : "scale(1)",
  transition:
    "border 0.12s ease, background 0.12s ease, opacity 0.12s ease, transform 0.12s ease",
});

const moreFiltersWrapperStyle = {
  position: "relative",
  flexShrink: 0,
};

const moreButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1,
};

const moreDropdownStyle = {
  position: "absolute",
  top: 36,
  left: 0,
  zIndex: 3000,
  minWidth: 190,
  maxWidth: 260,
  padding: 6,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const getDropdownItemStyle = ({
  active,
  isDefault = false,
  isFixed = false,
  isDragging = false,
  isDragOver = false,
}) => ({
  width: "100%",
  minHeight: 32,
  padding: "0 10px",
  borderRadius: 8,
  border: isDragOver ? "1px dashed #2563eb" : "1px solid transparent",
  background: isDragOver
    ? "#dbeafe"
    : active
      ? "#eff6ff"
      : isDefault
        ? "#f8fbff"
        : "#ffffff",
  color: active ? "#2563eb" : "#334155",
  cursor: isFixed ? "pointer" : isDragging ? "grabbing" : "grab",
  fontSize: 13,
  fontWeight: active || isDefault ? 700 : 500,
  textAlign: "left",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  opacity: isDragging ? 0.55 : 1,
  transition: "border 0.12s ease, background 0.12s ease, opacity 0.12s ease",
});

const getViewButtonStyle = (active) => ({
  width: 30,
  height: 30,
  borderRadius: 8,
  border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
  background: active ? "#eff6ff" : "#ffffff",
  color: active ? "#2563eb" : "#334155",
  cursor: "pointer",
  flexShrink: 0,
});