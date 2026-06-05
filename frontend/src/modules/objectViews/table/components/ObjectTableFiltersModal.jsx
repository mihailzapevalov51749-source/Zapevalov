import { useEffect, useMemo, useState } from "react";

import {
  buildTableQueryFieldOptions,
  normalizeTableFilterFieldKey,
} from "../../services/catalogFieldsForTableQueryUi";
import { getTablePresentationFieldKeys } from "../../services/columnPresentationUtils";
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
import ObjectTableFilterValueEditor from "../viewSettings/ObjectTableFilterValueEditor";

function createEmptyCondition(fieldOption = null) {
  return {
    id: `cond-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    fieldKey: fieldOption?.key || "",
    operator: getDefaultOperatorForFieldOption(fieldOption),
    value: "",
  };
}

/**
 * Minimal filters modal — session-only.
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const current = effectiveContract?.query?.filters?.conditions || [];
    setDraftConditions(
      current.length
        ? current.map((item, index) => {
            const fieldKey = normalizeTableFilterFieldKey(item.fieldKey);
            const fieldOption = fieldOptionsByKey.get(fieldKey) || null;

            return {
              id: String(item.id || `condition-${index + 1}`),
              fieldKey,
              operator: normalizeOperatorForFieldOption(item.operator, fieldOption),
              value: item.value ?? "",
            };
          })
        : [createEmptyCondition(fieldOptions[0] || null)],
    );
  }, [open, effectiveContract, fieldOptions, fieldOptionsByKey]);

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
      createEmptyCondition(fieldOptions[0] || null),
    ]);
  };

  const removeCondition = (id) => {
    setDraftConditions((current) => current.filter((item) => item.id !== id));
  };

  const handleApply = () => {
    const normalized = draftConditions
      .map((item) => ({
        ...item,
        fieldKey: normalizeTableFilterFieldKey(item.fieldKey),
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
          {draftConditions.map((condition) => {
            const fieldOption = fieldOptionsByKey.get(condition.fieldKey) || null;
            const operators = getOperatorsForFieldOption(fieldOption);
            const showValueEditor = operatorRequiresValue(
              condition.operator,
              fieldOption,
            );

            return (
              <div
                key={condition.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: showValueEditor
                    ? "1fr 160px 1fr auto"
                    : "1fr 1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <select
                  className="designer-input"
                  value={condition.fieldKey}
                  onChange={(event) => {
                    const nextFieldOption =
                      fieldOptionsByKey.get(event.target.value) || null;

                    updateCondition(condition.id, {
                      fieldKey: event.target.value,
                      operator: getDefaultOperatorForFieldOption(nextFieldOption),
                      value: "",
                    });
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
                  className="designer-input"
                  value={condition.operator}
                  onChange={(event) => {
                    const nextOperator = event.target.value;

                    updateCondition(condition.id, {
                      operator: nextOperator,
                      ...(operatorRequiresValue(nextOperator, fieldOption)
                        ? {}
                        : { value: "" }),
                    });
                  }}
                >
                  {operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
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
                  />
                ) : null}

                <button
                  type="button"
                  className="designer-btn"
                  onClick={() => removeCondition(condition.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
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
