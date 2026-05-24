import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import TableCell from "./TableCell";

import useTableRowDragAndDrop from "../../hooks/useTableRowDragAndDrop";

import { rowGridStyle, cellWrapperStyle } from "../../styles/tableStyles";

const MENU_WIDTH = 190;
const MENU_PADDING = 8;
const MENU_GAP = 6;

const getMenuPositionStyle = (anchorRect) => {
  if (!anchorRect) {
    return {
      position: "fixed",
      top: MENU_PADDING,
      left: MENU_PADDING,
      zIndex: 99999,
    };
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = anchorRect.left;
  let top = anchorRect.bottom + MENU_GAP;

  if (left + MENU_WIDTH > viewportWidth - MENU_PADDING) {
    left = viewportWidth - MENU_WIDTH - MENU_PADDING;
  }

  if (left < MENU_PADDING) {
    left = MENU_PADDING;
  }

  if (top + 86 > viewportHeight - MENU_PADDING) {
    top = Math.max(MENU_PADDING, anchorRect.top - 86 - MENU_GAP);
  }

  return {
    position: "fixed",
    top,
    left,
    zIndex: 99999,
  };
};

const isSystemColumn = (column) => {
  return Boolean(
    column?.system ||
      column?.isSystem ||
      column?.is_system ||
      String(column?.type || "") === "system_row_number"
  );
};

export default function TableRow({
  row,
  columns = [],
  isSelected,
  tableGridTemplateColumns,
  fullTableMinWidth,
  onToggleRowSelection,
  onCellChange,
  onOpenRowCard,
  onOpenFile,
  isInlineEditMode = false,

  isExpanded = false,
  hasChildren = false,
  level = 0,
  positionNumber = "",
  onToggleExpand,
  onAddSubtask,
  onDeleteRow,
  onMoveRow,

  shouldFocusFirstCell = false,
}) {
  const rowRef = useRef(null);
  const menuButtonRef = useRef(null);

  const {
    draggable,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragLeave,
    handleDragEnd,
    getDropVisualStyle,
  } = useTableRowDragAndDrop({
    row,
    rowRef,
    onMoveRow,
    disabled: false,
  });

  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [taskMenuAnchorRect, setTaskMenuAnchorRect] = useState(null);
  const [isRowHovered, setIsRowHovered] = useState(false);

  const safeColumns = Array.isArray(columns) ? columns : [];
  const rowLevel = Number.isFinite(Number(level)) ? Number(level) : 0;
  const hasPositionNumber = Boolean(positionNumber);
  const showRowMenuButton = isRowHovered || isTaskMenuOpen;

  const firstBusinessColumnIndex = useMemo(() => {
    const index = safeColumns.findIndex((column) => !isSystemColumn(column));
    return index >= 0 ? index : 0;
  }, [safeColumns]);

  useEffect(() => {
    if (!shouldFocusFirstCell) return;

    const frameId = requestAnimationFrame(() => {
      const input = rowRef.current?.querySelector(
        "[data-primary-cell-input='true'], [data-primary-cell-editor='true'] textarea, [data-primary-cell-editor='true'] input"
      );

      input?.focus?.();
      input?.select?.();
    });

    return () => cancelAnimationFrame(frameId);
  }, [shouldFocusFirstCell]);

  useEffect(() => {
    if (!isTaskMenuOpen) return;

    const updatePosition = () => {
      setTaskMenuAnchorRect(
        menuButtonRef.current?.getBoundingClientRect() || null
      );
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isTaskMenuOpen]);

  useEffect(() => {
    if (!isTaskMenuOpen) return;

    const handleClickOutside = (event) => {
      const isInsideButton = menuButtonRef.current?.contains(event.target);
      const isInsideMenu = event.target.closest?.("[data-task-row-menu='true']");

      if (!isInsideButton && !isInsideMenu) {
        setIsTaskMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTaskMenuOpen]);

  const handleOpenCardFromFirstColumn = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isInlineEditMode) return;

    onOpenRowCard?.(row, event);
  };

  const handleToggleExpand = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!hasChildren) return;

    onToggleExpand?.(row?.id);
  };

  const handleToggleTaskMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setTaskMenuAnchorRect(event.currentTarget?.getBoundingClientRect?.() || null);
    setIsTaskMenuOpen((current) => !current);
  };

  const handleAddSubtask = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsTaskMenuOpen(false);
    onAddSubtask?.(row);
  };

  const handleDeleteRow = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsTaskMenuOpen(false);
    onDeleteRow?.(row);
  };

  const handleCellChange = (columnId, nextValue) => {
    onCellChange?.(row?.id, columnId, nextValue);
  };

  const handleOpenFile = (file) => {
    onOpenFile?.(file, row);
  };

  const taskMenu = isTaskMenuOpen
    ? createPortal(
        <div
          data-table-action="true"
          data-row-card-ignore="true"
          data-task-row-menu="true"
          style={{
            ...getMenuPositionStyle(taskMenuAnchorRect),
            width: MENU_WIDTH,
            padding: 6,
            borderRadius: 10,
            background: "#ffffff",
            border: "1px solid #dbe3ef",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.18)",
            boxSizing: "border-box",
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={handleAddSubtask} style={menuItemStyle}>
            Добавить подзадачу
          </button>

          <button
            type="button"
            onClick={handleDeleteRow}
            style={{
              ...menuItemStyle,
              color: "#dc2626",
            }}
          >
            Удалить
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        ref={rowRef}
        data-table-action="true"
        data-universal-table-row-id={row?.id}
        className="universal-table-row"
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setIsRowHovered(true)}
        onMouseLeave={() => setIsRowHovered(false)}
        style={{
          ...rowGridStyle,
          gridTemplateColumns: tableGridTemplateColumns,
          width: fullTableMinWidth,
          minWidth: fullTableMinWidth,
          minHeight: 38,
          background: isSelected ? "#eff6ff" : "#ffffff",
          cursor: draggable ? "grab" : "default",
          transition: "background 0.14s ease, box-shadow 0.14s ease",
          boxShadow: getDropVisualStyle({ isSelected }),
        }}
      >
        <div
          data-table-action="true"
          data-row-card-ignore="true"
          style={{
            ...cellWrapperStyle,
            minHeight: 38,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 10,
            paddingRight: 4,
            gap: 6,
            boxSizing: "border-box",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            data-table-action="true"
            data-row-card-ignore="true"
            type="checkbox"
            checked={Boolean(isSelected)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation();
              onToggleRowSelection?.(row?.id);
            }}
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
            type="button"
            data-table-action="true"
            data-row-card-ignore="true"
            onClick={handleToggleExpand}
            disabled={!hasChildren}
            title={hasChildren ? "Развернуть подзадачи" : ""}
            aria-label={hasChildren ? "Развернуть подзадачи" : "Нет подзадач"}
            style={{
              width: 16,
              height: 16,
              minWidth: 16,
              border: "none",
              borderRadius: 4,
              background: "transparent",
              color: hasChildren ? "#0f172a" : "transparent",
              cursor: hasChildren ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              lineHeight: 1,
              padding: 0,
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.14s ease",
              flex: "0 0 auto",
              pointerEvents: hasChildren ? "auto" : "none",
            }}
          >
            ›
          </button>
        </div>

        {safeColumns.map((column, index) => {
          const value = row?.values?.[String(column.id)] ?? "";
          const isFirstBusinessColumn = index === firstBusinessColumnIndex;
          const shouldAutoFocusCell =
            shouldFocusFirstCell && isFirstBusinessColumn && isInlineEditMode;

          return (
            <div
              key={column.id}
              data-table-action="true"
              data-primary-cell-editor={
                isFirstBusinessColumn ? "true" : undefined
              }
              onClick={
                isFirstBusinessColumn ? handleOpenCardFromFirstColumn : undefined
              }
              title={
                isFirstBusinessColumn && !isInlineEditMode
                  ? "Открыть карточку строки"
                  : undefined
              }
              style={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                minHeight: 38,
                cursor:
                  isFirstBusinessColumn && !isInlineEditMode
                    ? "pointer"
                    : "default",
                boxSizing: "border-box",
              }}
            >
              {isFirstBusinessColumn ? (
                <div
                  style={{
                    width: "100%",
                    minWidth: 0,
                    display: "grid",
                    gridTemplateColumns: hasPositionNumber
                      ? "18px 26px minmax(0, 1fr)"
                      : "18px minmax(0, 1fr)",
                    alignItems: "center",
                    columnGap: 6,
                    paddingLeft: rowLevel * 18 + 2,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    data-table-action="true"
                    data-row-card-ignore="true"
                    style={{
                      position: "relative",
                      width: 18,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      ref={menuButtonRef}
                      type="button"
                      data-table-action="true"
                      data-row-card-ignore="true"
                      onClick={handleToggleTaskMenu}
                      title="Меню строки"
                      style={{
                        width: 18,
                        height: 22,
                        border: "none",
                        borderRadius: 6,
                        background: isTaskMenuOpen ? "#f1f5f9" : "transparent",
                        color: "#64748b",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        lineHeight: 1,
                        padding: 0,
                        opacity: showRowMenuButton ? 1 : 0,
                        transition:
                          "opacity 0.12s ease, background 0.12s ease",
                        pointerEvents: showRowMenuButton ? "auto" : "none",
                      }}
                    >
                      ⋮
                    </button>
                  </div>

                  {hasPositionNumber && (
                    <div
                      data-table-action="true"
                      data-row-card-ignore="true"
                      title={`Позиция: ${positionNumber}`}
                      style={{
                        minWidth: 26,
                        maxWidth: 26,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        paddingRight: 0,
                        boxSizing: "border-box",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1,
                        color: "#64748b",
                        userSelect: "none",
                        fontVariantNumeric: "tabular-nums",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {positionNumber}
                    </div>
                  )}

                  <TableCell
                    column={column}
                    value={value}
                    readOnly={!isInlineEditMode}
                    isPrimary={isFirstBusinessColumn}
                    autoFocus={shouldAutoFocusCell}
                    onOpenFile={handleOpenFile}
                    onChange={(nextValue) =>
                      handleCellChange(column.id, nextValue)
                    }
                  />
                </div>
              ) : (
                <TableCell
                  column={column}
                  value={value}
                  readOnly={!isInlineEditMode}
                  isPrimary={false}
                  autoFocus={false}
                  onOpenFile={handleOpenFile}
                  onChange={(nextValue) =>
                    handleCellChange(column.id, nextValue)
                  }
                />
              )}
            </div>
          );
        })}

        <div
          data-table-action="true"
          style={{
            ...cellWrapperStyle,
            minHeight: 38,
          }}
        />
      </div>

      {taskMenu}
    </>
  );
}

const menuItemStyle = {
  width: "100%",
  height: 30,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#0f172a",
  cursor: "pointer",
  textAlign: "left",
  padding: "0 8px",
  fontSize: 12,
  fontWeight: 600,
};