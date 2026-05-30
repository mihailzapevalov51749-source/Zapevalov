import UniversalTableState from "./UniversalTableState";
import TableToolbar from "./TableToolbar";

import TableHeader from "../tableView/TableHeader";
import TableBody from "../tableView/TableBody";

import {
  tableViewScrollWrapperStyle,
  getTableViewInnerStyle,
  getTableViewBodyScrollStyle,
} from "../../styles/tableStyles";

import {
  normalizeAlign,
  normalizeOptions,
} from "../../services/tableUtils";

function getColumnId(column) {
  return String(
    column?.id ||
      column?.column_id ||
      column?.columnId ||
      column?.field_id ||
      column?.fieldId ||
      column?.key ||
      column?.name ||
      ""
  );
}

function isSystemColumn(column) {
  return Boolean(
    column?.isSystem ||
      column?.is_system ||
      column?.system ||
      column?.kind === "system" ||
      column?.source === "system" ||
      String(column?.id || "").startsWith("__") ||
      String(column?.key || "").startsWith("__")
  );
}

function getColumnWidth(column) {
  const width = Number(column?.width || column?.size || column?.minWidth);

  if (Number.isFinite(width) && width > 0) {
    return width;
  }

  if (isSystemColumn(column)) {
    return 48;
  }

  return 160;
}

function buildGridTemplateColumns(columns = []) {
  return columns.map((column) => `${getColumnWidth(column)}px`).join(" ");
}

function buildFullTableMinWidth(columns = [], fallbackWidth) {
  const calculatedWidth = columns.reduce(
    (sum, column) => sum + getColumnWidth(column),
    0
  );

  return Math.max(calculatedWidth, Number(fallbackWidth || 0), 320);
}

function resolveViewColumns({
  normalizedVisibleColumnsWithSystem = [],
  normalizedColumnsWithSystem = [],
  viewColumns = [],
}) {
  if (!Array.isArray(viewColumns) || !viewColumns.length) {
    return {
      visibleColumns: normalizedVisibleColumnsWithSystem,
      allColumns: normalizedColumnsWithSystem,
    };
  }

  const selectedColumnIds = new Set(
    viewColumns.map(getColumnId).filter(Boolean)
  );

  const visibleColumns = normalizedVisibleColumnsWithSystem.filter((column) => {
    if (isSystemColumn(column)) return true;

    return selectedColumnIds.has(getColumnId(column));
  });

  const allColumns = normalizedColumnsWithSystem.filter((column) => {
    if (isSystemColumn(column)) return true;

    return selectedColumnIds.has(getColumnId(column));
  });

  return {
    visibleColumns,
    allColumns,
  };
}

export default function UniversalTableMainContent({
  block,
  onBlockUpdated,

  bodyScrollRef,

  fullTableMinWidth,
  tableGridTemplateColumns,

  normalizedVisibleColumnsWithSystem,
  normalizedColumnsWithSystem,

  viewColumns,

  hiddenColumnIds,

  visibleRows,

  rowsWithChildrenIds,

  expandedRowIds,
  setExpandedRowIds,

  allTreeRowsExpanded,

  sortRules,

  selectedRowIds,

  selectedRowsCount,

  allRowsSelected,
  someRowsSelected,

  isLoading,
  error,

  isEditMode,
  isInlineEditMode,
  canEditColumns,

  openedColumnMenuId,

  editingColumnDraft,
  columnMenuAnchorRect,
  createColumnAnchorRect,

  isAddColumnOpen,

  newColumnTitle,
  newColumnType,
  newColumnRequired,
  newColumnOptions,
  newColumnMultiple,
  newColumnAlign,
  newColumnLookup,

  createColumnTitleError,

  isResizingColumnRef,

  createdRowFocus,

  onToggleColumnVisibility,
  onToggleAllRowsSelection,
  onToggleExpandAll,
  onToggleColumnSort,

  onStartDragColumn,
  onDragOverColumn,
  onDropColumn,

  onOpenEditColumnMenu,
  onStartResizeColumn,
  onOpenCreateColumnMenu,

  onEditColumnTitleChange,
  onEditColumnTypeChange,
  onEditColumnRequiredChange,
  onEditColumnOptionsChange,
  onEditColumnMultipleChange,
  onEditColumnAlignChange,
  onEditColumnWidthChange,
  onEditColumnLookupChange,

  onSaveEditColumn,
  onCancelEditColumn,
  onDeleteColumn,

  onCreateColumnTitleChange,
  onCreateColumnTypeChange,
  onCreateColumnRequiredChange,
  onCreateColumnOptionsChange,
  onCreateColumnMultipleChange,
  onCreateColumnAlignChange,
  onCreateColumnLookupChange,

  onSaveCreateColumn,
  onCancelCreateColumn,

  onToggleRowSelection,
  onCellChange,
  onOpenRowCard,
  onOpenFile,
  onAddSubtask,
  onDeleteRow,
  onMoveRow,

  onToggleRowExpanded,

  onAddRow,

  onDeleteSelectedRows,
  onClearSelection,

  columnMenus,
}) {
  const { visibleColumns, allColumns } = resolveViewColumns({
    normalizedVisibleColumnsWithSystem,
    normalizedColumnsWithSystem,
    viewColumns,
  });

  const resolvedTableGridTemplateColumns = Array.isArray(viewColumns)
    ? buildGridTemplateColumns(visibleColumns)
    : tableGridTemplateColumns;

  const resolvedFullTableMinWidth = Array.isArray(viewColumns)
    ? buildFullTableMinWidth(visibleColumns, fullTableMinWidth)
    : fullTableMinWidth;

  const handleFieldsPanelRectSettingsChange = (rect) => {
    if (!block || !onBlockUpdated) return;

    onBlockUpdated({
      ...block,
      settings: {
        ...(block?.settings || {}),
        fieldsVisibilityPanel: rect,
      },
    });
  };

  return (
    <div data-table-action="true" style={styles.wrapper}>
      <div
        style={{
          ...getTableViewInnerStyle(resolvedFullTableMinWidth),
          ...styles.inner,
        }}
      >
        <div
          ref={bodyScrollRef}
          data-table-action="true"
          style={{
            ...getTableViewBodyScrollStyle(resolvedFullTableMinWidth),
            ...styles.body,
          }}
        >
          <div style={styles.bodyContent}>
            <div style={styles.stickyHeader}>
              <TableHeader
                columns={visibleColumns}
                allColumns={allColumns}
                hiddenColumnIds={hiddenColumnIds}
                onToggleColumnVisibility={onToggleColumnVisibility}
                fieldsPanelRectSettings={block?.settings?.fieldsVisibilityPanel}
                onFieldsPanelRectSettingsChange={
                  handleFieldsPanelRectSettingsChange
                }
                rows={visibleRows}
                tableGridTemplateColumns={resolvedTableGridTemplateColumns}
                fullTableMinWidth={resolvedFullTableMinWidth}
                allRowsSelected={allRowsSelected}
                someRowsSelected={someRowsSelected}
                onToggleAllRowsSelection={onToggleAllRowsSelection}
                expandedRowIds={expandedRowIds}
                allTreeRowsExpanded={allTreeRowsExpanded}
                hasTreeRows={rowsWithChildrenIds.size > 0}
                onToggleExpandAll={onToggleExpandAll}
                sortRules={sortRules}
                onToggleColumnSort={onToggleColumnSort}
                openedColumnMenuId={openedColumnMenuId}
                editingColumnDraft={editingColumnDraft}
                columnMenuAnchorRect={columnMenuAnchorRect}
                createColumnAnchorRect={createColumnAnchorRect}
                isAddColumnOpen={isAddColumnOpen}
                newColumnTitle={newColumnTitle}
                newColumnType={newColumnType}
                newColumnRequired={newColumnRequired}
                newColumnOptions={newColumnOptions}
                newColumnMultiple={newColumnMultiple}
                newColumnAlign={newColumnAlign}
                newColumnLookup={newColumnLookup}
                createColumnTitleError={createColumnTitleError}
                onClearCreateColumnTitleError={() =>
                  columnMenus.setCreateColumnTitleError("")
                }
                isEditMode={isEditMode || isInlineEditMode}
                canEditColumns={canEditColumns}
                onStartDragColumn={onStartDragColumn}
                onDragOverColumn={onDragOverColumn}
                onDropColumn={onDropColumn}
                onOpenEditColumnMenu={(event, column) =>
                  onOpenEditColumnMenu({
                    event,
                    column,
                    isResizingColumn: isResizingColumnRef.current,
                  })
                }
                onStartResizeColumn={onStartResizeColumn}
                onOpenCreateColumnMenu={onOpenCreateColumnMenu}
                onEditColumnTitleChange={onEditColumnTitleChange}
                onEditColumnTypeChange={onEditColumnTypeChange}
                onEditColumnRequiredChange={onEditColumnRequiredChange}
                onEditColumnOptionsChange={(options) =>
                  onEditColumnOptionsChange(normalizeOptions(options))
                }
                onEditColumnMultipleChange={onEditColumnMultipleChange}
                onEditColumnAlignChange={(align) =>
                  onEditColumnAlignChange(normalizeAlign(align))
                }
                onEditColumnWidthChange={onEditColumnWidthChange}
                onEditColumnLookupChange={onEditColumnLookupChange}
                onSaveEditColumn={onSaveEditColumn}
                onCancelEditColumn={onCancelEditColumn}
                onDeleteColumn={onDeleteColumn}
                onCreateColumnTitleChange={onCreateColumnTitleChange}
                onCreateColumnTypeChange={onCreateColumnTypeChange}
                onCreateColumnRequiredChange={onCreateColumnRequiredChange}
                onCreateColumnOptionsChange={(options) =>
                  onCreateColumnOptionsChange(normalizeOptions(options))
                }
                onCreateColumnMultipleChange={onCreateColumnMultipleChange}
                onCreateColumnAlignChange={(align) =>
                  onCreateColumnAlignChange(normalizeAlign(align))
                }
                onCreateColumnLookupChange={onCreateColumnLookupChange}
                onSaveCreateColumn={onSaveCreateColumn}
                onCancelCreateColumn={onCancelCreateColumn}
              />
            </div>

            <UniversalTableState
              isLoading={isLoading}
              error={error}
              rowsCount={visibleRows.length}
              fullTableMinWidth={resolvedFullTableMinWidth}
            />

            {!isLoading && !error && (
              <TableBody
                rows={visibleRows}
                columns={visibleColumns}
                selectedRowIds={selectedRowIds}
                tableGridTemplateColumns={resolvedTableGridTemplateColumns}
                fullTableMinWidth={resolvedFullTableMinWidth}
                onToggleRowSelection={onToggleRowSelection}
                onCellChange={onCellChange}
                onOpenRowCard={onOpenRowCard}
                onOpenFile={onOpenFile}
                onAddSubtask={onAddSubtask}
                onDeleteRow={onDeleteRow}
                onMoveRow={onMoveRow}
                isInlineEditMode={isInlineEditMode}
                expandedRowIds={expandedRowIds}
                setExpandedRowIds={setExpandedRowIds}
                onToggleRowExpanded={onToggleRowExpanded}
                createdRowFocusRequest={
                  createdRowFocus.effectiveCreatedRowFocusRequest
                }
              />
            )}

            <div style={styles.toolbarWrap}>
              <TableToolbar
                fullTableMinWidth={resolvedFullTableMinWidth}
                selectedRowsCount={selectedRowsCount}
                isEditMode={isInlineEditMode}
                isPageEditMode={isEditMode}
                onAddRow={onAddRow}
                onDeleteSelectedRows={onDeleteSelectedRows}
                onClearSelection={onClearSelection}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    ...tableViewScrollWrapperStyle,

    width: "100%",
    height: "100%",
    minHeight: 0,

    display: "flex",
    flexDirection: "column",

    overflow: "hidden",
  },

  inner: {
    display: "flex",
    flexDirection: "column",

    flex: 1,
    minHeight: 0,

    overflow: "hidden",
  },

  body: {
    flex: 1,
    minHeight: 0,

    position: "relative",

    overflow: "auto",

    overscrollBehavior: "contain",
  },

  bodyContent: {
    minWidth: "fit-content",

    display: "flex",
    flexDirection: "column",

    position: "relative",
  },

  stickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 200,

    background: "#ffffff",

    width: "fit-content",
    minWidth: "100%",

    boxShadow: "0 1px 0 #e2e8f0",
  },

  toolbarWrap: {
    width: "fit-content",
    minWidth: "100%",
  },
};