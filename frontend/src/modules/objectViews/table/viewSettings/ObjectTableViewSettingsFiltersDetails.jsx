import { useMemo } from "react";

import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";

function formatFilterPreviewLine(condition, fieldLabels) {
  const fieldKey = String(condition?.fieldKey || "").trim();
  const label = fieldLabels.get(fieldKey) || fieldKey || "поле";
  const operator = String(condition?.operator || "eq");
  const value = String(condition?.value ?? "").trim();

  if (!fieldKey) {
    return "Условие без поля";
  }

  return `${label} ${operator} ${value || "…"}`;
}

export default function ObjectTableViewSettingsFiltersDetails({
  effectiveContract,
  catalog,
  objectTypeKey,
  onOpenFilters,
  onEditSavedFilter,
  onDeleteSavedFilter,
}) {
  const fieldLabels = useMemo(() => {
    const objectType = findCatalogObjectType(catalog, objectTypeKey);
    const fields = getObjectTypeFields(objectType);
    const labels = new Map();

    for (const field of fields) {
      const key = String(field?.key || "").trim();

      if (!key) {
        continue;
      }

      labels.set(key, String(field?.name || field?.label || key));
    }

    return labels;
  }, [catalog, objectTypeKey]);

  const conditions = effectiveContract?.query?.filters?.conditions || [];
  const savedFilters = effectiveContract?.query?.filters?.savedFilters || [];
  const hasFilters = conditions.length > 0;

  const previewLines = hasFilters
    ? conditions
        .slice(0, 3)
        .map((item) => formatFilterPreviewLine(item, fieldLabels))
    : ["Без фильтра"];

  return (
    <div className="ot-view-settings-panel__filter-details">
      <div className="ot-view-settings-panel__filter-preview">
        <div className="ot-view-settings-panel__detail-row ot-view-settings-panel__detail-row--heading">
          Общие условия
        </div>
        {previewLines.map((line, index) => (
          <div key={`filter_preview_${index}`} className="ot-view-settings-panel__detail-row">
            {line}
          </div>
        ))}
      </div>

      <div className="ot-view-settings-panel__saved-filters">
        <div className="ot-view-settings-panel__detail-row ot-view-settings-panel__detail-row--heading">
          Сохранённые фильтры
        </div>

        {savedFilters.length ? (
          savedFilters.map((filter) => (
            <div
              key={String(filter.id || filter.key)}
              className="ot-view-settings-panel__saved-filter-row"
            >
              <div className="ot-view-settings-panel__saved-filter-meta">
                <span className="ot-view-settings-panel__saved-filter-name">
                  {filter.label || filter.name || filter.id}
                </span>
                {filter.isQuick ? (
                  <span className="ot-view-settings-panel__saved-filter-badge">быстрый</span>
                ) : null}
                {filter.isDefault ? (
                  <span className="ot-view-settings-panel__saved-filter-badge is-default">★</span>
                ) : null}
              </div>

              <div className="ot-view-settings-panel__saved-filter-actions">
                <button
                  type="button"
                  className="designer-btn designer-btn--ghost"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onEditSavedFilter?.(String(filter.id || filter.key || ""));
                  }}
                >
                  Изменить
                </button>
                <button
                  type="button"
                  className="designer-btn designer-btn--ghost ot-view-settings-panel__saved-filter-delete"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDeleteSavedFilter?.(String(filter.id || filter.key || ""));
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="ot-view-settings-panel__detail-row">Пока нет сохранённых фильтров</div>
        )}
      </div>

      <button
        type="button"
        className="ot-view-settings-panel__open-filter-btn"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenFilters?.();
        }}
      >
        {hasFilters ? "Открыть фильтры" : "Настроить фильтры"}
      </button>
    </div>
  );
}
