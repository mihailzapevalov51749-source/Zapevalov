import { useEffect, useMemo, useState } from "react";

import MenuItemEditor from "./MenuItemEditor";
import { theme } from "../../../styles/theme";

const API_BASE_URL = "http://127.0.0.1:8010";

const BASE = {
  rowHeight: 40,
  paddingX: 12,
  fontSize: 13,
  iconSize: 16,
  gap: 8,
  indent: 14,
  radius: 8,
  typeBadgeSize: 18,
};

const PROTECTED_TITLES = ["главная страница", "мои задачи"];
const MENU_COLLAPSE_STORAGE_KEY = "yasnopro-menu-collapsed";

function getCollapsedState() {
  try {
    return JSON.parse(
      localStorage.getItem(MENU_COLLAPSE_STORAGE_KEY) || "{}"
    );
  } catch {
    return {};
  }
}

function saveCollapsedState(state) {
  localStorage.setItem(MENU_COLLAPSE_STORAGE_KEY, JSON.stringify(state));
}

function isProtectedMenuTitle(title) {
  return PROTECTED_TITLES.includes(String(title || "").trim().toLowerCase());
}

export default function MenuItem({
  item,
  activePageId,
  onSelectPage,
  isEditMode,
  onUpdateItem,
  onDeleteItem,
  dragAndDrop,
  scale = 1,
  openedEditorItemId,
  setOpenedEditorItemId,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const state = getCollapsedState();
    return Boolean(state[item.id]);
  });

  const isProtectedTitle = isProtectedMenuTitle(item?.title);

  const isSystem =
    item?.isSystem ||
    String(item?.id || "").startsWith("system-") ||
    isProtectedTitle;

  const isEditorOpen = openedEditorItemId === item.id;

  useEffect(() => {
    const handleClose = () => {
      setOpenedEditorItemId?.(null);
    };

    document.addEventListener("click", handleClose);

    return () => {
      document.removeEventListener("click", handleClose);
    };
  }, [setOpenedEditorItemId]);

  if (!isEditMode && !item.is_visible && !isSystem) {
    return null;
  }

  const isActive =
    item.page_id && item.page_id === activePageId
      ? true
      : item.type === "system_page" && item.route === window.location.pathname;

  const visibleChildren = isEditMode
    ? item.children || []
    : (item.children || []).filter((child) => child.is_visible || child.isSystem);

  const hasChildren = visibleChildren.length > 0;

  const isSection =
    item.type === "section" || item.type === "workspace" || hasChildren;

  const isPageLike =
    item.type === "page" ||
    item.type === "table" ||
    item.type === "universal_table" ||
    item.type === "document_library";

  const isClickable =
    !isEditMode &&
    ((isPageLike && item.page_id) ||
      (item.type === "external_link" && item.url) ||
      (item.type === "system_page" && item.route) ||
      isSection);

  const isDropTarget =
    !isSystem && dragAndDrop?.dropTarget?.targetId === item.id;

  const dropPosition = dragAndDrop?.dropTarget?.position;

  const itemTextColor = isActive ? "#2563EB" : item.color || "#0F172A";

  const itemBackground = useMemo(() => {
    if (isDropTarget && dropPosition === "inside") return "#DBEAFE";
    if (isActive) return "#EEF4FF";
    if (isHovered || isEditorOpen) return "#F8FAFC";
    return "transparent";
  }, [isDropTarget, dropPosition, isActive, isHovered, isEditorOpen]);

  const handleClick = () => {
    if (isSection) {
      setIsCollapsed((prev) => {
        const next = !prev;
        const state = getCollapsedState();

        state[item.id] = next;

        saveCollapsedState(state);

        return next;
      });

      return;
    }

    if (isEditMode) return;
    if (!item.is_visible && !isSystem) return;

    if (item.type === "system_page" && item.route) {
      window.history.pushState({}, "", item.route);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    if (isPageLike && item.page_id) {
      onSelectPage?.(item.page_id);
      return;
    }

    if (item.type === "external_link" && item.url) {
      window.open(item.url, "_blank");
    }
  };

  return (
    <div
      style={{
        marginBottom: 2 * scale,
        opacity: item.is_visible || isSystem ? 1 : 0.35,
      }}
    >
      {isDropTarget && dropPosition === "before" && <DropLine scale={scale} />}

      <div
        draggable={isEditMode && !isSystem}
        onDragStart={() => {
          if (isSystem) return;
          dragAndDrop?.handleDragStart(item.id);
        }}
        onDragOver={(event) => {
          if (isSystem) return;
          dragAndDrop?.handleDragOver(event, item);
        }}
        onDrop={(event) => {
          if (isSystem) return;
          dragAndDrop?.handleDrop(event, item);
        }}
        onDragEnd={() => dragAndDrop?.resetDrag()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        style={{
          position: "relative",
          cursor: isEditMode && !isSystem ? "grab" : isClickable ? "pointer" : "default",
          height: BASE.rowHeight * scale,
          minHeight: BASE.rowHeight * scale,
          padding: `0 ${BASE.paddingX * scale}px`,
          borderRadius: BASE.radius * scale,
          background: itemBackground,
          fontWeight: isActive ? 600 : item.is_bold ? 700 : 500,
          fontStyle: item.is_italic ? "italic" : "normal",
          fontSize: BASE.fontSize * scale,
          color: itemTextColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: BASE.gap * scale,
          boxSizing: "border-box",
          width: "100%",
          transition: "background 0.15s ease, color 0.15s ease, opacity 0.15s ease",
          boxShadow: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: BASE.gap * scale,
            minWidth: 0,
            flex: 1,
          }}
        >
          {isEditMode && !isSystem && (
            <span
              style={{
                color: "#94A3B8",
                cursor: "grab",
                fontSize: 13 * scale,
                flexShrink: 0,
                userSelect: "none",
              }}
              title="Перетащить"
            >
              ⋮⋮
            </span>
          )}

          {isEditMode && !isSystem && (
            <TypeBadge type={item.type} scale={scale} />
          )}

          <IconRenderer
            iconType={item.icon_type}
            iconFileUrl={item.icon_file_url}
            scale={scale}
          />

          {isEditMode && item.type === "system_page" && !item.icon_type && (
            <DefaultIcon type={item.type} scale={scale} active={isActive} />
          )}

          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              color: itemTextColor,
            }}
            title={item.title}
          >
            {item.title}
          </span>
        </div>

        {isEditMode && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenedEditorItemId?.(isEditorOpen ? null : item.id);
            }}
            style={{
              width: 22,
              height: 22,
              border: "none",
              borderRadius: 6,
              background: isEditorOpen ? "#E2E8F0" : "transparent",
              cursor: "pointer",
              fontSize: 13 * scale,
              color: isActive ? "#2563EB" : "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: isHovered || isEditorOpen ? 1 : 0,
              transition: "opacity 0.15s ease, background 0.15s ease",
            }}
            title={isSystem ? "Настроить отображение" : "Редактировать"}
          >
            ✎
          </button>
        )}
      </div>

      {isDropTarget && dropPosition === "after" && <DropLine scale={scale} />}

      {isEditMode && isEditorOpen && (
        <div onClick={(event) => event.stopPropagation()}>
          <MenuItemEditor
            item={item}
            onSave={async (data) => {
              await onUpdateItem(item.id, {
                ...data,
                isSystem,
              });

              setOpenedEditorItemId?.(null);
            }}
            onDelete={async () => {
              if (isSystem) return;

              await onDeleteItem(item.id);

              setOpenedEditorItemId?.(null);
            }}
            onClose={() => setOpenedEditorItemId?.(null)}
          />
        </div>
      )}

      {hasChildren && !isCollapsed && (
        <div
          style={{
            marginLeft: 0,
            marginTop: 2 * scale,
          }}
        >
          {visibleChildren.map((child) => (
            <MenuItem
              key={child.id}
              item={child}
              activePageId={activePageId}
              onSelectPage={onSelectPage}
              isEditMode={isEditMode}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              dragAndDrop={child?.isSystem ? null : dragAndDrop}
              scale={scale}
              openedEditorItemId={openedEditorItemId}
              setOpenedEditorItemId={setOpenedEditorItemId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type, scale = 1 }) {
  const config = {
    section: { symbol: "▣", title: "Раздел" },
    workspace: { symbol: "▣", title: "Раздел" },
    page: { symbol: "□", title: "Страница" },
    universal_table: {
      symbol: "▦",
      title: "Универсальная таблица",
    },
    external_link: {
      symbol: "↗",
      title: "Ссылка",
    },
    document_library: {
      symbol: "▤",
      title: "Библиотека документов",
    },
    system_page: {
      symbol: "⚙",
      title: "Системная страница",
    },
  };

  const current =
    config[type] || {
      symbol: "?",
      title: "Тип элемента",
    };

  return (
    <span
      title={current.title}
      style={{
        width: BASE.typeBadgeSize * scale,
        height: BASE.typeBadgeSize * scale,
        borderRadius: 6 * scale,
        border: "1px solid #CBD5E1",
        background: "#F8FAFC",
        color: "#64748B",
        fontSize: 12 * scale,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {current.symbol}
    </span>
  );
}

function DefaultIcon({ type, scale = 1, active = false }) {
  const config = {
    system_page: "⚙",
  };

  const symbol = config[type];

  if (!symbol) return null;

  return (
    <span
      style={{
        width: BASE.iconSize * scale,
        height: BASE.iconSize * scale,
        color: active ? "#2563EB" : "#64748B",
        fontSize: 14 * scale,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {symbol}
    </span>
  );
}

function IconRenderer({ iconType, iconFileUrl, scale = 1 }) {
  if (iconType === "upload" && iconFileUrl) {
    return (
      <img
        src={`${API_BASE_URL}${iconFileUrl}`}
        alt=""
        style={{
          width: BASE.iconSize * scale,
          height: BASE.iconSize * scale,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
    );
  }

  return null;
}

function DropLine({ scale = 1 }) {
  return (
    <div
      style={{
        height: 2,
        background: theme.colors.primaryBlue,
        borderRadius: 999,
        margin: `${4 * scale}px 0`,
        boxShadow: "0 0 12px rgba(37,99,255,0.35)",
      }}
    />
  );
}