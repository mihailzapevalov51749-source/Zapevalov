import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";

const SYSTEM_COLUMN_ORDER = [
  "__row_number",
  "updated_at",
  "created_at",
  "created_by",
  "updated_by",
];

const SYSTEM_COLUMN_TITLES = {
  __row_number: "№",
  updated_at: "Дата изменения",
  created_at: "Дата создания",
  created_by: "Создатель",
  updated_by: "Изменил",
};

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 500;
const PANEL_MIN_WIDTH = 260;
const PANEL_MIN_HEIGHT = 260;
const PANEL_GAP = 12;
const PANEL_SCREEN_PADDING = 12;
const PANEL_Z_INDEX = 99999;

function getColumnId(column) {
  return String(column?.id ?? column?.key ?? "");
}

function getColumnTitle(column) {
  const columnId = getColumnId(column);

  return (
    SYSTEM_COLUMN_TITLES[columnId] ||
    column?.title ||
    column?.name ||
    "Без названия"
  );
}

function normalizeTitle(value) {
  return String(value || "").trim().toLowerCase();
}

function isSystemColumn(column) {
  const columnId = getColumnId(column);
  const type = String(column?.type || "").toLowerCase();

  return Boolean(
    column?.system ||
      column?.isSystem ||
      column?.is_system ||
      type === "system_row_number" ||
      SYSTEM_COLUMN_ORDER.includes(columnId)
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

function getPrimaryColumnId(columns = []) {
  const explicitPrimary = columns.find((column) =>
    isExplicitPrimaryColumn(column)
  );

  if (explicitPrimary) return getColumnId(explicitPrimary);

  const titlePrimary = columns.find(
    (column) =>
      !isSystemColumn(column) &&
      normalizeTitle(column?.title || column?.name) === "название"
  );

  if (titlePrimary) return getColumnId(titlePrimary);

  const fallback = columns.find((column) => !isSystemColumn(column));

  return fallback ? getColumnId(fallback) : "";
}

function isColumnVisibilityLocked(column, allColumns = []) {
  const columnId = getColumnId(column);
  const primaryColumnId = getPrimaryColumnId(allColumns);

  if (!columnId) return true;
  if (columnId === primaryColumnId) return true;

  return Boolean(
    column?.lock_visibility ||
      column?.lockVisibility ||
      column?.settings?.lock_visibility ||
      column?.settings?.lockVisibility
  );
}

function sortSystemColumns(columns = []) {
  return [...columns].sort((a, b) => {
    const aIndex = SYSTEM_COLUMN_ORDER.indexOf(getColumnId(a));
    const bIndex = SYSTEM_COLUMN_ORDER.indexOf(getColumnId(b));

    const safeAIndex = aIndex >= 0 ? aIndex : 999;
    const safeBIndex = bIndex >= 0 ? bIndex : 999;

    return safeAIndex - safeBIndex;
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function normalizePanelRect(rect) {
  if (!rect || typeof rect !== "object") return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const maxWidth = viewportWidth - PANEL_SCREEN_PADDING * 2;
  const maxHeight = viewportHeight - PANEL_SCREEN_PADDING * 2;

  const width = clamp(
    Number(rect.width) || PANEL_WIDTH,
    PANEL_MIN_WIDTH,
    maxWidth
  );

  const height = clamp(
    Number(rect.height) || PANEL_HEIGHT,
    PANEL_MIN_HEIGHT,
    maxHeight
  );

  const left = clamp(
    Number(rect.left) || PANEL_SCREEN_PADDING,
    PANEL_SCREEN_PADDING,
    viewportWidth - width - PANEL_SCREEN_PADDING
  );

  const top = clamp(
    Number(rect.top) || PANEL_SCREEN_PADDING,
    PANEL_SCREEN_PADDING,
    viewportHeight - height - PANEL_SCREEN_PADDING
  );

  return {
    top,
    left,
    width,
    height,
  };
}

function getInitialPanelRect(anchorRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const width = Math.min(
    PANEL_WIDTH,
    viewportWidth - PANEL_SCREEN_PADDING * 2
  );

  const height = Math.min(
    PANEL_HEIGHT,
    viewportHeight - PANEL_SCREEN_PADDING * 2
  );

  if (!anchorRect) {
    return {
      top: PANEL_SCREEN_PADDING,
      left: Math.max(
        PANEL_SCREEN_PADDING,
        viewportWidth - width - PANEL_SCREEN_PADDING
      ),
      width,
      height,
    };
  }

  let left = anchorRect.left;
  let top = anchorRect.top - height - PANEL_GAP;

  if (top < PANEL_SCREEN_PADDING) {
    top = anchorRect.bottom + PANEL_GAP;
  }

  left = clamp(
    left,
    PANEL_SCREEN_PADDING,
    viewportWidth - width - PANEL_SCREEN_PADDING
  );

  top = clamp(
    top,
    PANEL_SCREEN_PADDING,
    viewportHeight - height - PANEL_SCREEN_PADDING
  );

  return {
    top,
    left,
    width,
    height,
  };
}

function FieldRow({
  column,
  isHidden,
  isLocked,
  onToggleColumnVisibility,
}) {
  const columnId = getColumnId(column);

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (isLocked) return;
        onToggleColumnVisibility?.(columnId);
      }}
      style={{
        width: "100%",
        minHeight: 34,
        border: "none",
        borderRadius: 8,
        background: "transparent",
        color: isLocked ? "#94a3b8" : "#0f172a",
        cursor: isLocked ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "0 10px",
        fontSize: 13,
        fontWeight: isHidden ? 500 : 700,
        textAlign: "left",
      }}
    >
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {getColumnTitle(column)}
      </span>

      <img
        src={isHidden ? eyeClosedIcon : eyeOpenIcon}
        alt=""
        style={{
          width: 15,
          height: 15,
          opacity: isLocked ? 0.4 : isHidden ? 0.55 : 1,
          flex: "0 0 auto",
        }}
      />
    </button>
  );
}

export default function TableFieldsVisibilityPanel({
  isOpen = false,
  anchorRect = null,
  allColumns = [],
  hiddenColumnIds = [],
  onToggleColumnVisibility,
  onClose,

  panelRectSettings,
  onPanelRectSettingsChange,
}) {
  const panelRef = useRef(null);
  const interactionRef = useRef(null);

  const [search, setSearch] = useState("");
  const [panelRect, setPanelRect] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const savedRect = normalizePanelRect(panelRectSettings);

    if (savedRect) {
      setPanelRect(savedRect);
      return;
    }

    setPanelRect(getInitialPanelRect(anchorRect));
  }, [isOpen, anchorRect, panelRectSettings]);

  const hiddenColumnIdsSet = useMemo(() => {
    return new Set(
      (Array.isArray(hiddenColumnIds) ? hiddenColumnIds : []).map(String)
    );
  }, [hiddenColumnIds]);

  const normalizedSearch = search.trim().toLowerCase();

  const { userColumns, systemColumns } = useMemo(() => {
    const safeColumns = Array.isArray(allColumns) ? allColumns : [];

    const user = safeColumns.filter((column) => !isSystemColumn(column));
    const system = sortSystemColumns(
      safeColumns.filter((column) => isSystemColumn(column))
    );

    const filterBySearch = (column) => {
      if (!normalizedSearch) return true;
      return getColumnTitle(column).toLowerCase().includes(normalizedSearch);
    };

    return {
      userColumns: user.filter(filterBySearch),
      systemColumns: system.filter(filterBySearch),
    };
  }, [allColumns, normalizedSearch]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event) => {
      if (interactionRef.current) return;
      if (panelRef.current?.contains(event.target)) return;

      onClose?.();
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (event) => {
      const interaction = interactionRef.current;

      if (!interaction) return;

      event.preventDefault();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;

      if (interaction.type === "drag") {
        setPanelRect((prev) => {
          if (!prev) return prev;

          const left = clamp(
            interaction.startLeft + deltaX,
            PANEL_SCREEN_PADDING,
            viewportWidth - prev.width - PANEL_SCREEN_PADDING
          );

          const top = clamp(
            interaction.startTop + deltaY,
            PANEL_SCREEN_PADDING,
            viewportHeight - prev.height - PANEL_SCREEN_PADDING
          );

          return {
            ...prev,
            left,
            top,
          };
        });

        return;
      }

      if (interaction.type === "resize") {
        setPanelRect((prev) => {
          if (!prev) return prev;

          let left = interaction.startLeft;
          let top = interaction.startTop;
          let width = interaction.startWidth;
          let height = interaction.startHeight;

          if (interaction.edge.includes("right")) {
            width = interaction.startWidth + deltaX;
          }

          if (interaction.edge.includes("left")) {
            width = interaction.startWidth - deltaX;
            left = interaction.startLeft + deltaX;
          }

          if (interaction.edge.includes("bottom")) {
            height = interaction.startHeight + deltaY;
          }

          if (interaction.edge.includes("top")) {
            height = interaction.startHeight - deltaY;
            top = interaction.startTop + deltaY;
          }

          if (width < PANEL_MIN_WIDTH) {
            if (interaction.edge.includes("left")) {
              left =
                interaction.startLeft +
                interaction.startWidth -
                PANEL_MIN_WIDTH;
            }

            width = PANEL_MIN_WIDTH;
          }

          if (height < PANEL_MIN_HEIGHT) {
            if (interaction.edge.includes("top")) {
              top =
                interaction.startTop +
                interaction.startHeight -
                PANEL_MIN_HEIGHT;
            }

            height = PANEL_MIN_HEIGHT;
          }

          if (left < PANEL_SCREEN_PADDING) {
            width -= PANEL_SCREEN_PADDING - left;
            left = PANEL_SCREEN_PADDING;
          }

          if (top < PANEL_SCREEN_PADDING) {
            height -= PANEL_SCREEN_PADDING - top;
            top = PANEL_SCREEN_PADDING;
          }

          if (left + width > viewportWidth - PANEL_SCREEN_PADDING) {
            width = viewportWidth - PANEL_SCREEN_PADDING - left;
          }

          if (top + height > viewportHeight - PANEL_SCREEN_PADDING) {
            height = viewportHeight - PANEL_SCREEN_PADDING - top;
          }

          width = Math.max(PANEL_MIN_WIDTH, width);
          height = Math.max(PANEL_MIN_HEIGHT, height);

          return {
            left,
            top,
            width,
            height,
          };
        });
      }
    };

    const handleMouseUp = () => {
      const hadInteraction = Boolean(interactionRef.current);

      interactionRef.current = null;

      if (hadInteraction) {
        setPanelRect((currentRect) => {
          if (currentRect) {
            onPanelRectSettingsChange?.(currentRect);
          }

          return currentRect;
        });
      }

      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isOpen, onPanelRectSettingsChange]);

  function startDrag(event) {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    if (!panelRect) return;

    interactionRef.current = {
      type: "drag",
      startX: event.clientX,
      startY: event.clientY,
      startLeft: panelRect.left,
      startTop: panelRect.top,
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  }

  function startResize(edge, event) {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    if (!panelRect) return;

    interactionRef.current = {
      type: "resize",
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: panelRect.left,
      startTop: panelRect.top,
      startWidth: panelRect.width,
      startHeight: panelRect.height,
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = getResizeCursor(edge);
  }

  function getResizeCursor(edge) {
    if (edge === "top" || edge === "bottom") return "ns-resize";
    if (edge === "left" || edge === "right") return "ew-resize";
    if (edge === "top-left" || edge === "bottom-right") return "nwse-resize";
    if (edge === "top-right" || edge === "bottom-left") return "nesw-resize";

    return "default";
  }

  function renderResizeHandle(edge, style) {
    return (
      <div
        onMouseDown={(event) => startResize(edge, event)}
        style={{
          position: "absolute",
          zIndex: 2,
          ...style,
          cursor: getResizeCursor(edge),
        }}
      />
    );
  }

  if (!isOpen || !panelRect) return null;

  return createPortal(
    <div
      ref={panelRef}
      data-table-action="true"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        top: panelRect.top,
        left: panelRect.left,
        zIndex: PANEL_Z_INDEX,
        width: panelRect.width,
        height: panelRect.height,
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        background: "#ffffff",
        border: "1px solid #dbe3ef",
        boxShadow: "0 22px 50px rgba(15, 23, 42, 0.2)",
        overflow: "hidden",
      }}
    >
      {renderResizeHandle("top", {
        top: 0,
        left: 10,
        right: 10,
        height: 6,
      })}

      {renderResizeHandle("right", {
        top: 10,
        right: 0,
        bottom: 10,
        width: 6,
      })}

      {renderResizeHandle("bottom", {
        left: 10,
        right: 10,
        bottom: 0,
        height: 6,
      })}

      {renderResizeHandle("left", {
        top: 10,
        left: 0,
        bottom: 10,
        width: 6,
      })}

      {renderResizeHandle("top-left", {
        top: 0,
        left: 0,
        width: 12,
        height: 12,
      })}

      {renderResizeHandle("top-right", {
        top: 0,
        right: 0,
        width: 12,
        height: 12,
      })}

      {renderResizeHandle("bottom-right", {
        right: 0,
        bottom: 0,
        width: 12,
        height: 12,
      })}

      {renderResizeHandle("bottom-left", {
        left: 0,
        bottom: 0,
        width: 12,
        height: 12,
      })}

      <div
        onMouseDown={startDrag}
        style={{
          padding: "14px 14px 12px",
          borderBottom: "1px solid #eef2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flex: "0 0 auto",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 850,
              color: "#0f172a",
              lineHeight: 1.2,
            }}
          >
            Поля таблицы
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.2,
            }}
          >
            Управление видимостью столбцов
          </div>
        </div>

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClose?.();
          }}
          style={{
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 8,
            background: "#f1f5f9",
            color: "#475569",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
          title="Закрыть"
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #eef2f7",
          flex: "0 0 auto",
        }}
      >
        <input
          type="text"
          value={search}
          placeholder="Найти поле..."
          onChange={(event) => setSearch(event.target.value)}
          onMouseDown={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            height: 34,
            border: "1px solid #dbe3ef",
            borderRadius: 9,
            padding: "0 10px",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          padding: 10,
          overflowY: "auto",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "6px 8px 6px",
            fontSize: 11,
            fontWeight: 850,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Пользовательские поля
        </div>

        {userColumns.length > 0 ? (
          userColumns.map((column) => {
            const columnId = getColumnId(column);

            return (
              <FieldRow
                key={columnId}
                column={column}
                isHidden={hiddenColumnIdsSet.has(columnId)}
                isLocked={isColumnVisibilityLocked(column, allColumns)}
                onToggleColumnVisibility={onToggleColumnVisibility}
              />
            );
          })
        ) : (
          <div
            style={{
              padding: "8px 10px",
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            Поля не найдены
          </div>
        )}

        <div
          style={{
            height: 1,
            background: "#eef2f7",
            margin: "10px 0",
          }}
        />

        <div
          style={{
            padding: "6px 8px 6px",
            fontSize: 11,
            fontWeight: 850,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Системные поля
        </div>

        {systemColumns.length > 0 ? (
          systemColumns.map((column) => {
            const columnId = getColumnId(column);

            return (
              <FieldRow
                key={columnId}
                column={column}
                isHidden={hiddenColumnIdsSet.has(columnId)}
                isLocked={isColumnVisibilityLocked(column, allColumns)}
                onToggleColumnVisibility={onToggleColumnVisibility}
              />
            );
          })
        ) : (
          <div
            style={{
              padding: "8px 10px",
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            Системные поля не найдены
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}