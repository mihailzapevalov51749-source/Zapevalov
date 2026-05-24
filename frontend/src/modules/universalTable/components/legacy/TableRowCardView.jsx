import TableRowCardField from "./TableRowCardField";

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

const getOrderedColumns = (columns, columnOrder = []) => {
  if (!Array.isArray(columns)) return [];
  if (!Array.isArray(columnOrder) || columnOrder.length === 0) return columns;

  const columnMap = new Map(
    columns.map((column) => [getColumnId(column), column])
  );

  const ordered = columnOrder
    .map((columnId) => columnMap.get(String(columnId)))
    .filter(Boolean);

  const usedIds = new Set(columnOrder.map(String));

  const remaining = columns.filter(
    (column) => !usedIds.has(getColumnId(column))
  );

  return [...ordered, ...remaining];
};

const getHiddenColumnIds = (columns, visibleColumnIds = []) => {
  if (!Array.isArray(visibleColumnIds) || visibleColumnIds.length === 0) {
    return new Set();
  }

  const visibleSet = new Set(visibleColumnIds.map(String));

  return new Set(
    columns
      .filter((column) => !visibleSet.has(getColumnId(column)))
      .map((column) => getColumnId(column))
  );
};

const getNextVisibleColumnIds = (columns, currentVisibleColumnIds, columnId) => {
  const normalizedColumnId = String(columnId);
  const allColumnIds = columns.map((column) => getColumnId(column));

  const currentVisibleSet =
    Array.isArray(currentVisibleColumnIds) && currentVisibleColumnIds.length > 0
      ? new Set(currentVisibleColumnIds.map(String))
      : new Set(allColumnIds);

  if (currentVisibleSet.has(normalizedColumnId)) {
    currentVisibleSet.delete(normalizedColumnId);
  } else {
    currentVisibleSet.add(normalizedColumnId);
  }

  return allColumnIds.filter((id) => currentVisibleSet.has(id));
};

const splitColumns = (columns = []) => {
  const businessColumns = [];
  const systemColumns = [];

  columns.forEach((column) => {
    if (isSystemColumn(column)) {
      systemColumns.push(column);
    } else {
      businessColumns.push(column);
    }
  });

  return {
    businessColumns,
    systemColumns,
  };
};

export default function TableRowCardView({
  row,
  columns = [],
  onCellChange,
  rowCardSettings,
  isPageEditMode = false,
  onUpdateRowCardSettings,
}) {
  if (!row) return null;

  if (!columns.length) {
    return (
      <div
        style={{
          fontSize: 13,
          color: "#64748b",
        }}
      >
        В таблице пока нет полей
      </div>
    );
  }

  const layout = rowCardSettings?.layout || "one_column";
  const columnOrder = rowCardSettings?.columnOrder || [];
  const visibleColumnIds = rowCardSettings?.visibleColumnIds || [];

  const { businessColumns, systemColumns } = splitColumns(columns);

  const firstBusinessColumnId = getColumnId(businessColumns[0]);

  const businessColumnsWithoutFirst = businessColumns.filter(
    (column) => getColumnId(column) !== firstBusinessColumnId
  );

  const orderedBusinessColumns = getOrderedColumns(
    businessColumnsWithoutFirst,
    columnOrder
  );

  const hiddenColumnIds = getHiddenColumnIds(
    businessColumnsWithoutFirst,
    visibleColumnIds
  );

  const businessColumnsToRender = isPageEditMode
    ? orderedBusinessColumns
    : orderedBusinessColumns.filter(
        (column) => !hiddenColumnIds.has(getColumnId(column))
      );

  const systemColumnsToRender = systemColumns.filter((column) => {
    const columnId = getColumnId(column);

    if (columnId === "__row_number") return false;

    return true;
  });

  const isTwoColumn = layout === "two_column";

  const handleToggleVisibility = (columnId) => {
    const nextVisibleColumnIds = getNextVisibleColumnIds(
      businessColumnsWithoutFirst,
      visibleColumnIds,
      columnId
    );

    onUpdateRowCardSettings?.({
      ...(rowCardSettings || {}),
      visibleColumnIds: nextVisibleColumnIds,
    });
  };

  if (!businessColumnsToRender.length && !systemColumnsToRender.length) {
    return (
      <div
        style={{
          fontSize: 13,
          color: "#64748b",
        }}
      >
        Нет дополнительных полей
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {businessColumnsToRender.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTwoColumn ? "1fr 1fr" : "1fr",
            columnGap: 18,
            rowGap: 16,
            alignItems: "start",
          }}
        >
          {businessColumnsToRender.map((column) => {
            const columnId = getColumnId(column);
            const isHidden = hiddenColumnIds.has(columnId);

            return (
              <TableRowCardField
                key={columnId}
                row={row}
                column={column}
                value={row.values?.[columnId] || ""}
                isHidden={isHidden}
                isPageEditMode={isPageEditMode}
                onToggleVisibility={handleToggleVisibility}
                onChange={(value) => onCellChange?.(row.id, columnId, value)}
              />
            );
          })}
        </div>
      )}

      {systemColumnsToRender.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: 14,
          }}
        >
          <div
            style={{
              marginBottom: 10,
              fontSize: 11,
              fontWeight: 800,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Системная информация
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTwoColumn ? "1fr 1fr" : "1fr",
              columnGap: 18,
              rowGap: 12,
              alignItems: "start",
            }}
          >
            {systemColumnsToRender.map((column) => {
              const columnId = getColumnId(column);

              return (
                <TableRowCardField
                  key={columnId}
                  row={row}
                  column={{
                    ...column,
                    readonly: true,
                    readOnly: true,
                    is_readonly: true,
                  }}
                  value={row.values?.[columnId] || ""}
                  isHidden={false}
                  isPageEditMode={false}
                  onToggleVisibility={undefined}
                  onChange={undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}