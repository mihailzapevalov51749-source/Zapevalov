import { useEffect, useMemo, useState } from "react";

import MenuItemEditor from "./MenuItemEditor";
import { theme } from "../../../styles/theme";
import { LAYOUT_TOKENS } from "../../../shared/layout/layoutTokens";

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

function hasCustomMenuIcon(item) {
  return item?.icon_type === "upload" && Boolean(item?.icon_file_url);
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
  sidebarCollapsed = false,
  sidebarMode = "runtime",
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const state = getCollapsedState();
    return Boolean(state[item.id]);
  });

  const isProtectedTitle = isProtectedMenuTitle(item?.title);

  const isSystem =
    item?.isSystem ||
    item?.is_system === true ||
    item?.is_protected === true ||
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

  if (!isEditMode && !item.is_visible) {
    return null;
  }

  const normalizePath = (value) => {
    if (!value) return "";
    const trimmed = String(value).trim();
    if (!trimmed) return "";
    if (trimmed === "/") return "/";
    return trimmed.replace(/\/+$/, "");
  };
  const currentPathname = normalizePath(window.location.pathname);
  const itemRoute = normalizePath(item.route || item.path || item.url);
  const isDesignerRoute =
    itemRoute.startsWith("/designer/") && currentPathname.startsWith("/designer/");
  const isRouteActive = Boolean(
    itemRoute &&
      (currentPathname === itemRoute ||
        (isDesignerRoute && currentPathname.startsWith(`${itemRoute}/`)))
  );
  const resolveNumericId = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  const currentDesignerPageId = resolveNumericId(
    currentPathname.match(/\/designer\/tenant\/\d+\/page\/(\d+)/)?.[1]
  );
  const itemPageId = resolveNumericId(
    item.page_id ?? item.pageId ?? item?.meta?.page_id
  );
  const activeNumericPageId = resolveNumericId(activePageId);
  const isPageActiveById =
    itemPageId != null &&
    ((activeNumericPageId != null && itemPageId === activeNumericPageId) ||
      (activeNumericPageId == null &&
        currentDesignerPageId != null &&
        itemPageId === currentDesignerPageId));
  const isActive =
    item.active === true ||
    isPageActiveById ||
    isRouteActive;

  const visibleChildren = isEditMode
    ? item.children || []
    : (item.children || []).filter((child) => child.is_visible);

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

  const allowSystemDrag = sidebarMode === "designer" && isSystem;
  const canDragItem = !isSystem || allowSystemDrag;
  const isDropTarget =
    canDragItem && dragAndDrop?.dropTarget?.targetId === item.id;

  const dropPosition = dragAndDrop?.dropTarget?.position;

  const isDesignerMode = sidebarMode === "designer";
  const activeAccent = isDesignerMode ? "#6D28D9" : "#2563EB";
  const activeBackground = isDesignerMode ? "#F5F3FF" : "#EEF4FF";
  const hoverBackground = isDesignerMode ? "#F8F5FF" : "#F8FAFC";
  const itemTextColor = isActive ? activeAccent : item.color || "#0F172A";
  const sidebarVisual = LAYOUT_TOKENS.sidebar;
  const rowHeight = sidebarCollapsed
    ? sidebarVisual.menuItemHeight
    : BASE.rowHeight * scale;
  const iconSize = sidebarCollapsed
    ? sidebarVisual.menuItemIconSize
    : BASE.iconSize * scale;
  const itemFontSize = sidebarCollapsed
    ? sidebarVisual.menuItemFontSize
    : BASE.fontSize * scale;
  const itemRadius = sidebarCollapsed
    ? sidebarVisual.menuItemRadius
    : BASE.radius * scale;
  const itemGap = sidebarCollapsed
    ? sidebarVisual.menuItemGap
    : BASE.gap * scale;

  const itemBackground = useMemo(() => {
    if (isDropTarget && dropPosition === "inside") return "#DBEAFE";
    if (isActive) return activeBackground;
    if (isHovered || isEditorOpen) return hoverBackground;
    return "transparent";
  }, [
    isDropTarget,
    dropPosition,
    isActive,
    isHovered,
    isEditorOpen,
    activeBackground,
    hoverBackground,
  ]);

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
        opacity: item.is_visible ? 1 : 0.35,
      }}
    >
      {isDropTarget && dropPosition === "before" && <DropLine scale={scale} />}

      <div
        draggable={isEditMode && canDragItem}
        onDragStart={() => {
          if (!canDragItem) return;
          dragAndDrop?.handleDragStart(item.id);
        }}
        onDragOver={(event) => {
          if (!canDragItem) return;
          dragAndDrop?.handleDragOver(event, item);
        }}
        onDrop={(event) => {
          if (!canDragItem) return;
          dragAndDrop?.handleDrop(event, item);
        }}
        onDragEnd={() => dragAndDrop?.resetDrag()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        style={{
          position: "relative",
          cursor: isEditMode && canDragItem ? "grab" : isClickable ? "pointer" : "default",
          height: rowHeight,
          minHeight: rowHeight,
          padding: sidebarCollapsed ? "0 6px" : `0 ${BASE.paddingX * scale}px`,
          borderRadius: itemRadius,
          background: itemBackground,
          fontWeight: isActive ? 600 : item.is_bold ? 700 : 500,
          fontStyle: item.is_italic ? "italic" : "normal",
          fontSize: itemFontSize,
          color: itemTextColor,
          display: "flex",
          alignItems: "center",
          justifyContent: sidebarCollapsed ? "center" : "space-between",
          gap: itemGap,
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
            gap: itemGap,
            minWidth: 0,
            flex: sidebarCollapsed ? "0 0 auto" : 1,
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
          }}
        >
          {isEditMode && canDragItem && !sidebarCollapsed && (
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

          {isEditMode && canDragItem && !sidebarCollapsed && (
            <TypeBadge type={item.type} scale={scale} />
          )}

          {sidebarCollapsed ? (
            hasCustomMenuIcon(item) ? (
              <IconRenderer
                iconType={item.icon_type}
                iconFileUrl={item.icon_file_url}
                scale={1}
                iconSize={iconSize}
              />
            ) : (
              <DefaultIcon
                type={item.type}
                scale={1}
                active={isActive}
                iconSize={iconSize}
                accentColor={activeAccent}
              />
            )
          ) : (
            <>
              <IconRenderer
                iconType={item.icon_type}
                iconFileUrl={item.icon_file_url}
                scale={scale}
                iconSize={iconSize}
              />

              {isEditMode && item.type === "system_page" && !item.icon_type && (
                <DefaultIcon
                  type={item.type}
                  scale={scale}
                  active={isActive}
                  iconSize={iconSize}
                  accentColor={activeAccent}
                />
              )}
            </>
          )}

          {!sidebarCollapsed && (
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
          )}
        </div>

        {isEditMode && !sidebarCollapsed && (
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
              color: isActive ? activeAccent : "#64748B",
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

      {hasChildren && !isCollapsed && !sidebarCollapsed && (
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
              dragAndDrop={
                child?.isSystem && sidebarMode !== "designer" ? null : dragAndDrop
              }
              scale={scale}
              openedEditorItemId={openedEditorItemId}
              setOpenedEditorItemId={setOpenedEditorItemId}
              sidebarCollapsed={sidebarCollapsed}
              sidebarMode={sidebarMode}
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

function DefaultIcon({
  type,
  scale = 1,
  active = false,
  iconSize,
  accentColor = "#2563EB",
}) {
  const size = iconSize ?? BASE.iconSize * scale;
  const config = {
    section: "▣",
    workspace: "▣",
    page: "□",
    universal_table: "▦",
    external_link: "↗",
    document_library: "▤",
    system_page: "⚙",
    table: "▦",
  };

  const symbol = config[type] || "?";

  return (
    <span
      style={{
        width: size,
        height: size,
        color: active ? accentColor : "#64748B",
        fontSize: Math.max(12, size - 2),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
      title={itemTypeLabel(type)}
    >
      {symbol}
    </span>
  );
}

function itemTypeLabel(type) {
  const labels = {
    section: "Раздел",
    workspace: "Раздел",
    page: "Страница",
    universal_table: "Универсальная таблица",
    external_link: "Ссылка",
    document_library: "Библиотека документов",
    system_page: "Системная страница",
    table: "Таблица",
  };

  return labels[type] || "Пункт меню";
}

function IconRenderer({ iconType, iconFileUrl, scale = 1, iconSize }) {
  const size = iconSize ?? BASE.iconSize * scale;

  if (iconType === "upload" && iconFileUrl) {
    return (
      <img
        src={`${API_BASE_URL}${iconFileUrl}`}
        alt=""
        style={{
          width: size,
          height: size,
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