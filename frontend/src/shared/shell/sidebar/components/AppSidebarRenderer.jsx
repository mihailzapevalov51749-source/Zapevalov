import { useEffect, useMemo, useState } from "react";

import defaultBrandLogo from "../../../../assets/icons/logo.png";
import chevronLeftIcon from "../../../../assets/icons/Chevronleft.png";
import settingsIcon from "../../../../assets/icons/settings.gif";
import saveIcon from "../../../../assets/icons/save.gif";
import MenuTree from "../../../../modules/navigation/components/MenuTree";
import useMenuDragAndDrop from "../../../../modules/navigation/hooks/useMenuDragAndDrop";
import { LAYOUT_TOKENS } from "../../../layout/layoutTokens";
import { TRANSITION_TOKENS } from "../../../layout/transitionTokens";
import "./appSidebarRenderer.css";

const SYSTEM_MENU_SETTINGS_KEY = "systemMenuSettings";
const PROTECTED_MENU_TITLES = ["главная страница", "мои задачи"];

export default function AppSidebarRenderer({
  contract,
  className = "",
  collapsed = false,
  onToggleCollapse = () => {},
  onItemAction,
  onAction,
}) {
  console.log("[RENDER AppSidebarRenderer]", {
    mode: contract?.mode,
    collapsed,
  });
  if (!contract) {
    return null;
  }

  return (
    <ShellSidebarView
      contract={contract}
      className={className}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onItemAction={onItemAction}
      onAction={onAction}
    />
  );
}

function ShellSidebarView({
  contract,
  className,
  collapsed,
  onToggleCollapse,
  onItemAction,
  onAction,
}) {
  const {
    brand,
    editMode = false,
    isSaving = false,
    menuScale = 1,
    activePageId,
    onChangeMenuScale,
  } = contract;

  const navigationItems = contract.navigationItems ?? [];
  const hasDesignerScope = hasMenuScope(navigationItems, "designer");
  const reloadNavigation =
    typeof contract.reloadNavigation === "function"
      ? contract.reloadNavigation
      : async () => {};
  const canDragMenu = Boolean(
    editMode &&
      contract?.capabilities?.canDragItems &&
      (hasDesignerScope || hasPersistableNavigationItems(navigationItems))
  );

  const [systemMenuSettings, setSystemMenuSettings] = useState(() =>
    getSystemMenuSettings()
  );

  const dragAndDrop = useMenuDragAndDrop({
    items: navigationItems,
    isEnabled: canDragMenu,
    reload: reloadNavigation,
    onMove: async (itemsPayload) => {
      if (typeof onAction === "function") {
        onAction("move-menu-items", { items: itemsPayload });
      }
    },
  });

  console.log("[SIDEBAR collapsed value]", { collapsed });

  useEffect(() => {
    if (!dragAndDrop?.dropTarget && !dragAndDrop?.draggedId) return;
    console.log("[SIDEBAR drag drop payload]", {
      draggedId: dragAndDrop?.draggedId,
      dropTarget: dragAndDrop?.dropTarget,
      treeSize: Array.isArray(dragAndDrop?.tree) ? dragAndDrop.tree.length : 0,
    });
  }, [dragAndDrop?.draggedId, dragAndDrop?.dropTarget, dragAndDrop?.tree]);

  const finalTree = useMemo(() => {
    if (hasDesignerScope) {
      return dragAndDrop.tree;
    }

    const treeWithProtectedSettings = applyProtectedMenuSettings(
      dragAndDrop.tree,
      systemMenuSettings
    );

    return insertMyTasksAfterMainPage(
      treeWithProtectedSettings,
      getMyTasksItem(systemMenuSettings)
    );
  }, [dragAndDrop.tree, hasDesignerScope, systemMenuSettings]);

  const logoSrc = brand.logoSrc || defaultBrandLogo;
  const sidebarVisual = LAYOUT_TOKENS.sidebar;

  const rootClassName = [
    "app-sidebar-renderer",
    hasDesignerScope ? "app-sidebar-renderer--designer" : "app-sidebar-renderer--runtime",
    collapsed ? "is-collapsed" : "",
    editMode ? "is-edit-mode" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleEditButtonClick = () => {
    if (editMode) {
      onAction?.("toggle-edit-mode");
      return;
    }

    onAction?.("toggle-edit-mode");
  };

  const handleSelectPage = (pageId) => {
    if (pageId == null || typeof onItemAction !== "function") {
      return;
    }

    onItemAction({ pageId }, { preventDefault: () => {} });
  };

  const handleUpdateItem = async (itemId, data) => {
    console.log("[SIDEBAR update item payload]", { itemId, data });
    if (String(itemId).startsWith("system-designer-fallback-")) {
      return;
    }

    const isSystemItem =
      String(itemId).startsWith("system-") ||
      data?.isSystem ||
      isProtectedMenuItem(data);

    if (isSystemItem && !hasDesignerScope) {
      const safeData = {
        title: data.title,
        icon: data.icon ?? null,
        icon_type: data.icon_type ?? null,
        icon_file_url: data.icon_file_url ?? null,
        color: data.color,
        is_bold: data.is_bold,
        is_italic: data.is_italic,
        is_visible: data.is_visible,
      };

      const nextSettings = {
        ...systemMenuSettings,
        [itemId]: safeData,
      };

      setSystemMenuSettings(nextSettings);
      saveSystemMenuSettings(nextSettings);
      return;
    }

    onAction?.("update-menu-item", {
      id: itemId,
      data,
      navigationItems,
    });
  };

  const handleDeleteItem = async (itemId) => {
    const item = findItemById(navigationItems, itemId);
    if (
      String(itemId).startsWith("system-") ||
      item?.is_protected === true ||
      item?.isProtected === true
    ) {
      return;
    }
    onAction?.("delete-menu-item", { id: itemId });
  };

  const handleScaleChange = (step) => {
    if (typeof onChangeMenuScale === "function") {
      onChangeMenuScale(menuScale + step);
      return;
    }

    onAction?.("menu-scale", { value: menuScale, step });
  };

  const menuActivePageId = resolveMenuActivePageId(activePageId);

  return (
    <aside
      className={rootClassName}
      style={{
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        transition: TRANSITION_TOKENS.shell.sidebarWidth,
      }}
    >
      <div style={{ padding: collapsed ? "8px 6px" : "8px 14px" }}>
        <SidebarBrand
          menuScale={menuScale}
          collapsed={collapsed}
          logoSrc={logoSrc}
          brand={brand}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingLeft: collapsed ? 6 : 14,
          paddingRight: collapsed ? 6 : 10,
          paddingBottom: 4,
        }}
      >
        {!collapsed && editMode ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => handleScaleChange(-0.1)}
              style={scaleButtonStyle}
            >
              −
            </button>
            <span
              style={{
                fontSize: 12,
                color: "#64748B",
                minWidth: 42,
                textAlign: "center",
              }}
            >
              {Math.round(menuScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleScaleChange(0.1)}
              style={scaleButtonStyle}
            >
              +
            </button>
          </div>
        ) : null}

        <MenuTree
          items={finalTree}
          activePageId={menuActivePageId}
          onSelectPage={handleSelectPage}
          isEditMode={editMode}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          dragAndDrop={canDragMenu ? dragAndDrop : null}
          scale={menuScale}
          sidebarCollapsed={collapsed}
          sidebarMode={hasDesignerScope ? "designer" : "runtime"}
        />

        {!collapsed && editMode ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={() => onAction?.("add-menu-item")}
              style={createButtonStyle}
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      <div
        style={{
          ...sidebarFooterStyle,
          justifyContent: collapsed ? "center" : sidebarFooterStyle.justifyContent,
          padding: collapsed ? "10px 8px" : sidebarFooterStyle.padding,
          gap: collapsed ? 0 : sidebarFooterStyle.gap,
        }}
      >
        <button
          type="button"
          onClick={() => {
            console.log("[SIDEBAR collapse click]", { collapsed });
            onToggleCollapse();
          }}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          style={{
            ...collapseButtonStyle,
            flex: collapsed ? "0 0 auto" : collapseButtonStyle.flex,
            justifyContent: "center",
            width: collapsed ? sidebarVisual.menuItemHeight : undefined,
            minWidth: collapsed
              ? sidebarVisual.menuItemHeight
              : collapseButtonStyle.minWidth,
          }}
        >
          <img
            src={chevronLeftIcon}
            alt=""
            style={{
              ...chevronLeftImageStyle,
              transform: collapsed ? "rotate(180deg)" : "none",
            }}
          />
          {!collapsed ? <span>Свернуть меню</span> : null}
        </button>

        {!collapsed ? (
          <button
            type="button"
            onClick={handleEditButtonClick}
            disabled={isSaving}
            title={editMode ? "Сохранить меню" : "Редактировать меню"}
            style={{
              ...settingsButtonStyle,
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            <img
              src={editMode ? saveIcon : settingsIcon}
              alt=""
              style={settingsImageStyle}
            />
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function SidebarBrand({ menuScale, collapsed, logoSrc, brand }) {
  const sidebarVisual = LAYOUT_TOKENS.sidebar;
  const logoSize = collapsed
    ? sidebarVisual.brandLogoCollapsedSize
    : sidebarVisual.brandLogoSize;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        minHeight: 42,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <img
        src={logoSrc}
        alt="YasnoPro"
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
      {!collapsed ? (
        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            lineHeight: 1.15,
          }}
        >
          <div
            style={{
              color: "#0F172A",
              fontSize: sidebarVisual.brandTitleFontSize * menuScale,
              fontWeight: 800,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {brand.title}
          </div>
          {brand.subtitle ? (
            <div
              style={{
                color: "#64748B",
                fontSize: sidebarVisual.brandSubtitleFontSize * menuScale,
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {brand.subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getSystemMenuSettings() {
  try {
    return JSON.parse(localStorage.getItem(SYSTEM_MENU_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSystemMenuSettings(settings) {
  localStorage.setItem(SYSTEM_MENU_SETTINGS_KEY, JSON.stringify(settings));
}

function isProtectedMenuItem(item) {
  const title = String(item?.title || "").trim().toLowerCase();

  return (
    PROTECTED_MENU_TITLES.includes(title) ||
    item?.is_home === true ||
    item?.isHome === true ||
    item?.type === "home"
  );
}

function applySystemSettings(item, settings) {
  const itemSettings = settings[item.id] || {};

  const nextItem = {
    ...item,
    ...itemSettings,
    isSystem: true,
    is_visible:
      itemSettings.is_visible === undefined
        ? item.is_visible
        : itemSettings.is_visible,
  };

  if (Array.isArray(item.children)) {
    nextItem.children = item.children.map((child) =>
      applySystemSettings(child, settings)
    );
  }

  return nextItem;
}

function applyProtectedMenuSettings(tree = [], systemSettings = {}) {
  return tree.map((item) => {
    const children = Array.isArray(item.children)
      ? applyProtectedMenuSettings(item.children, systemSettings)
      : item.children;

    const nextItem = { ...item, children };

    if (!isProtectedMenuItem(nextItem)) return nextItem;

    return applySystemSettings({ ...nextItem, isSystem: true }, systemSettings);
  });
}

function getMyTasksItem(systemSettings = {}) {
  const item = {
    id: "system-my-tasks",
    title: "Мои задачи",
    type: "system_page",
    route: "/my-tasks",
    isSystem: true,
    is_visible: true,
    is_hidden: false,
    position: 2,
  };

  return applySystemSettings(item, systemSettings);
}

function insertMyTasksAfterMainPage(tree = [], myTasksItem) {
  const hasMyTasksAlready = tree.some(
    (item) =>
      item?.id === "system-my-tasks" ||
      String(item?.title || "").trim().toLowerCase() === "мои задачи"
  );

  if (hasMyTasksAlready) return tree;

  const mainPageIndex = tree.findIndex((item) => {
    const title = String(item?.title || "").trim().toLowerCase();

    return (
      title === "главная страница" ||
      item?.is_home === true ||
      item?.isHome === true ||
      item?.type === "home"
    );
  });

  if (mainPageIndex === -1) return [myTasksItem, ...tree];

  return [
    ...tree.slice(0, mainPageIndex + 1),
    myTasksItem,
    ...tree.slice(mainPageIndex + 1),
  ];
}

const sidebarFooterStyle = {
  padding: "10px 14px 10px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexShrink: 0,
};

const collapseButtonStyle = {
  flex: 1,
  height: 34,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#64748B",
  fontSize: 12,
  fontWeight: 400,
  cursor: "pointer",
  paddingLeft: 0,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "color 140ms ease, opacity 140ms ease",
  opacity: 0.88,
};

const chevronLeftImageStyle = {
  width: 10,
  height: 10,
  objectFit: "contain",
  display: "block",
  flexShrink: 0,
  opacity: 0.72,
};

const settingsButtonStyle = {
  width: 32,
  height: 32,
  border: "none",
  borderRadius: 10,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
  transition: "background 140ms ease",
};

const settingsImageStyle = {
  width: 14,
  height: 14,
  objectFit: "contain",
  display: "block",
  opacity: 0.72,
};

const scaleButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1,
};

const createButtonStyle = {
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  cursor: "pointer",
  fontSize: 26,
  lineHeight: 1,
  padding: 4,
  width: 38,
  height: 38,
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
};

function resolveMenuActivePageId(activePageId) {
  if (activePageId == null) {
    return activePageId;
  }

  if (typeof activePageId === "number" && Number.isFinite(activePageId)) {
    return activePageId;
  }

  if (typeof activePageId === "string") {
    const trimmed = activePageId.trim();
    if (!trimmed) {
      return undefined;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && String(numeric) === trimmed) {
      return numeric;
    }

    return trimmed;
  }

  return activePageId;
}

function hasPersistableNavigationItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some((item) => isPersistableNavigationItem(item));
}

function hasMenuScope(items = [], scope) {
  if (!Array.isArray(items) || !scope) {
    return false;
  }

  const normalizedScope = String(scope).trim().toLowerCase();
  return items.some((item) => {
    const itemScope = String(
      item?.menu_scope ?? item?.scope ?? item?.mode ?? item?.context ?? ""
    )
      .trim()
      .toLowerCase();

    if (itemScope === normalizedScope) {
      return true;
    }

    return hasMenuScope(item?.children, scope);
  });
}

function findItemById(items = [], id) {
  if (!Array.isArray(items)) {
    return null;
  }

  for (const item of items) {
    if (String(item?.id) === String(id)) {
      return item;
    }

    const nested = findItemById(item?.children, id);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function isPersistableNavigationItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const itemType = String(item.type || "");
  const itemId = String(item.id || "");
  const isSystem = itemType === "system_page" || itemId.startsWith("system-");
  const hasBackendKey =
    typeof item.sort_order === "number" ||
    item.page_id != null ||
    (itemId.length > 0 && !itemId.startsWith("designer-"));

  if (!isSystem && hasBackendKey) {
    return true;
  }

  if (Array.isArray(item.children) && item.children.length > 0) {
    return item.children.some((child) => isPersistableNavigationItem(child));
  }

  return false;
}
