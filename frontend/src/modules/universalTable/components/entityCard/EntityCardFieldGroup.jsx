import FieldValueRenderer from "../../../../shared/fieldTypes/FieldValueRenderer";

function getColumnId(column) {
  return String(column?.id || column?.key || "");
}

function getColumnById(columns = [], fieldId) {
  if (!fieldId) return null;

  return (
    columns.find((column) => getColumnId(column) === String(fieldId)) ||
    null
  );
}

function getColumnValue(row, column) {
  if (!row || !column) return "";

  const values = row.values || {};
  const columnId = column.id || column.key;

  return values[columnId] ?? "";
}

function normalizeFields(fields, columns = []) {
  if (Array.isArray(fields) && fields.length) {
    return fields
      .map((field) => {
        if (typeof field === "string" || typeof field === "number") {
          const column = getColumnById(columns, field);

          return column
            ? {
                fieldId: getColumnId(column),
                label: column.title || "Поле",
                column,
              }
            : null;
        }

        if (field && typeof field === "object") {
          const column = getColumnById(
            columns,
            field.fieldId || field.columnId || field.id
          );

          return column
            ? {
                ...field,
                fieldId: getColumnId(column),
                label: field.label || field.title || column.title || "Поле",
                column,
              }
            : null;
        }

        return null;
      })
      .filter(Boolean);
  }

  return columns
    .filter((column) => column?.visible !== false)
    .map((column) => ({
      fieldId: getColumnId(column),
      label: column.title || "Поле",
      column,
    }));
}

function getGridTemplateColumns(columnsCount) {
  const count = Number(columnsCount || 3);

  if (count <= 1) return "minmax(0, 1fr)";
  if (count === 2) return "repeat(2, minmax(0, 1fr))";

  return "repeat(3, minmax(0, 1fr))";
}

export default function EntityCardFieldGroup({
  row,
  columns = [],
  config = {},
}) {
  const {
    title,
    fields = [],
    layout = "grid",
    columns: columnsCount = 3,
    compact = false,
    showLabels = true,
  } = config;

  const normalizedFields = normalizeFields(fields, columns);

  if (!normalizedFields.length) return null;

  const isList = layout === "list";

  return (
    <section
      style={{
        width: "100%",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        background: "#FFFFFF",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {title && (
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #E2E8F0",
            fontSize: 13,
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isList
            ? "minmax(0, 1fr)"
            : getGridTemplateColumns(columnsCount),
          columnGap: 8,
          rowGap: 4,
          padding: "8px 12px",
          boxSizing: "border-box",
        }}
      >
        {normalizedFields.map((field) => {
          const column = field.column;
          const value = getColumnValue(row, column);

          return (
            <div
              key={field.fieldId}
              style={{
                minWidth: 0,
                minHeight: compact ? 40 : 48,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 4,
                padding: "6px 8px",
                boxSizing: "border-box",
                borderRadius: 8,
                background: "#FFFFFF",
              }}
            >
              {showLabels && (
                <div
                  style={{
                    minWidth: 0,
                    fontSize: 10,
                    lineHeight: 1.1,
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    color: "#64748B",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {field.label}
                </div>
              )}

              <FieldValueRenderer
                type={field.type || column.type}
                value={value}
                column={column}
                row={row}
                compact={compact}
                multiline={field.multiline || column.type === "text"}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}