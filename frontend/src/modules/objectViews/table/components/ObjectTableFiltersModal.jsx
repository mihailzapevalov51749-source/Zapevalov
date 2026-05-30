import { useEffect, useMemo, useState } from "react";

import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";

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

/**
 * Minimal filters modal — session-only (Phase 2).
 */
export default function ObjectTableFiltersModal({
  open = false,
  onClose,
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
      if (!key) continue;
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

  if (!open) {
    return null;
  }

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
    onClose?.();
  };

  const handleReset = () => {
    sessionApi?.patchSession({
      filterConditions: [],
    });
    onApplied?.();
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(15, 23, 42, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          width: "min(720px, 100%)",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Фильтры</h3>
        <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
          Условия применяются к текущей сессии. Сохранение в представление — в
          следующей фазе.
        </p>

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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button type="button" className="designer-btn" onClick={addCondition}>
            + Условие
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="designer-btn" onClick={handleReset}>
              Сбросить
            </button>
            <button type="button" className="designer-btn" onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              className="designer-btn designer-btn-primary"
              onClick={handleApply}
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
