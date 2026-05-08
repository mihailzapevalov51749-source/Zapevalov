import TableCellEditor from "./cellEditors/TableCellEditor";

import { normalizeUserValue } from "../services/tableUtils";

const SYSTEM_COLUMN_IDS = [
  "__row_number",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
];

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

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDisplayValue = (column, value) => {
  const columnId = getColumnId(column);

  if (value === null || value === undefined || value === "") return "—";

  if (columnId === "created_at" || columnId === "updated_at") {
    return formatDateTime(value);
  }

  if (typeof value === "object") {
    return (
      value.full_name ||
      value.fullName ||
      value.name ||
      value.email ||
      value.username ||
      value.title ||
      value.label ||
      value.value ||
      "—"
    );
  }

  return String(value);
};

export default function TableRowCardField({
  column,
  value,
  onChange,
  isHidden = false,
  isPageEditMode = false,
  onToggleVisibility,
}) {
  if (isHidden && !isPageEditMode) return null;

  const columnId = getColumnId(column);
  const isReadonly =
    column?.readonly ||
    column?.readOnly ||
    column?.is_readonly ||
    isSystemColumn(column);

  const displayValue = getDisplayValue(column, value);

  const handleChange = (nextValue) => {
    if (isReadonly) return;

    if (column?.type === "user") {
      onChange?.(normalizeUserValue(nextValue));
      return;
    }

    onChange?.(nextValue);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: isHidden ? 0.45 : 1,
        border: isHidden ? "1px dashed #cbd5e1" : "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 10,
        background: isHidden ? "#f8fafc" : isReadonly ? "#f8fafc" : "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isReadonly ? "#64748b" : "#334155",
            lineHeight: 1.3,
          }}
        >
          {column.title || "Без названия"}
          {column.required && !isReadonly && (
            <span style={{ color: "#dc2626", marginLeft: 4 }}>*</span>
          )}
        </div>

        {isPageEditMode && !isReadonly && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleVisibility?.(columnId);
            }}
            style={{
              height: 22,
              minWidth: 58,
              border: "1px solid #dbe3ef",
              borderRadius: 6,
              background: isHidden ? "#ffffff" : "#f8fafc",
              color: isHidden ? "#64748b" : "#0f172a",
              fontSize: 11,
              cursor: "pointer",
              padding: "0 6px",
            }}
          >
            {isHidden ? "Показать" : "Скрыть"}
          </button>
        )}
      </div>

      {!isHidden && (
        <div
          style={{
            minHeight: 36,
            border: "1px solid #dbe3ef",
            borderRadius: 8,
            background: isReadonly ? "#ffffff" : "#f8fafc",
            display: "flex",
            alignItems: "center",
            padding: "3px 6px",
            boxSizing: "border-box",
          }}
        >
          {isReadonly ? (
            <span
              title={displayValue}
              style={{
                width: "100%",
                minWidth: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.4,
              }}
            >
              {displayValue}
            </span>
          ) : (
            <TableCellEditor
              column={column}
              value={value}
              onChange={handleChange}
            />
          )}
        </div>
      )}

      {isHidden && isPageEditMode && (
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
          }}
        >
          Поле скрыто в карточке
        </div>
      )}
    </div>
  );
}