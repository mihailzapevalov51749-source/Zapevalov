import { useRef, useState } from "react";

import TableColumnMenu from "./TableColumnMenu";
import TableFieldsVisibilityPanel from "./TableFieldsVisibilityPanel";

import eyeOpenIcon from "../../../assets/icons/eye-open.png";

import {
  headerGridStyle,
  headerCellStyle,
  headerTitleStyle,
  addColumnHeaderStyle,
} from "../styles/tableStyles";

const ADD_COLUMN_WIDTH = 42;
const PRIMARY_COLUMN_TITLE = "название";

const SYSTEM_COLUMN_IDS = [
  "__row_number",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
];

const safeLookup = (lookup) => {
  if (!lookup || typeof lookup !== "object") {
    return {
      sourceTableId: null,
      displayColumnId: null,
      showAvatar: true,
      showTime: false,
      showDateHint: true,
    };
  }

  return {
    sourceTableId: lookup.sourceTableId ? Number(lookup.sourceTableId) : null,
    displayColumnId: lookup.displayColumnId
      ? Number(lookup.displayColumnId)
      : null,
    showAvatar: lookup.showAvatar !== false,
    showTime: lookup.showTime === true,
    showDateHint: lookup.showDateHint !== false,
  };
};

function normalizeTitle(value) {
  return String(value || "").trim().toLowerCase();
}

function getColumnId(column) {
  return String(column?.id ?? column?.key ?? "");
}

function isSystemColumn(column) {
  const columnId = getColumnId(column);

  return Boolean(
    column?.is_system ||
      column?.isSystem ||
      column?.system ||
      String(column?.type || "") === "system_row_number" ||
      SYSTEM_COLUMN_IDS.includes(columnId)
  );
}

function isExplicitPrimaryColumn(column) {
  return Boolean(
    column?.is_primary ||
      column?.isPrimary ||
      column?.settings?.is_primary ||
      column?.settings?.isPrimary
  );
}

function isTitlePrimaryColumn(column) {
  return (
    !isSystemColumn(column) &&
    normalizeTitle(column?.title || column?.name) === PRIMARY_COLUMN_TITLE
  );
}

function getPrimaryDataColumn(columns = []) {
  return (
    columns.find((column) => isExplicitPrimaryColumn(column)) ||
    columns.find((column) => isTitlePrimaryColumn(column)) ||
    columns.find((column) => !isSystemColumn(column)) ||
    null
  );
}

function isPrimaryDataColumn(column, columns = []) {
  const primaryDataColumn = getPrimaryDataColumn(columns);
  if (!primaryDataColumn) return false;

  return getColumnId(primaryDataColumn) === getColumnId(column);
}

function canMoveColumn(column, columns = [], isEditMode) {
  if (!isEditMode) return false;
  if (isPrimaryDataColumn(column, columns)) return false;

  return !(
    column?.lock_position ||
    column?.lockPosition ||
    column?.settings?.lock_position ||
    column?.settings?.lockPosition
  );
}

function canEditColumn(column, canEditColumns) {
  if (!canEditColumns) return false;

  return !(
    column?.lock_edit ||
    column?.lockEdit ||
    column?.settings?.lock_edit ||
    column?.settings?.lockEdit
  );
}

function canResizeColumn(column) {
  return !(
    column?.lock_width ||
    column?.lockWidth ||
    column?.settings?.lock_width ||
    column?.settings?.lockWidth
  );
}

function canDeleteColumn(column, columns = []) {
  if (isPrimaryDataColumn(column, columns)) return false;
  if (column?.allow_delete === false) return false;
  if (isSystemColumn(column)) return false;

  return !(
    column?.lock_delete ||
    column?.lockDelete ||
    column?.settings?.lock_delete ||
    column?.settings?.lockDelete
  );
}

function getSortState(columnId, sortRules = []) {
  const index = sortRules.findIndex(
    (rule) => String(rule?.columnId) === String(columnId)
  );

  if (index < 0) {
    return {
      direction: "none",
      order: null,
    };
  }

  return {
    direction: sortRules[index]?.direction === "desc" ? "desc" : "asc",
    order: index + 1,
  };
}

function getSortIcon(direction) {
  if (direction === "asc") return "↑";
  if (direction === "desc") return "↓";
  return "↕";
}

export default function TableHeader({
  columns = [],
  allColumns = [],
  hiddenColumnIds = [],
  onToggleColumnVisibility,

  tableGridTemplateColumns,
  fullTableMinWidth,

  allRowsSelected,
  someRowsSelected,
  onToggleAllRowsSelection,

  allTreeRowsExpanded,
  hasTreeRows,
  onToggleExpandAll,

  sortRules = [],
  onToggleColumnSort,

  openedColumnMenuId,
  editingColumnDraft,
  columnMenuAnchorRect,
  createColumnAnchorRect,

  isAddColumnOpen,
  newColumnTitle,
  newColumnType,
  newColumnRequired,
  newColumnOptions,
  newColumnMultiple = false,
  newColumnAlign,
  newColumnLookup,

  createColumnTitleError,
  onClearCreateColumnTitleError,

  onOpenEditColumnMenu,
  onStartResizeColumn,
  onOpenCreateColumnMenu,

  onStartDragColumn,
  onDragOverColumn,
  onDropColumn,

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

  isEditMode = false,
  canEditColumns = false,
  showSelectionColumn = true,
  showAddColumn = true,
}) {
  const [hoveredColumnId, setHoveredColumnId] = useState(null);
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [isFieldsPanelOpen, setIsFieldsPanelOpen] = useState(false);
  const [fieldsPanelAnchorRect, setFieldsPanelAnchorRect] = useState(null);

  const fieldsButtonRef = useRef(null);

  const safeAllColumns = allColumns.length ? allColumns : columns;
  const primaryDataColumn = getPrimaryDataColumn(safeAllColumns);
  const primaryDataColumnId = primaryDataColumn
    ? getColumnId(primaryDataColumn)
    : "";

  const handleOpenFieldsPanel = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = fieldsButtonRef.current?.getBoundingClientRect?.();

    setFieldsPanelAnchorRect(
      rect
        ? {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }
        : null
    );

    setIsFieldsPanelOpen(true);
  };

  return (
    <div
      data-table-action="true"
      style={{
        ...headerGridStyle,
        gridTemplateColumns: tableGridTemplateColumns,
        width: fullTableMinWidth,
        minWidth: fullTableMinWidth,
      }}
    >
      {showSelectionColumn && (
        <div
          data-table-action="true"
          style={{
            ...headerCellStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 10,
            paddingRight: 4,
            gap: 6,
            boxSizing: "border-box",
          }}
        >
          <input
            data-table-action="true"
            type="checkbox"
            checked={Boolean(allRowsSelected)}
            ref={(el) => {
              if (el) el.indeterminate = Boolean(someRowsSelected);
            }}
            onChange={onToggleAllRowsSelection}
            style={{
              width: 13,
              height: 13,
              margin: 0,
              cursor: "pointer",
              accentColor: "#2563ff",
              flex: "0 0 auto",
            }}
          />

          <button
            data-table-action="true"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleExpandAll?.(event);
            }}
            disabled={!hasTreeRows}
            title={allTreeRowsExpanded ? "Свернуть все" : "Развернуть все"}
            style={{
              width: 16,
              height: 16,
              minWidth: 16,
              border: "none",
              borderRadius: 4,
              background: "transparent",
              cursor: hasTreeRows ? "pointer" : "default",
              fontSize: 12,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: allTreeRowsExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              color: hasTreeRows ? "#64748b" : "transparent",
              padding: 0,
              flex: "0 0 auto",
            }}
          >
            ›
          </button>
        </div>
      )}

      {columns.map((column) => {
        const columnId = getColumnId(column);

        const isMenuOpen =
          String(openedColumnMenuId) === columnId &&
          Boolean(editingColumnDraft);

        const isColumnSystem = isSystemColumn(column);
        const isPrimaryColumn = columnId === primaryDataColumnId;
        const isColumnEditable = canEditColumn(column, canEditColumns);
        const isColumnMovable = canMoveColumn(
          column,
          safeAllColumns,
          isEditMode
        );
        const isColumnResizable = canResizeColumn(column);
        const isColumnDeletable = canDeleteColumn(column, safeAllColumns);

        const sortState = getSortState(columnId, sortRules);
        const sortIcon = getSortIcon(sortState.direction);
        const isSorted = sortState.direction !== "none";

        const showDragHandle =
          isColumnMovable &&
          (String(hoveredColumnId) === columnId ||
            String(draggingColumnId) === columnId);

        return (
          <div
            key={columnId}
            data-table-action="true"
            data-column-id={columnId}
            data-system-column={isColumnSystem ? "true" : "false"}
            draggable={false}
            onMouseEnter={() => setHoveredColumnId(columnId)}
            onMouseLeave={() => setHoveredColumnId(null)}
            style={{
              ...headerCellStyle,
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onDragOver={(event) => {
              if (!isEditMode) return;

              onDragOverColumn?.(event, columnId);
            }}
            onDrop={(event) => {
              if (!isEditMode) return;

              event.preventDefault();
              event.stopPropagation();

              const draggedColumnId =
                event.dataTransfer?.getData("text/plain") || null;

              setDraggingColumnId(null);
              onDropColumn?.(columnId, draggedColumnId);
            }}
          >
            {isColumnMovable && (
              <div
                data-table-action="true"
                draggable
                onDragStart={(event) => {
                  if (!isEditMode) return;

                  event.stopPropagation();
                  setDraggingColumnId(columnId);

                  if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", columnId);
                  }

                  onStartDragColumn?.(columnId);
                }}
                onDragEnd={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDraggingColumnId(null);
                }}
                style={{
                  cursor: "grab",
                  fontSize: 12,
                  color: "#94a3b8",
                  userSelect: "none",
                  lineHeight: 1,
                  flex: "0 0 auto",
                  opacity: showDragHandle ? 1 : 0,
                  transition: "opacity 0.12s ease",
                }}
              >
                ⋮⋮
              </div>
            )}

            <span
              data-table-action="true"
              style={{
                ...headerTitleStyle,
                flex: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                cursor: isColumnEditable ? "pointer" : "default",
                color: isSorted ? "#0f172a" : headerTitleStyle.color,
                fontWeight: isPrimaryColumn
                  ? 800
                  : isSorted
                    ? 750
                    : headerTitleStyle.fontWeight,
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!isColumnEditable || !canEditColumns) return;

                onOpenEditColumnMenu?.(event, column);
              }}
              title={
                isColumnEditable
                  ? "Настроить столбец"
                  : column.title || "Столбец"
              }
            >
              {column.title}
              {column.required ? " *" : ""}
            </span>

            {isPrimaryColumn && (
              <button
                ref={fieldsButtonRef}
                type="button"
                data-table-action="true"
                title="Показать/скрыть поля"
                onClick={handleOpenFieldsPanel}
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  borderRadius: 6,
                  background: isFieldsPanelOpen ? "#f1f5f9" : "transparent",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  margin: 0,
                  lineHeight: 1,
                  flex: "0 0 auto",
                }}
              >
                <img
                  src={eyeOpenIcon}
                  alt=""
                  style={{
                    width: 14,
                    height: 14,
                    display: "block",
                  }}
                />
              </button>
            )}

            <button
              type="button"
              data-table-action="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                onToggleColumnSort?.(columnId);
              }}
              style={{
                height: 20,
                minWidth: sortState.order ? 30 : 20,
                padding: sortState.order ? "0 5px" : 0,
                border: "none",
                borderRadius: 6,
                background: isSorted ? "#f1f5f9" : "transparent",
                color: isSorted ? "#2563eb" : "#94a3b8",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1,
                userSelect: "none",
                flex: "0 0 auto",
              }}
            >
              <span>{sortIcon}</span>

              {sortState.order && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "#64748b",
                  }}
                >
                  {sortState.order}
                </span>
              )}
            </button>

            {isColumnResizable && (
              <div
                data-table-action="true"
                data-column-resize-handle="true"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onStartResizeColumn?.(event, column);
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  right: -3,
                  width: 6,
                  height: "100%",
                  cursor: "col-resize",
                  zIndex: 5,
                }}
              />
            )}

            {isMenuOpen && canEditColumns && (
              <TableColumnMenu
                mode="edit"
                anchorRect={columnMenuAnchorRect}
                title={editingColumnDraft.title}
                type={editingColumnDraft.type}
                required={editingColumnDraft.required}
                options={editingColumnDraft.options}
                multiple={editingColumnDraft.multiple}
                align={editingColumnDraft.align}
                lookup={safeLookup(editingColumnDraft.lookup)}
                width={editingColumnDraft.width}
                isSystemColumn={isColumnSystem}
                canDelete={isColumnDeletable}
                allowTitleEdit={editingColumnDraft.allow_title_edit !== false}
                allowWidthEdit={editingColumnDraft.allow_width_edit !== false}
                allowAlignEdit={editingColumnDraft.allow_align_edit !== false}
                allowTypeEdit={editingColumnDraft.allow_type_edit !== false}
                allowRequiredEdit={
                  editingColumnDraft.allow_required_edit !== false
                }
                allowOptionsEdit={
                  editingColumnDraft.allow_options_edit !== false
                }
                allowLookupEdit={editingColumnDraft.allow_lookup_edit !== false}
                onTitleChange={onEditColumnTitleChange}
                onTypeChange={onEditColumnTypeChange}
                onRequiredChange={onEditColumnRequiredChange}
                onOptionsChange={onEditColumnOptionsChange}
                onMultipleChange={onEditColumnMultipleChange}
                onAlignChange={onEditColumnAlignChange}
                onWidthChange={onEditColumnWidthChange}
                onLookupChange={(lookup) =>
                  onEditColumnLookupChange?.(safeLookup(lookup))
                }
                onSave={onSaveEditColumn}
                onCancel={onCancelEditColumn}
                onDelete={() => {
                  if (!isColumnDeletable) return;
                  onDeleteColumn?.(column);
                }}
              />
            )}
          </div>
        );
      })}

      {canEditColumns && showAddColumn && (
        <div
          data-table-action="true"
          data-column-menu-button="true"
          title="Добавить столбец"
          style={{
            ...addColumnHeaderStyle,
            width: ADD_COLUMN_WIDTH,
            minWidth: ADD_COLUMN_WIDTH,
            maxWidth: ADD_COLUMN_WIDTH,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 700,
            color: "#2563eb",
            cursor: "pointer",
            userSelect: "none",
            boxSizing: "border-box",
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (!canEditColumns) return;

            onOpenCreateColumnMenu?.(event);
          }}
        >
          +

          {isAddColumnOpen && (
            <TableColumnMenu
              mode="create"
              anchorRect={createColumnAnchorRect}
              title={newColumnTitle}
              type={newColumnType}
              required={newColumnRequired}
              options={newColumnOptions}
              multiple={newColumnMultiple}
              align={newColumnAlign}
              lookup={safeLookup(newColumnLookup)}
              canDelete={false}
              titleError={createColumnTitleError}
              onClearTitleError={onClearCreateColumnTitleError}
              onTitleChange={onCreateColumnTitleChange}
              onTypeChange={onCreateColumnTypeChange}
              onRequiredChange={onCreateColumnRequiredChange}
              onOptionsChange={onCreateColumnOptionsChange}
              onMultipleChange={onCreateColumnMultipleChange}
              onAlignChange={onCreateColumnAlignChange}
              onLookupChange={(lookup) =>
                onCreateColumnLookupChange?.(safeLookup(lookup))
              }
              onSave={onSaveCreateColumn}
              onCancel={onCancelCreateColumn}
            />
          )}
        </div>
      )}

      <TableFieldsVisibilityPanel
        isOpen={isFieldsPanelOpen}
        anchorRect={fieldsPanelAnchorRect}
        allColumns={safeAllColumns}
        hiddenColumnIds={hiddenColumnIds}
        onToggleColumnVisibility={onToggleColumnVisibility}
        onClose={() => setIsFieldsPanelOpen(false)}
      />
    </div>
  );
}