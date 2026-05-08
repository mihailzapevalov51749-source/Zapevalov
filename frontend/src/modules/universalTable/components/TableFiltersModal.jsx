import { useEffect, useMemo, useState } from "react";

import {
  addButtonStyle,
  bodyStyle,
  closeButtonStyle,
  conditionHeaderTextStyle,
  conditionsListStyle,
  conditionsTableHeaderStyle,
  dangerButtonStyle,
  emptyStateStyle,
  fieldLabelInlineStyle,
  filterNameLineStyle,
  footerStyle,
  headerStyle,
  modalStyle,
  overlayStyle,
  primaryButtonStyle,
  quickFilterInputCompactStyle,
  savedFiltersSelectStyle,
  secondaryButtonStyle,
  sectionHeaderStyle,
  sectionTitleCompactStyle,
  subtitleStyle,
  titleStyle,
  topLineStyle,
} from "./filters/filterModalStyles";

import FilterConditionRow from "./filters/FilterConditionRow";

import {
  getOperatorsByColumn,
  isOperatorValueDisabled,
} from "../services/tableFilterOperators";

import {
  createEmptyCondition,
  createId,
  getColumnId,
  normalizeInitialConditions,
  normalizeSavedFilter,
} from "../services/tableFilterUtils";

import {
  loadSystemUsers,
  normalizeUser,
  normalizeUserValue,
} from "../services/usersFilterApi";

const nameAndDefaultLineStyle = {
  ...topLineStyle,
  alignItems: "center",
  gap: 10,
};

const filterNameShortLineStyle = {
  ...filterNameLineStyle,
  flex: "0 0 420px",
  maxWidth: 420,
};

const checkboxGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  paddingTop: 18,
};

const checkboxLineStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  fontSize: 13,
  fontWeight: 500,
  color: "#334155",
  cursor: "pointer",
  userSelect: "none",
  whiteSpace: "nowrap",
};

const checkboxInputStyle = {
  width: 14,
  height: 14,
  margin: 0,
  cursor: "pointer",
  accentColor: "#2563ff",
};

export default function TableFiltersModal({
  isOpen,
  columns = [],
  rows = [],
  initialConditions = [],
  savedFilters = [],
  onClose,
  onSave,
  blockId,

  mode = "create",
  editingFilter = null,
}) {
  const availableColumns = useMemo(() => {
    return columns.filter((column) => {
      if (!column) return false;
      if (column.is_visible === false) return false;
      if (column.visible === false) return false;
      return true;
    });
  }, [columns]);

  const normalizedSavedFilters = useMemo(() => {
    if (!Array.isArray(savedFilters)) return [];
    return savedFilters.map(normalizeSavedFilter);
  }, [savedFilters]);

  const [conditions, setConditions] = useState([]);
  const [isQuickFilter, setIsQuickFilter] = useState(false);
  const [quickFilterName, setQuickFilterName] = useState("");
  const [isDefaultFilter, setIsDefaultFilter] = useState(false);
  const [selectedSavedFilterKey, setSelectedSavedFilterKey] = useState("");

  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const activeEditingFilter = editingFilter
    ? normalizeSavedFilter(editingFilter)
    : null;

  const selectedSavedFilter = normalizedSavedFilters.find(
    (filter) => String(filter.key) === String(selectedSavedFilterKey)
  );

  const isExternalEditMode = mode === "edit" && activeEditingFilter;
  const isSelectedEditMode = Boolean(
    selectedSavedFilterKey && selectedSavedFilter
  );
  const isEditMode = Boolean(isExternalEditMode || isSelectedEditMode);

  const currentEditingFilter = isExternalEditMode
    ? activeEditingFilter
    : selectedSavedFilter;

  const hasUserColumns = useMemo(() => {
    return availableColumns.some((column) => column?.type === "user");
  }, [availableColumns]);

  useEffect(() => {
    if (!isOpen) return;
    if (!hasUserColumns) return;
    if (users.length > 0) return;

    let isCancelled = false;

    const loadUsers = async () => {
      try {
        setIsUsersLoading(true);
        setUsersError("");

        const loadedUsers = await loadSystemUsers();

        if (isCancelled) return;

        setUsers(loadedUsers.map(normalizeUser));
      } catch (error) {
        if (isCancelled) return;

        setUsers([]);
        setUsersError(error?.message || "Не удалось загрузить пользователей");
      } finally {
        if (!isCancelled) {
          setIsUsersLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, hasUserColumns, users.length]);

  useEffect(() => {
    if (!isOpen) return;

    if (isExternalEditMode) {
      const normalizedFilter = activeEditingFilter;

      setConditions(
        normalizeInitialConditions(
          normalizedFilter?.conditions || [],
          availableColumns
        )
      );

      const nextIsQuick = Boolean(
        normalizedFilter?.isQuick ??
          normalizedFilter?.isQuickFilter ??
          normalizedFilter?.is_quick ??
          false
      );

      setIsQuickFilter(nextIsQuick);
      setQuickFilterName(normalizedFilter?.label || normalizedFilter?.name || "");
      setIsDefaultFilter(
        nextIsQuick ? Boolean(normalizedFilter?.isDefault) : false
      );
      setSelectedSavedFilterKey(normalizedFilter?.key || "");
      return;
    }

    setConditions(
      normalizeInitialConditions(initialConditions, availableColumns)
    );
    setIsQuickFilter(false);
    setQuickFilterName("");
    setIsDefaultFilter(false);
    setSelectedSavedFilterKey("");
  }, [
    isOpen,
    isExternalEditMode,
    activeEditingFilter,
    initialConditions,
    availableColumns,
  ]);

  useEffect(() => {
    if (!isQuickFilter && isDefaultFilter) {
      setIsDefaultFilter(false);
    }
  }, [isQuickFilter, isDefaultFilter]);

  if (!isOpen) return null;

  const hasColumns = availableColumns.length > 0;

  const findColumn = (columnId) =>
    availableColumns.find((column) => getColumnId(column) === String(columnId));

  const handleAddCondition = () => {
    if (!hasColumns) return;
    setConditions((prev) => [...prev, createEmptyCondition(availableColumns)]);
  };

  const handleRemoveCondition = (conditionId) => {
    setConditions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((condition) => condition.id !== conditionId);
    });
  };

  const handleConditionChange = (conditionId, field, value) => {
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId) return condition;

        if (field === "columnId") {
          const nextColumn = findColumn(value);
          const operators = getOperatorsByColumn(nextColumn);

          return {
            ...condition,
            columnId: value,
            operator: operators[0]?.key || "contains",
            value: "",
          };
        }

        if (field === "operator") {
          const selectedColumn = findColumn(condition.columnId);
          const shouldDisableValue = isOperatorValueDisabled(
            selectedColumn,
            value
          );

          return {
            ...condition,
            operator: value,
            value: shouldDisableValue ? "" : condition.value,
          };
        }

        return {
          ...condition,
          [field]: value,
        };
      })
    );
  };

  const handleSelectSavedFilter = (filterKey) => {
    setSelectedSavedFilterKey(filterKey);

    const filter = normalizedSavedFilters.find(
      (item) => String(item.key) === String(filterKey)
    );

    if (!filter) {
      setConditions(
        normalizeInitialConditions(initialConditions, availableColumns)
      );
      setIsQuickFilter(false);
      setQuickFilterName("");
      setIsDefaultFilter(false);
      return;
    }

    const nextIsQuick = Boolean(
      filter.isQuick ?? filter.isQuickFilter ?? filter.is_quick ?? false
    );

    setConditions(normalizeInitialConditions(filter.conditions, availableColumns));
    setIsQuickFilter(nextIsQuick);
    setQuickFilterName(filter.label || filter.name || "Новый фильтр");
    setIsDefaultFilter(nextIsQuick ? Boolean(filter.isDefault) : false);
  };

  const getNormalizedConditions = () => {
    return conditions
      .filter((condition) => condition.columnId && condition.operator)
      .map((condition) => {
        const selectedColumn = findColumn(condition.columnId);
        const shouldDisableValue = isOperatorValueDisabled(
          selectedColumn,
          condition.operator
        );

        const value =
          selectedColumn?.type === "user"
            ? normalizeUserValue(condition.value)
            : condition.value ?? "";

        return {
          id: condition.id || createId("condition"),
          columnId: Number(condition.columnId),
          operator: condition.operator,
          value: shouldDisableValue ? "" : value,
        };
      });
  };

  const buildQuickFilterPayload = (normalizedConditions) => {
    if (!isQuickFilter) return null;

    const name = quickFilterName.trim() || "Новый фильтр";
    const filterId = currentEditingFilter?.key || createId("saved_filter");

    return {
      id: currentEditingFilter?.id ?? filterId,
      key: filterId,
      label: name,
      name,
      conditions: normalizedConditions,

      isQuick: true,
      isQuickFilter: true,
      is_quick: true,

      isDefault: Boolean(isDefaultFilter),
      is_default: Boolean(isDefaultFilter),
    };
  };

  const handleSave = () => {
    const normalizedConditions = getNormalizedConditions();

    if (!normalizedConditions.length) return;

    window.dispatchEvent(
      new CustomEvent("universal-table:set-conditions", {
        detail: {
          blockId,
          conditions: normalizedConditions,
        },
      })
    );

    if (isEditMode && currentEditingFilter) {
      const quickFilter = buildQuickFilterPayload(normalizedConditions);

      const updatedFilter = quickFilter || {
        ...currentEditingFilter,
        key: currentEditingFilter.key,
        id: currentEditingFilter.id ?? currentEditingFilter.key,
        label: quickFilterName.trim() || "Новый фильтр",
        name: quickFilterName.trim() || "Новый фильтр",
        conditions: normalizedConditions,

        isQuick: false,
        isQuickFilter: false,
        is_quick: false,

        isDefault: false,
        is_default: false,
      };

      window.dispatchEvent(
        new CustomEvent("universal-table:update-filter", {
          detail: {
            blockId,
            filter: updatedFilter,
          },
        })
      );

      onClose?.();
      return;
    }

    onSave?.({
      conditions: normalizedConditions,
      quickFilter: buildQuickFilterPayload(normalizedConditions),
    });

    onClose?.();
  };

  const handleDeleteFilter = () => {
    if (!isEditMode || !currentEditingFilter) return;

    window.dispatchEvent(
      new CustomEvent("universal-table:delete-filter", {
        detail: {
          blockId,
          filter: currentEditingFilter,
        },
      })
    );

    onClose?.();
  };

  return (
    <div
      data-table-action="true"
      data-table-filter-modal="true"
      style={{
        ...overlayStyle,
        zIndex: 10000000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...modalStyle,
          zIndex: 10000001,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>
              {isEditMode ? "Редактирование фильтра" : "Фильтр"}
            </div>
            <div style={subtitleStyle}>Настройка условий таблицы</div>
          </div>

          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          {!hasColumns && (
            <div style={emptyStateStyle}>
              Колонки ещё не загружены. Закрой окно и открой фильтры повторно.
            </div>
          )}

          <div style={nameAndDefaultLineStyle}>
            <label style={filterNameShortLineStyle}>
              <span style={fieldLabelInlineStyle}>Название</span>

              <input
                value={quickFilterName}
                disabled={!hasColumns}
                onChange={(event) => {
                  setQuickFilterName(event.target.value);
                }}
                placeholder={
                  isQuickFilter
                    ? "Название быстрого фильтра"
                    : "Название не требуется для обычного фильтра"
                }
                style={{
                  ...quickFilterInputCompactStyle,
                  width: "100%",
                  opacity: hasColumns ? 1 : 0.55,
                }}
              />
            </label>

            <div style={checkboxGroupStyle}>
              <label
                style={{
                  ...checkboxLineStyle,
                  opacity: hasColumns ? 1 : 0.55,
                  cursor: hasColumns ? "pointer" : "default",
                }}
              >
                <input
                  type="checkbox"
                  checked={isQuickFilter}
                  disabled={!hasColumns}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setIsQuickFilter(checked);

                    if (!checked) {
                      setIsDefaultFilter(false);
                    }
                  }}
                  style={checkboxInputStyle}
                />
                <span>Быстрый фильтр</span>
              </label>

              <label
                style={{
                  ...checkboxLineStyle,
                  opacity: hasColumns && isQuickFilter ? 1 : 0.45,
                  cursor: hasColumns && isQuickFilter ? "pointer" : "default",
                }}
              >
                <input
                  type="checkbox"
                  checked={isQuickFilter && isDefaultFilter}
                  disabled={!hasColumns || !isQuickFilter}
                  onChange={(event) => {
                    setIsDefaultFilter(event.target.checked);
                  }}
                  style={checkboxInputStyle}
                />
                <span>Фильтр по умолчанию</span>
              </label>
            </div>
          </div>

          <div style={sectionHeaderStyle}>
            <div style={sectionTitleCompactStyle}>
              {isEditMode ? "Условия" : "Новый фильтр"}
            </div>

            {!isExternalEditMode && normalizedSavedFilters.length > 0 && (
              <select
                value={selectedSavedFilterKey}
                onChange={(event) =>
                  handleSelectSavedFilter(event.target.value)
                }
                style={savedFiltersSelectStyle}
              >
                <option value="">Сохранённые</option>

                {normalizedSavedFilters.map((filter) => (
                  <option key={filter.key || filter.id} value={filter.key}>
                    {filter.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={conditionsTableHeaderStyle}>
            <div style={conditionHeaderTextStyle}>Поле</div>
            <div style={conditionHeaderTextStyle}>Оператор</div>
            <div style={conditionHeaderTextStyle}>Значение</div>
            <div />
          </div>

          <div style={conditionsListStyle}>
            {conditions.map((condition) => (
              <FilterConditionRow
                key={condition.id}
                condition={condition}
                columns={availableColumns}
                rows={rows}
                hasColumns={hasColumns}
                users={users}
                isUsersLoading={isUsersLoading}
                usersError={usersError}
                onChange={handleConditionChange}
                onRemove={handleRemoveCondition}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddCondition}
            disabled={!hasColumns}
            style={{
              ...addButtonStyle,
              opacity: hasColumns ? 1 : 0.55,
              cursor: hasColumns ? "pointer" : "default",
            }}
          >
            + условие
          </button>
        </div>

        <div style={footerStyle}>
          {isEditMode && (
            <button
              type="button"
              onClick={handleDeleteFilter}
              style={dangerButtonStyle}
            >
              Удалить
            </button>
          )}

          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasColumns || !conditions.length}
            style={{
              ...primaryButtonStyle,
              opacity: hasColumns && conditions.length ? 1 : 0.55,
              cursor: hasColumns && conditions.length ? "pointer" : "default",
            }}
          >
            {isEditMode ? "Сохранить изменения" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}