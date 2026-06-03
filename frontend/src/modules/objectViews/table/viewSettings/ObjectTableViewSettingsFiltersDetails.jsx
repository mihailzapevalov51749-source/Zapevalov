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
  const hasFilters = conditions.length > 0;

  const previewLines = hasFilters
    ? conditions
        .slice(0, 3)
        .map((item) => formatFilterPreviewLine(item, fieldLabels))
    : ["Без фильтра"];

  return (
    <div className="ot-view-settings-panel__filter-details">
      <div className="ot-view-settings-panel__filter-preview">
        {previewLines.map((line, index) => (
          <div key={`filter_preview_${index}`} className="ot-view-settings-panel__detail-row">
            {line}
          </div>
        ))}
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
