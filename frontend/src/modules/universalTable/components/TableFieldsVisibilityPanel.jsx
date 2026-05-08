import { useEffect, useMemo, useRef, useState } from "react";

import eyeOpenIcon from "../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../assets/icons/eye-closed.png";

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
const PANEL_GAP = -200;
const PANEL_SCREEN_PADDING = 12;
const PANEL_VERTICAL_OFFSET_RATIO = 0.95;

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

function getPanelPosition(anchorRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!anchorRect) {
    const top = PANEL_SCREEN_PADDING;
    const maxHeight = Math.min(
      PANEL_HEIGHT,
      viewportHeight - PANEL_SCREEN_PADDING * 2
    );

    return {
      top,
      left: Math.max(
        PANEL_SCREEN_PADDING,
        viewportWidth - PANEL_WIDTH - 24
      ),
      maxHeight,
    };
  }

  const hasSpaceRight =
    anchorRect.right + PANEL_GAP + PANEL_WIDTH <=
    viewportWidth - PANEL_SCREEN_PADDING;

  const left = hasSpaceRight
    ? anchorRect.right + PANEL_GAP
    : Math.max(
        PANEL_SCREEN_PADDING,
        anchorRect.left - PANEL_GAP - PANEL_WIDTH
      );

  const preferredTop =
    anchorRect.top - Math.round(PANEL_HEIGHT * PANEL_VERTICAL_OFFSET_RATIO);

  const minTop = PANEL_SCREEN_PADDING;
  const maxTop = Math.max(
    PANEL_SCREEN_PADDING,
    viewportHeight - PANEL_HEIGHT - PANEL_SCREEN_PADDING
  );

  const top = Math.max(minTop, Math.min(preferredTop, maxTop));

  const maxHeight = Math.min(
    PANEL_HEIGHT,
    Math.max(260, viewportHeight - top - PANEL_SCREEN_PADDING)
  );

  return {
    top,
    left,
    maxHeight,
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
}) {
  const panelRef = useRef(null);
  const [search, setSearch] = useState("");

  const panelPosition = useMemo(() => {
    if (!isOpen) return null;
    return getPanelPosition(anchorRect);
  }, [isOpen, anchorRect]);

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

  if (!isOpen || !panelPosition) return null;

  return (
    <div
      ref={panelRef}
      data-table-action="true"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        top: panelPosition.top,
        left: panelPosition.left,
        zIndex: 7000,
        width: PANEL_WIDTH,
        maxHeight: panelPosition.maxHeight,
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        background: "#ffffff",
        border: "1px solid #dbe3ef",
        boxShadow: "0 22px 50px rgba(15, 23, 42, 0.2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 14px 12px",
          borderBottom: "1px solid #eef2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flex: "0 0 auto",
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
    </div>
  );
}