import { useMemo } from "react";

import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/tableModelAdapter";

/**
 * Column visibility and order panel (no drag-and-drop).
 */
export default function ObjectTableColumnVisibilityPanel({
  open = false,
  onClose,
  onSave,
  canSave = false,
  isDirty = false,
  saving = false,
  saveError = "",
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
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

    for (const key of effectiveContract?.projection?.fieldKeys || []) {
      if (!labels.has(key)) {
        labels.set(key, key);
      }
    }

    return labels;
  }, [catalog, objectTypeKey, effectiveContract]);

  if (!open) {
    return null;
  }

  const columnOrder = sessionApi?.panelColumnOrder || [];
  const hiddenSet = new Set(sessionApi?.hiddenFieldKeys || []);
  const titleFieldKey = effectiveContract?.projection?.titleFieldKey;

  const handleToggle = (fieldKey) => {
    const result = sessionApi?.toggleFieldVisibility?.(fieldKey);

    if (result?.ok === false && result.reason === "last_visible_field") {
      window.alert("Нельзя скрыть все поля. Должно остаться хотя бы одно видимое.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="object-table-columns-panel-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4200,
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
          maxWidth: 480,
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="object-table-columns-panel-title"
          style={{ margin: "0 0 12px", fontSize: 16 }}
        >
          Поля таблицы
        </h3>

        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13 }}>
          Измените видимость и порядок полей, затем нажмите «Сохранить», чтобы
          записать их в представление. «Закрыть» не сохраняет на сервер.
        </p>

        {!canSave ? (
          <p
            style={{
              margin: "0 0 12px",
              color: "#b45309",
              fontSize: 13,
              background: "#fffbeb",
              padding: "8px 10px",
              borderRadius: 8,
            }}
          >
            Сохранение недоступно: создайте представление кнопкой «+
            Представление», затем сохраните настройки здесь.
          </p>
        ) : null}

        {saveError ? (
          <div className="designer-error" style={{ marginBottom: 12, fontSize: 13 }}>
            {saveError}
          </div>
        ) : null}

        {columnOrder.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>Нет полей в проекции.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {columnOrder.map((fieldKey, index) => {
              const isHidden = hiddenSet.has(fieldKey);
              const label = fieldLabels.get(fieldKey) || fieldKey;
              const isTitle = titleFieldKey === fieldKey;

              return (
                <li
                  key={fieldKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                >
                  <button
                    type="button"
                    className="designer-btn designer-btn--ghost"
                    title={isHidden ? "Показать" : "Скрыть"}
                    onClick={() => handleToggle(fieldKey)}
                    style={{ minWidth: 32 }}
                  >
                    {isHidden ? "○" : "●"}
                  </button>

                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      opacity: isHidden ? 0.5 : 1,
                    }}
                  >
                    {label}
                    {isTitle ? (
                      <span style={{ color: "#94a3b8", marginLeft: 6 }}>
                        (заголовок)
                      </span>
                    ) : null}
                  </span>

                  <button
                    type="button"
                    className="designer-btn designer-btn--ghost"
                    title="Выше"
                    disabled={index === 0}
                    onClick={() => sessionApi?.moveColumn?.(fieldKey, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="designer-btn designer-btn--ghost"
                    title="Ниже"
                    disabled={index === columnOrder.length - 1}
                    onClick={() => sessionApi?.moveColumn?.(fieldKey, "down")}
                  >
                    ↓
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="designer-btn"
            onClick={() => sessionApi?.resetPresentationToProjectionOrder?.()}
          >
            Сбросить порядок
          </button>
          <button type="button" className="designer-btn designer-btn--ghost" onClick={onClose}>
            Закрыть
          </button>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            disabled={!isDirty || !canSave || saving}
            title={
              !canSave
                ? "Сначала создайте представление"
                : !isDirty
                  ? "Нет изменений для сохранения"
                  : ""
            }
            onClick={() => {
              void onSave?.();
            }}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
