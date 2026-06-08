import ObjectSettingsBadge from "./ObjectSettingsBadge";
import ObjectSettingsEmptyState from "./ObjectSettingsEmptyState";

function resolveCellValue(row, column) {
  if (typeof column?.render === "function") {
    return column.render(row);
  }

  if (column?.key) {
    return row?.[column.key];
  }

  return null;
}

export default function ObjectSettingsTable({
  columns = [],
  rows = [],
  keyField = "key",
  keyColumn,
  emptyTitle = "Нет данных",
  emptyDescription = "",
  rowActions = null,
  className = "",
  getRowKey,
}) {
  const resolvedKeyColumn =
    keyColumn || columns.find((column) => column.key === keyField) || null;

  if (!rows.length) {
    return (
      <ObjectSettingsEmptyState
        compact
        title={emptyTitle}
        description={emptyDescription}
        className="object-settings-table__empty"
      />
    );
  }

  return (
    <div className={["object-settings-table-wrap", className].filter(Boolean).join(" ")}>
      <table className="object-settings-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id || column.key || column.header}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
            {rowActions ? <th scope="col" className="object-settings-table__actions-col" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowKey =
              (typeof getRowKey === "function" && getRowKey(row, rowIndex)) ||
              row?.id ||
              row?.key ||
              `row-${rowIndex}`;

            return (
              <tr key={rowKey} className="object-settings-table__row">
                {columns.map((column) => {
                  const value = resolveCellValue(row, column);
                  const isKeyColumn =
                    resolvedKeyColumn &&
                    (column.id === resolvedKeyColumn.id ||
                      column.key === resolvedKeyColumn.key);

                  return (
                    <td key={`${rowKey}-${column.id || column.key || column.header}`}>
                      {isKeyColumn ? (
                        <ObjectSettingsBadge variant="key">{value}</ObjectSettingsBadge>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
                {rowActions ? (
                  <td className="object-settings-table__actions-cell">
                    {typeof rowActions === "function"
                      ? rowActions(row, rowIndex)
                      : rowActions}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
