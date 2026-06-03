import { useEffect, useMemo, useState } from "react";

import { PlatformModal } from "../../../../shared/platformModal";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";
import {
  OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS,
  OBJECT_TABLE_VIEW_FILTERS_PANEL_KEY,
} from "./objectTableViewSettingsModalKeys";

import "./objectTableViewSettings.css";

const OPERATORS = [
  { value: "eq", label: "равно" },
  { value: "in", label: "в списке (in)" },
];

function createEmptyCondition(fieldKey = "") {
  return {
    id: `cond-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    fieldKey,
    operator: "eq",
    value: "",
  };
}

export default function ObjectTableViewSettingsFiltersModal({
  open = false,
  onClose,
  canCustomizeLayout = false,
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
  onApplied,
}) {
  const [draftConditions, setDraftConditions] = useState([]);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const current = effectiveContract?.query?.filters?.conditions || [];

    setDraftConditions(
      current.length
        ? current.map((item, index) => ({
            id: String(item.id || `condition-${index + 1}`),
            fieldKey: String(item.fieldKey || ""),
            operator: String(item.operator || "eq"),
            value: item.value ?? "",
          }))
        : [createEmptyCondition(fieldOptions[0]?.key || "")],
    );
  }, [open, effectiveContract, fieldOptions]);

  const updateCondition = (id, patch) => {
    setDraftConditions((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addCondition = () => {
    setDraftConditions((current) => [
      ...current,
      createEmptyCondition(fieldOptions[0]?.key || ""),
    ]);
  };

  const removeCondition = (id) => {
    setDraftConditions((current) => current.filter((item) => item.id !== id));
  };

  const handleApply = () => {
    const normalized = draftConditions
      .map((item) => ({
        ...item,
        fieldKey: String(item.fieldKey || "").trim(),
        operator: String(item.operator || "eq"),
      }))
      .filter((item) => item.fieldKey);

    sessionApi?.patchSession({
      filterConditions: normalized,
    });
    onApplied?.();
    onClose?.("apply");
  };

  const handleReset = () => {
    sessionApi?.patchSession({
      filterConditions: [],
    });
    onApplied?.();
    onClose?.("reset");
  };

  return (
    <PlatformModal
      modalKey={OBJECT_TABLE_VIEW_FILTERS_PANEL_KEY}
      open={open}
      onClose={onClose}
      title="Фильтры"
      subtitle="Условия отбора записей"
      canCustomizeLayout={canCustomizeLayout}
      defaultBounds={OBJECT_TABLE_VIEW_CHILD_MODAL_DEFAULT_BOUNDS}
      ariaLabel="Настройка фильтров табличного представления"
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="designer-btn" onClick={handleReset}>
            Сбросить
          </button>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={handleApply}
          >
            Применить
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {draftConditions.map((condition) => (
          <div
            key={condition.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 1fr auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <select
              className="designer-input"
              value={condition.fieldKey}
              onChange={(event) =>
                updateCondition(condition.id, { fieldKey: event.target.value })
              }
            >
              <option value="">Поле</option>
              {fieldOptions.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>

            <select
              className="designer-input"
              value={condition.operator}
              onChange={(event) =>
                updateCondition(condition.id, { operator: event.target.value })
              }
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            <input
              className="designer-input"
              value={String(condition.value ?? "")}
              placeholder={
                condition.operator === "in"
                  ? 'значение или "a,b,c"'
                  : "значение"
              }
              onChange={(event) =>
                updateCondition(condition.id, { value: event.target.value })
              }
            />

            <button
              type="button"
              className="designer-btn"
              onClick={() => removeCondition(condition.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="designer-btn"
        style={{ marginTop: 12 }}
        onClick={addCondition}
      >
        + Условие
      </button>
    </PlatformModal>
  );
}
