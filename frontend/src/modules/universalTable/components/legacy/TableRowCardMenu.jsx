import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import TableRowCardView from "./TableRowCardView";
import { createColumnMenuStyle } from "../../styles/tableStyles";

const SYSTEM_COLUMN_IDS = [
  "__row_number",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
];

const DEFAULT_ROW_CARD_SETTINGS = {
  width: 520,
  maxHeight: "80vh",
  layout: "one_column",
  titleMode: "default",
  customTitle: "",
  visibleColumnIds: [],
  columnOrder: [],
};

const normalizeRowCardSettings = (settings) => {
  return {
    ...DEFAULT_ROW_CARD_SETTINGS,
    ...(settings || {}),
  };
};

const getColumnId = (column) => String(column?.id ?? column?.key ?? "");

const isSystemColumn = (column) => {
  const columnId = getColumnId(column);
  const columnType = String(column?.type || "").toLowerCase();

  return Boolean(
    column?.system ||
      column?.isSystem ||
      column?.is_system ||
      columnType === "system_row_number" ||
      SYSTEM_COLUMN_IDS.includes(columnId)
  );
};

const getCellDisplayValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => getCellDisplayValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return String(
      value.full_name ||
        value.fullName ||
        value.title ||
        value.name ||
        value.label ||
        value.email ||
        value.username ||
        value.value ||
        ""
    );
  }

  return String(value);
};

const getFirstColumn = (columns = []) => {
  if (!Array.isArray(columns) || columns.length === 0) return null;

  return columns.find((column) => !isSystemColumn(column)) || columns[0] || null;
};

const getFirstColumnValue = (row, firstColumn) => {
  if (!row || !firstColumn) return "";

  const columnId = getColumnId(firstColumn);

  return getCellDisplayValue(
    row?.values?.[columnId] ??
      row?.values?.[firstColumn.id] ??
      row?.cells?.[columnId] ??
      row?.cells?.[firstColumn.id] ??
      row?.[columnId] ??
      row?.[firstColumn.id] ??
      ""
  );
};

const getColumnById = (columns = [], columnId) => {
  const normalizedColumnId = String(columnId || "");

  return (
    columns.find((column) => getColumnId(column) === normalizedColumnId) || null
  );
};

export default function TableRowCardMenu({
  row,
  columns = [],
  onClose,
  onCellChange,
  onSaveRowValues,
  debugLabel,

  rowCardSettings,
  isPageEditMode = false,
  onUpdateRowCardSettings,
}) {
  const [draftValues, setDraftValues] = useState({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedRowCardSettings = normalizeRowCardSettings(rowCardSettings);

  useEffect(() => {
    setDraftValues({});
    setIsConfirmOpen(false);
    setIsSaving(false);
  }, [row?.id]);

  const hasUnsavedChanges = Object.keys(draftValues).length > 0;

  const draftRow = useMemo(() => {
    if (!row) return null;

    return {
      ...row,
      values: {
        ...(row.values || {}),
        ...draftValues,
      },
    };
  }, [row, draftValues]);

  const cardColumns = useMemo(() => {
    return (Array.isArray(columns) ? columns : []).map((column) => ({
      ...column,
      readonly:
        column?.readonly ||
        column?.is_readonly ||
        column?.readOnly ||
        isSystemColumn(column),
      readOnly:
        column?.readonly ||
        column?.is_readonly ||
        column?.readOnly ||
        isSystemColumn(column),
      is_readonly:
        column?.readonly ||
        column?.is_readonly ||
        column?.readOnly ||
        isSystemColumn(column),
    }));
  }, [columns]);

  const requestClose = () => {
    if (isSaving) return;

    if (hasUnsavedChanges) {
      setIsConfirmOpen(true);
      return;
    }

    onClose?.();
  };

  useEffect(() => {
    if (!row) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [row, hasUnsavedChanges, isSaving]);

  if (!row || !draftRow) return null;

  const firstColumn = getFirstColumn(cardColumns);
  const firstColumnValue = getFirstColumnValue(draftRow, firstColumn);
  const rowCardTitle = firstColumnValue.trim() || "Без названия";
  const isFirstColumnReadonly = !firstColumn || isSystemColumn(firstColumn);

  const handleDraftCellChange = (rowId, columnId, value) => {
    const normalizedColumnId = String(columnId);
    const column = getColumnById(cardColumns, normalizedColumnId);

    if (isSystemColumn(column)) return;

    setDraftValues((prev) => ({
      ...prev,
      [normalizedColumnId]: value,
    }));
  };

  const handleTitleChange = (event) => {
    if (!firstColumn) return;
    if (isSystemColumn(firstColumn)) return;

    handleDraftCellChange(row.id, getColumnId(firstColumn), event.target.value);
  };

  const handleSaveAndClose = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      const safeDraftValues = Object.fromEntries(
        Object.entries(draftValues).filter(([columnId]) => {
          const column = getColumnById(cardColumns, columnId);
          return !isSystemColumn(column);
        })
      );

      const nextValues = {
        ...(row.values || {}),
        ...safeDraftValues,
      };

      if (onSaveRowValues) {
        await onSaveRowValues(row.id, nextValues);
      } else {
        await Promise.all(
          Object.entries(safeDraftValues).map(([columnId, value]) =>
            onCellChange?.(row.id, columnId, value)
          )
        );
      }

      setDraftValues({});
      setIsConfirmOpen(false);
      onClose?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAndClose = () => {
    if (isSaving) return;

    setDraftValues({});
    setIsConfirmOpen(false);
    onClose?.();
  };

  const handleCancelClose = () => {
    if (isSaving) return;

    setIsConfirmOpen(false);
  };

  const handleSettingChange = (patch) => {
    onUpdateRowCardSettings?.({
      ...normalizedRowCardSettings,
      ...patch,
    });
  };

  const content = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
      onClick={requestClose}
    >
      <div
        data-row-card-menu="true"
        style={{
          ...createColumnMenuStyle,
          width: normalizedRowCardSettings.width,
          maxWidth: "90vw",
          maxHeight: normalizedRowCardSettings.maxHeight,
          overflowY: "auto",
          overflowX: "hidden",
          borderRadius: 12,
          boxSizing: "border-box",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            minHeight: 50,
            padding: "10px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {firstColumn && !isFirstColumnReadonly ? (
              <input
                value={firstColumnValue}
                placeholder="Без названия"
                onChange={handleTitleChange}
                title="Нажмите, чтобы изменить название"
                disabled={isSaving}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  padding: 0,
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: firstColumnValue.trim() ? "#0f172a" : "#94a3b8",
                  cursor: isSaving ? "default" : "text",
                  borderBottom: "1px solid transparent",
                  transition: "border-color 0.15s ease",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.target.style.borderBottom = "1px dashed #cbd5e1";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderBottom = "1px solid transparent";
                }}
              />
            ) : (
              <div
                title={rowCardTitle}
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: rowCardTitle ? "#0f172a" : "#94a3b8",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {rowCardTitle}
              </div>
            )}

            {debugLabel && (
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {debugLabel}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={requestClose}
            disabled={isSaving}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 22,
              cursor: isSaving ? "default" : "pointer",
              color: "#64748b",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {isPageEditMode && (
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e7eb",
              background: "#f8fafc",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Вид карточки
              </span>

              <select
                value={normalizedRowCardSettings.layout}
                disabled={isSaving}
                onChange={(event) =>
                  handleSettingChange({ layout: event.target.value })
                }
                style={{
                  height: 30,
                  border: "1px solid #dbe3ef",
                  borderRadius: 8,
                  padding: "0 8px",
                  fontSize: 13,
                  background: "#ffffff",
                }}
              >
                <option value="one_column">Одна колонка</option>
                <option value="two_column">Две колонки</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Ширина
              </span>

              <input
                type="number"
                min={360}
                max={1200}
                value={normalizedRowCardSettings.width}
                disabled={isSaving}
                onChange={(event) =>
                  handleSettingChange({
                    width: Number(event.target.value) || 520,
                  })
                }
                style={{
                  height: 30,
                  border: "1px solid #dbe3ef",
                  borderRadius: 8,
                  padding: "0 8px",
                  fontSize: 13,
                  background: "#ffffff",
                }}
              />
            </label>
          </div>
        )}

        <div style={{ padding: 16 }}>
          <TableRowCardView
            row={draftRow}
            columns={cardColumns}
            onCellChange={handleDraftCellChange}
            rowCardSettings={normalizedRowCardSettings}
            isPageEditMode={isPageEditMode}
            onUpdateRowCardSettings={onUpdateRowCardSettings}
          />
        </div>
      </div>

      {isConfirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            style={{
              width: 360,
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
              padding: 18,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              Сохранить изменения?
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.45,
                marginBottom: 18,
              }}
            >
              В карточке есть несохранённые изменения. Сохранить их перед
              закрытием?
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={handleCancelClose}
                disabled={isSaving}
                style={{
                  height: 32,
                  padding: "0 12px",
                  border: "1px solid #dbe3ef",
                  borderRadius: 8,
                  background: "#ffffff",
                  color: "#334155",
                  cursor: isSaving ? "default" : "pointer",
                  fontSize: 13,
                }}
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleDiscardAndClose}
                disabled={isSaving}
                style={{
                  height: 32,
                  padding: "0 12px",
                  border: "1px solid #dbe3ef",
                  borderRadius: 8,
                  background: "#ffffff",
                  color: "#dc2626",
                  cursor: isSaving ? "default" : "pointer",
                  fontSize: 13,
                }}
              >
                Не сохранять
              </button>

              <button
                type="button"
                onClick={handleSaveAndClose}
                disabled={isSaving}
                style={{
                  height: 32,
                  padding: "0 12px",
                  border: "1px solid #2563eb",
                  borderRadius: 8,
                  background: isSaving ? "#93c5fd" : "#2563eb",
                  color: "#ffffff",
                  cursor: isSaving ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}