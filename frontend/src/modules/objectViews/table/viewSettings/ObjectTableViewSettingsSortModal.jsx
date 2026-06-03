import { useMemo } from "react";

import { PlatformModal } from "../../../../shared/platformModal";
import { getNextSortRules } from "../../services/sortRulesUtils";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";
import {
  OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_SORT_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";

import "./objectTableViewSettings.css";

function getSortStateForField(rules, fieldKey) {
  const rule = (rules || []).find(
    (item) => String(item?.field) === String(fieldKey),
  );

  if (!rule) {
    return "none";
  }

  return rule.order === "desc" ? "desc" : "asc";
}

const SORT_LABELS = {
  none: "—",
  asc: "↑",
  desc: "↓",
};

export default function ObjectTableViewSettingsSortModal({
  open = false,
  onClose,
  canCustomizeLayout = false,
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

  return (
    <PlatformModal
      modalKey={OBJECT_TABLE_VIEW_SORT_PANEL_KEY}
      open={open}
      onClose={onClose}
      title="Сортировка"
      subtitle="Сортировка записей в таблице"
      canCustomizeLayout={canCustomizeLayout}
      defaultBounds={OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Настройка сортировки табличного представления"
      footer={
        <button
          type="button"
          className="designer-btn"
          onClick={() => sessionApi?.patchSession?.({ sortRules: [] })}
        >
          Сбросить сортировку
        </button>
      }
    >
      <p className="object-table-view-settings__hint">
        Нажмите на поле, чтобы переключить сортировку: по возрастанию, по
        убыванию или без сортировки.
      </p>

      <ul className="object-table-view-settings__list">
        {fieldOptions.map((field) => {
          const state = getSortStateForField(sortRules, field.key);

          return (
            <li key={field.key} className="object-table-view-settings__list-item">
              <span style={{ flex: 1, fontSize: 13 }}>{field.label}</span>
              <button
                type="button"
                className={`designer-btn${state !== "none" ? " designer-btn--primary" : ""}`}
                style={{ minWidth: 40 }}
                onClick={() => handleToggleSort(field.key)}
              >
                {SORT_LABELS[state]}
              </button>
            </li>
          );
        })}
      </ul>
    </PlatformModal>
  );
}
