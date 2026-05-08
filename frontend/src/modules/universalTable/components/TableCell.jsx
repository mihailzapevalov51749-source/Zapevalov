import TableCellEditor from "./cellEditors/TableCellEditor";

import { cellWrapperStyle } from "../styles/tableStyles";

import {
  SYSTEM_COLUMN_IDS,
  getColumnId,
  getJustifyByAlign,
  getSystemValue,
  isSystemColumn,
  isSystemUserColumn,
  normalizeAlign,
} from "../../../shared/entity-ui/entityValueUtils";

export default function TableCell({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
  autoFocus = false,
}) {
  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);

  const columnType = String(column?.type || "").toLowerCase();
  const columnId = getColumnId(column);

  const isSystemRowNumber =
    columnType === "system_row_number" ||
    columnId === SYSTEM_COLUMN_IDS.ROW_NUMBER;

  const isColumnSystem = isSystemColumn(column);
  const isColumnSystemUser = isColumnSystem && isSystemUserColumn(column);

  const systemValue = getSystemValue({ column, value });

  return (
    <div
      data-table-action="true"
      data-primary-cell-editor={isPrimary ? "true" : undefined}
      style={{
        ...cellWrapperStyle,
        minHeight: 36,
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: isSystemRowNumber ? "center" : justifyContent,
        textAlign: isSystemRowNumber ? "center" : align,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        data-primary-cell-editor={isPrimary ? "true" : undefined}
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: isSystemRowNumber ? "center" : justifyContent,
          textAlign: isSystemRowNumber ? "center" : align,
          overflow: "hidden",
        }}
      >
        {isColumnSystemUser ? (
          <TableCellEditor
            column={column}
            value={value}
            onChange={onChange}
            readOnly={true}
            isPrimary={isPrimary}
            autoFocus={autoFocus}
          />
        ) : isColumnSystem ? (
          <span
            title={systemValue}
            style={{
              maxWidth: "100%",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              fontSize: 12,
              fontWeight: isSystemRowNumber ? 600 : 500,
              color: "#64748b",
              fontVariantNumeric: isSystemRowNumber ? "tabular-nums" : "normal",
              userSelect: "none",
            }}
          >
            {systemValue}
          </span>
        ) : (
          <TableCellEditor
            column={column}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            isPrimary={isPrimary}
            autoFocus={autoFocus}
          />
        )}
      </div>
    </div>
  );
}