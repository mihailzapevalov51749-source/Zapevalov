import { useMemo } from "react";

import {
  ViewEngineHeaderRowNumberCell,
  ViewEngineHeaderSelectionCell,
  ViewEngineRowNumberCell,
  ViewEngineRowSelectionCell,
} from "./components/ViewEngineSelectionCell";
import useViewEngineColumnResize from "./hooks/useViewEngineColumnResize";
import useViewEngineLayout from "./hooks/useViewEngineLayout";
import ViewEngineCell from "./ViewEngineCell";
import ViewEngineHeaderCell from "./ViewEngineHeaderCell";
import ViewEngineTableState from "./ViewEngineTableState";
import {
  viewEngineHeaderGridStyle,
  viewEngineRowGridStyle,
  viewEngineTableBodyContentStyle,
  viewEngineTableBodyScrollStyle,
  viewEngineTableInnerStyle,
  viewEngineTableRootStyle,
} from "./viewEngineStyles";

import { columnMatchesSortField } from "./systemColumnKeys";

import "./viewEngineTable.css";

/**
 * Hosted read-only table shell (visual parity with Universal Table reference).
 */
export default function ViewEngineTable({
  columns = [],
  rows = [],
  loading = false,
  error = "",
  sort = null,
  onToggleColumnSort,
  rendererContext = null,
  enableColumnResize = true,
  minHeight = 280,
  showSelectionColumn = true,
  showRowNumberColumn = false,
  rowNumberOffset = 0,
  className = "",
  columnWidths = null,
  onColumnResize = null,
  onColumnResizeEnd = null,
  isInlineEditMode = false,
  onCellChange = null,
}) {
  const { getColumnWidth, handleResizeMouseDown } = useViewEngineColumnResize(
    columns,
    {
      columnWidths,
      onColumnResize,
      onColumnResizeEnd,
    },
  );

  const { gridTemplateColumns, fullTableMinWidth } = useViewEngineLayout(
    columns,
    getColumnWidth,
    { showSelectionColumn, showRowNumberColumn },
  );

  const activeSortField = sort?.field || null;

  const rowsById = useMemo(() => {
    return new Map(rows.map((row) => [row.id, row]));
  }, [rows]);

  const showGrid = !loading && !error && rows.length > 0;

  const tableWidthStyle = {
    width: fullTableMinWidth,
    minWidth: fullTableMinWidth,
  };

  const rootClassName = [
    "view-engine-table-root",
    isInlineEditMode ? "view-engine-table-root--inline-edit" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isHostedShell = rootClassName.includes("view-engine-table-root--hosted");

  const rootStyle = {
    ...viewEngineTableRootStyle,
    minHeight,
    ...(isHostedShell
      ? {
          paddingTop: 0,
          border: "none",
          borderRadius: 0,
          boxShadow: "none",
        }
      : {}),
  };

  return (
    <div
      className={rootClassName}
      style={rootStyle}
    >
      <div className="view-engine-table-inner" style={viewEngineTableInnerStyle}>
        <div
          className="view-engine-table-body-scroll"
          style={viewEngineTableBodyScrollStyle}
        >
          <div
            className="view-engine-table-body-content"
            style={viewEngineTableBodyContentStyle}
          >
            <div className="view-engine-table-header-sticky">
              <div
                className="view-engine-table-grid-row"
                style={{
                  ...viewEngineHeaderGridStyle,
                  gridTemplateColumns,
                  ...tableWidthStyle,
                }}
              >
                {showSelectionColumn ? <ViewEngineHeaderSelectionCell /> : null}

                {showRowNumberColumn ? <ViewEngineHeaderRowNumberCell /> : null}

                {columns.map((column) => {
                  const sortDirection = columnMatchesSortField(
                    column.key,
                    activeSortField,
                  )
                    ? sort?.order || null
                    : null;

                  return (
                    <ViewEngineHeaderCell
                      key={column.key}
                      label={column.label}
                      sortable={column.sortable}
                      sortDirection={sortDirection}
                      isTitle={column.isTitle}
                      enableResize={
                        enableColumnResize &&
                        (column.source === "field" || column.source === "system")
                      }
                      onSortToggle={() => onToggleColumnSort?.(column.key)}
                      onResizeMouseDown={(event) =>
                        handleResizeMouseDown(event, column)
                      }
                    />
                  );
                })}
              </div>
            </div>

            <ViewEngineTableState
              isLoading={loading}
              error={error}
              rowsCount={rows.length}
              fullTableMinWidth={fullTableMinWidth}
            />

            {showGrid
              ? rows.map((row, rowIndex) => (
                  <div
                    key={row.id}
                    className="view-engine-table-row view-engine-table-grid-row"
                    style={{
                      ...viewEngineRowGridStyle,
                      gridTemplateColumns,
                      ...tableWidthStyle,
                    }}
                  >
                    {showSelectionColumn ? (
                      <ViewEngineRowSelectionCell />
                    ) : null}

                    {showRowNumberColumn ? (
                      <ViewEngineRowNumberCell
                        value={rowNumberOffset + rowIndex + 1}
                      />
                    ) : null}

                    {row.cells.map((cell) => {
                      const column =
                        columns.find((item) => item.key === cell.fieldKey) ||
                        null;

                      return (
                        <ViewEngineCell
                          key={`${row.id}-${cell.fieldKey}`}
                          fieldDef={cell.fieldDef}
                          value={cell.value}
                          column={column}
                          row={rowsById.get(row.id) || row}
                          rendererContext={rendererContext}
                          compact
                          isTitle={column?.isTitle}
                          readOnly={!isInlineEditMode}
                          onChange={(nextValue) =>
                            onCellChange?.(
                              row.id,
                              cell.fieldKey,
                              column,
                              nextValue,
                            )
                          }
                        />
                      );
                    })}
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
