import { useMemo } from "react";

import { getNextSortRules } from "../../services/sortRulesUtils";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";

const SORT_LABELS = {
  none: "—",
  asc: "↑",
  desc: "↓",
};

function getSortStateForField(rules, fieldKey) {
  const rule = (rules || []).find(
    (item) => String(item?.field) === String(fieldKey),
  );

  if (!rule) {
    return "none";
  }

  return rule.order === "desc" ? "desc" : "asc";
}

export default function ObjectTableViewSettingsSortDetails({
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
}) {
  const fieldOptions = useMemo(() => {
    const keysFromProjection = effectiveContract?.projection?.fieldKeys || [];
    const objectType = findCatalogObjectType(catalog, objectTypeKey);
    const fields = getObjectTypeFields(objectType);
    const byKey = new Map();

    for (const field of fields) {
      const key = String(field?.key || "").trim();

      if (!key) {
        continue;
      }

      byKey.set(key, {
        key,
        label: String(field?.name || field?.label || key),
      });
    }

    for (const key of keysFromProjection) {
      if (!byKey.has(key)) {
        byKey.set(key, { key, label: key });
      }
    }

    return Array.from(byKey.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "ru"),
    );
  }, [catalog, objectTypeKey, effectiveContract]);

  const sortRules = effectiveContract?.query?.sort?.rules || [];

  const handleToggleSort = (fieldKey) => {
    const nextRules = getNextSortRules(sortRules, fieldKey);
    sessionApi?.patchSession?.({ sortRules: nextRules });
  };

  if (fieldOptions.length === 0) {
    return (
      <div className="ot-view-settings-panel__detail-row">
        Сортировка не настроена
      </div>
    );
  }

  return (
    <div className="ot-view-settings-panel__fields-list">
      {fieldOptions.map((field) => {
        const state = getSortStateForField(sortRules, field.key);

        return (
          <div key={field.key} className="ot-view-settings-panel__sort-row">
            <span className="ot-view-settings-panel__column-label">{field.label}</span>
            <button
              type="button"
              className={`ot-view-settings-panel__sort-toggle${state !== "none" ? " is-active" : ""}`}
              onClick={() => handleToggleSort(field.key)}
            >
              {SORT_LABELS[state]}
            </button>
          </div>
        );
      })}
    </div>
  );
}
