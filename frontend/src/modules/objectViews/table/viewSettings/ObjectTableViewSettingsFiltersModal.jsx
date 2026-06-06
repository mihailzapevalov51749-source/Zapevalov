import { useEffect, useMemo, useState } from "react";

import { PlatformModal } from "../../../../shared/platformModal";
import {
  buildTableQueryFieldOptions,
  normalizeTableFilterFieldKey,
} from "../../services/catalogFieldsForTableQueryUi";
import { getTablePresentationFieldKeys } from "../../services/columnPresentationUtils";
import ObjectTableFilterValueEditor from "./ObjectTableFilterValueEditor";
import {
  getDefaultOperatorForFieldOption,
  getOperatorsForFieldOption,
  normalizeOperatorForFieldOption,
  operatorRequiresValue,
} from "../../services/tableFilterOperators";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";
import {
  OBJECT_TABLE_VIEW_FILTERS_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_FILTERS_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";
import {
  addButtonStyle,
  bodyStyle,
  checkboxGroupStyle,
  checkboxInputStyle,
  checkboxLineStyle,
  closeButtonStyle,
  conditionHeaderTextStyle,
  conditionsListStyle,
  conditionsTableHeaderStyle,
  conditionRowStyle,
  dangerButtonStyle,
  fieldLabelInlineStyle,
  filterNameShortLineStyle,
  footerStyle,
  headerStyle,
  inputStyle,
  nameAndDefaultLineStyle,
  operatorSelectStyle,
  primaryButtonStyle,
  quickFilterInputCompactStyle,
  removeButtonStyle,
  savedFiltersSelectStyle,
  secondaryButtonStyle,
  sectionHeaderStyle,
  sectionTitleCompactStyle,
  selectStyle,
  subtitleStyle,
  titleStyle,
} from "./objectTableFilterModalStyles";

import "./objectTableFiltersModal.css";

const SAVED_FILTER_NONE = "";

function normalizeSavedFilterOption(item) {
  return {
    id: String(item.id || item.key || ""),
    label: String(item.label || item.name || item.id || "Фильтр"),
    conditions: Array.isArray(item.conditions) ? item.conditions : [],
    isQuick: Boolean(item.isQuick),
    isDefault: Boolean(item.isDefault),
  };
}

function createEmptyCondition(fieldOption = null) {
  return {
    id: `cond-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    fieldKey: fieldOption?.key || "",
    operator: getDefaultOperatorForFieldOption(fieldOption),
    value: "",
  };
}

function normalizeConditionsForCompare(conditions = []) {
  return (Array.isArray(conditions) ? conditions : [])
    .map((item) => ({
      fieldKey: normalizeTableFilterFieldKey(item?.fieldKey),
      operator: String(item?.operator || "eq").trim(),
      value: String(item?.value ?? "").trim(),
    }))
    .filter((item) => item.fieldKey)
    .sort((left, right) => {
      const leftKey = `${left.fieldKey}:${left.operator}:${left.value}`;
      const rightKey = `${right.fieldKey}:${right.operator}:${right.value}`;
      return leftKey.localeCompare(rightKey, "ru");
    });
}

function mapConditionsFromContract(conditions = [], fieldOptionsByKey = new Map()) {
  if (!Array.isArray(conditions) || !conditions.length) {
    return [];
  }

  return conditions.map((item, index) => {
    const fieldKey = normalizeTableFilterFieldKey(item.fieldKey);
    const fieldOption = fieldOptionsByKey.get(fieldKey) || null;

    return {
      id: String(item.id || `condition-${index + 1}`),
      fieldKey,
      operator: normalizeOperatorForFieldOption(item.operator, fieldOption),
      value: item.value ?? "",
    };
  });
}

function buildInitialConditions(conditions, fieldOptions) {
  const fieldOptionsByKey = new Map(fieldOptions.map((field) => [field.key, field]));
  const mapped = mapConditionsFromContract(conditions, fieldOptionsByKey);

  return mapped.length ? mapped : [createEmptyCondition(fieldOptions[0] || null)];
}

export default function ObjectTableViewSettingsFiltersModal({
  open = false,
  onClose,
  canCustomizeLayout = false,
  effectiveContract,
  catalog,
  objectTypeKey,
  tenantId = null,
  sessionApi,
  onApplied,
  savedFilters = [],
  initialSavedFilterId = null,
}) {
  const [draftConditions, setDraftConditions] = useState([]);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState(SAVED_FILTER_NONE);
  const [filterName, setFilterName] = useState("");
  const [isQuickFilter, setIsQuickFilter] = useState(false);
  const [isDefaultFilter, setIsDefaultFilter] = useState(false);

  const fieldOptions = useMemo(
    () =>
      buildTableQueryFieldOptions({
        catalog,
        objectTypeKey,
        projectionFieldKeys: getTablePresentationFieldKeys(effectiveContract),
        findObjectType: findCatalogObjectType,
        getFields: getObjectTypeFields,
      }),
    [catalog, objectTypeKey, effectiveContract],
  );

  const fieldOptionsByKey = useMemo(() => {
    return new Map(fieldOptions.map((field) => [field.key, field]));
  }, [fieldOptions]);

  const savedFilterOptions = useMemo(() => {
    return (Array.isArray(savedFilters) ? savedFilters : [])
      .map(normalizeSavedFilterOption)
      .filter((item) => item.id);
  }, [savedFilters]);

  const isEditingSavedFilter =
    selectedSavedFilterId && selectedSavedFilterId !== SAVED_FILTER_NONE;

  const hasFields = fieldOptions.length > 0;

  const canSave =
    hasFields && normalizeConditionsForCompare(draftConditions).length > 0;

  useEffect(() => {
    if (!open) {
      setSelectedSavedFilterId(SAVED_FILTER_NONE);
      setFilterName("");
      setIsQuickFilter(false);
      setIsDefaultFilter(false);
      return;
    }

    const initialFilterId = String(initialSavedFilterId || "").trim();
    const initialFilter = initialFilterId
      ? savedFilterOptions.find((item) => item.id === initialFilterId)
      : null;

    if (initialFilter) {
      setSelectedSavedFilterId(initialFilter.id);
      setFilterName(initialFilter.label);
      setIsQuickFilter(initialFilter.isQuick);
      setIsDefaultFilter(initialFilter.isQuick && initialFilter.isDefault);
      const normalized = buildInitialConditions(initialFilter.conditions, fieldOptions);
      setDraftConditions(normalized);
      return;
    }

    const current = effectiveContract?.query?.filters?.conditions || [];
    const normalized = buildInitialConditions(current, fieldOptions);

    setDraftConditions(normalized);
    setSelectedSavedFilterId(SAVED_FILTER_NONE);
    setFilterName("");
    setIsQuickFilter(false);
    setIsDefaultFilter(false);
  }, [open, effectiveContract, fieldOptions, initialSavedFilterId, savedFilterOptions]);

  useEffect(() => {
    if (!isQuickFilter && isDefaultFilter) {
      setIsDefaultFilter(false);
    }
  }, [isQuickFilter, isDefaultFilter]);

  const updateCondition = (id, patch) => {
    setDraftConditions((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addCondition = () => {
    setDraftConditions((current) => [
      ...current,
      createEmptyCondition(fieldOptions[0] || null),
    ]);
  };

  const removeCondition = (id) => {
    setDraftConditions((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((item) => item.id !== id);
    });
  };

  const normalizeDraftConditions = () =>
    draftConditions
      .map((item) => ({
        ...item,
        fieldKey: normalizeTableFilterFieldKey(item.fieldKey),
        operator: String(item.operator || "eq"),
      }))
      .filter((item) => item.fieldKey);

  const handleSave = () => {
    const normalized = normalizeDraftConditions();
    if (!normalized.length) {
      return;
    }

    if (isQuickFilter) {
      sessionApi?.upsertSavedFilter?.({
        id: isEditingSavedFilter ? selectedSavedFilterId : null,
        label:
          filterName.trim() ||
          savedFilterOptions.find((item) => item.id === selectedSavedFilterId)?.label ||
          "Новый фильтр",
        conditions: normalized,
        isQuick: true,
        isDefault: isDefaultFilter,
      });
    } else {
      sessionApi?.patchSession({
        filterConditions: normalized,
      });

      if (isEditingSavedFilter) {
        sessionApi?.upsertSavedFilter?.({
          id: selectedSavedFilterId,
          label:
            filterName.trim() ||
            savedFilterOptions.find((item) => item.id === selectedSavedFilterId)?.label ||
            "Фильтр",
          conditions: normalized,
          isQuick: false,
          isDefault: false,
        });
      }
    }

    onApplied?.();
    onClose?.("save");
  };

  const handleCancel = () => {
    onClose?.("cancel");
  };

  const handleDeleteFilter = () => {
    if (!isEditingSavedFilter) {
      return;
    }

    sessionApi?.deleteSavedFilter?.(selectedSavedFilterId);
    onClose?.("delete");
  };

  const handleSavedFilterChange = (event) => {
    const nextId = String(event.target.value || "");
    setSelectedSavedFilterId(nextId);

    if (!nextId) {
      const current = effectiveContract?.query?.filters?.conditions || [];
      const restored = buildInitialConditions(current, fieldOptions);
      setDraftConditions(restored);
      setFilterName("");
      setIsQuickFilter(false);
      setIsDefaultFilter(false);
      return;
    }

    const match = savedFilterOptions.find((item) => item.id === nextId);

    if (!match) {
      return;
    }

    setFilterName(match.label);
    setIsQuickFilter(match.isQuick);
    setIsDefaultFilter(match.isQuick && match.isDefault);
    setDraftConditions(buildInitialConditions(match.conditions, fieldOptions));
  };

  const footer = (
    <div style={footerStyle}>
      {isEditingSavedFilter ? (
        <button type="button" onClick={handleDeleteFilter} style={dangerButtonStyle}>
          Удалить
        </button>
      ) : null}

      <button type="button" onClick={handleCancel} style={secondaryButtonStyle}>
        Отмена
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        style={{
          ...primaryButtonStyle,
          opacity: canSave ? 1 : 0.55,
          cursor: canSave ? "pointer" : "default",
        }}
      >
        {isEditingSavedFilter ? "Сохранить изменения" : "Сохранить"}
      </button>
    </div>
  );

  return (
    <PlatformModal
      modalKey={OBJECT_TABLE_VIEW_FILTERS_PANEL_KEY}
      open={open}
      onClose={handleCancel}
      hideHeader
      canCustomizeLayout={canCustomizeLayout}
      keepFullyVisible
      viewportInset={24}
      defaultBounds={OBJECT_TABLE_VIEW_FILTERS_DEFAULT_BOUNDS}
      ariaLabel="Фильтры таблицы"
      footer={footer}
      contentStyle={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: 0,
        overflow: "hidden",
        flex: "0 1 auto",
      }}
    >
      {({ startDrag, headerCursor }) => (
        <>
          <div
            style={{ ...headerStyle, cursor: headerCursor }}
            onMouseDown={startDrag}
            data-platform-modal-drag-handle
          >
            <div>
              <div style={titleStyle}>
                {isEditingSavedFilter ? "Редактирование фильтра" : "Фильтр"}
              </div>

              <div style={subtitleStyle}>Настройка условий таблицы</div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              style={closeButtonStyle}
              onMouseDown={(event) => event.stopPropagation()}
              data-platform-modal-no-drag
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>

          <div style={bodyStyle}>
            <div style={nameAndDefaultLineStyle}>
              <label style={filterNameShortLineStyle}>
                <span style={fieldLabelInlineStyle}>Название</span>

                <input
                  value={filterName}
                  disabled={!hasFields}
                  onChange={(event) => setFilterName(event.target.value)}
                  placeholder={
                    isQuickFilter
                      ? "Название быстрого фильтра"
                      : "Название не требуется для обычного фильтра"
                  }
                  style={{
                    ...quickFilterInputCompactStyle,
                    width: "100%",
                    opacity: hasFields ? 1 : 0.55,
                  }}
                />
              </label>

              <div style={checkboxGroupStyle}>
                <label
                  style={{
                    ...checkboxLineStyle,
                    cursor: hasFields ? "pointer" : "default",
                    color: hasFields ? checkboxLineStyle.color : "var(--text-muted)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isQuickFilter}
                    disabled={!hasFields}
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
                    cursor: hasFields && isQuickFilter ? "pointer" : "default",
                    color:
                      hasFields && isQuickFilter
                        ? checkboxLineStyle.color
                        : "var(--text-muted)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isQuickFilter && isDefaultFilter}
                    disabled={!hasFields || !isQuickFilter}
                    onChange={(event) => setIsDefaultFilter(event.target.checked)}
                    style={checkboxInputStyle}
                  />

                  <span>Фильтр по умолчанию</span>
                </label>
              </div>
            </div>

            <div style={sectionHeaderStyle}>
              <div style={sectionTitleCompactStyle}>
                {isEditingSavedFilter ? "Условия" : "Новый фильтр"}
              </div>

              {savedFilterOptions.length > 0 ? (
                <select
                  value={selectedSavedFilterId}
                  onChange={handleSavedFilterChange}
                  style={savedFiltersSelectStyle}
                >
                  <option value={SAVED_FILTER_NONE}>Сохранённые</option>
                  {savedFilterOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div style={conditionsTableHeaderStyle}>
              <div style={conditionHeaderTextStyle}>Поле</div>
              <div style={conditionHeaderTextStyle}>Оператор</div>
              <div style={conditionHeaderTextStyle}>Значение</div>
              <div />
            </div>

            <div style={conditionsListStyle}>
              {draftConditions.map((condition) => {
                const fieldOption = fieldOptionsByKey.get(condition.fieldKey) || null;
                const operators = getOperatorsForFieldOption(fieldOption);
                const showValueEditor = operatorRequiresValue(condition.operator, fieldOption);

                return (
                  <div key={condition.id} style={conditionRowStyle}>
                    <select
                      value={condition.fieldKey}
                      disabled={!hasFields}
                      onChange={(event) => {
                        const nextFieldOption =
                          fieldOptionsByKey.get(event.target.value) || null;

                        updateCondition(condition.id, {
                          fieldKey: event.target.value,
                          operator: getDefaultOperatorForFieldOption(nextFieldOption),
                          value: "",
                        });
                      }}
                      style={{
                        ...selectStyle,
                        opacity: hasFields ? 1 : 0.55,
                      }}
                    >
                      <option value="">Поле</option>
                      {fieldOptions.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={condition.operator}
                      disabled={!hasFields}
                      onChange={(event) => {
                        const nextOperator = event.target.value;

                        updateCondition(condition.id, {
                          operator: nextOperator,
                          ...(operatorRequiresValue(nextOperator, fieldOption)
                            ? {}
                            : { value: "" }),
                        });
                      }}
                      style={{
                        ...operatorSelectStyle,
                        opacity: hasFields ? 1 : 0.55,
                      }}
                    >
                      {operators.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>

                    {showValueEditor ? (
                      <ObjectTableFilterValueEditor
                        fieldOption={fieldOption}
                        operator={condition.operator}
                        value={condition.value}
                        onChange={(nextValue) =>
                          updateCondition(condition.id, { value: nextValue })
                        }
                        tenantId={tenantId}
                        catalog={catalog}
                        objectTypeKey={objectTypeKey}
                        style={inputStyle}
                        disabled={!hasFields}
                      />
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      aria-label="Удалить условие"
                      disabled={!hasFields || draftConditions.length <= 1}
                      onClick={() => removeCondition(condition.id)}
                      style={{
                        ...removeButtonStyle,
                        opacity: hasFields && draftConditions.length > 1 ? 1 : 0.45,
                        cursor:
                          hasFields && draftConditions.length > 1 ? "pointer" : "default",
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addCondition}
              disabled={!hasFields}
              style={{
                ...addButtonStyle,
                opacity: hasFields ? 1 : 0.55,
                cursor: hasFields ? "pointer" : "default",
              }}
            >
              + условие
            </button>
          </div>
        </>
      )}
    </PlatformModal>
  );
}
