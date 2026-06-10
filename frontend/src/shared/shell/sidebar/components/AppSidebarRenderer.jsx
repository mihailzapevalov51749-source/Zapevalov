import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import defaultBrandLogo from "../../../../assets/icons/logo.png";
import chevronLeftIcon from "../../../../assets/icons/Chevronleft.png";
import settingsIcon from "../../../../assets/icons/settings.gif";
import saveIcon from "../../../../assets/icons/save.gif";
import MenuTree from "../../../../modules/navigation/components/MenuTree";
import useMenuDragAndDrop from "../../../../modules/navigation/hooks/useMenuDragAndDrop";
import { getNavigationDeleteBlockReason } from "../../../../modules/navigation/utils/navigationDeletePolicy";
import { LAYOUT_TOKENS } from "../../../layout/layoutTokens";
import { TRANSITION_TOKENS } from "../../../layout/transitionTokens";
import { filterRemovedOfficeMenuItems } from "../../../navigation/removedSystemMenuItems";
import {
  applySystemMenuSettingsToTree,
  isSystemMenuItem,
} from "../../../navigation/applySystemMenuSettingsToTree.js";
import SidebarTodayActiveTime from "./SidebarTodayActiveTime";
import TenantEnvironmentBadge from "../../../tenantEnvironment/TenantEnvironmentBadge";
import { useTenantEnvironment } from "../../../tenantEnvironment/useTenantEnvironment";
import { resolveTenantIdFromPathname } from "../../../tenantContext/tenantContextResolver.js";
import { isControlPlanePath } from "../../../../modules/controlPlane/config/controlPlanePaths.js";
import {
  readControlPlaneSystemMenuSettings,
  writeControlPlaneSystemMenuSettings,
} from "../../../uiStorage/controlPlaneUiStorage.js";
import {
  readSystemMenuSettings,
  writeSystemMenuSettings,
} from "../../../uiStorage/systemMenuSettingsStorage.js";
import "./appSidebarRenderer.css";

export default function AppSidebarRenderer({
  contract,
  className = "",
  collapsed = false,
  onToggleCollapse = () => {},
  onItemAction,
  onAction,
}) {
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
    activeItemId,
    activeParentIds = [],
    onChangeMenuScale,
  } = contract;

  const location = useLocation();
  const isControlPlane = isControlPlanePath(location.pathname);
  const tenantId = isControlPlane
    ? null
    : resolveTenantIdFromPathname(location.pathname) ?? 1;
  const navigationItems = contract.navigationItems ?? [];
  const serviceNavigationActions = Array.isArray(contract.serviceNavigationActions)
    ? contract.serviceNavigationActions
    : [];
  const routeOwner = contract.routeOwner ?? null;
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

  const [systemMenuSettings, setSystemMenuSettings] = useState(() => {
    if (isControlPlane) {
      return readControlPlaneSystemMenuSettings();
    }
    return tenantId ? readSystemMenuSettings(tenantId) : {};
  });

  useEffect(() => {
    if (isControlPlane) {
      setSystemMenuSettings(readControlPlaneSystemMenuSettings());
      return;
    }

    if (!tenantId) {
      setSystemMenuSettings({});
      return;
    }

    setSystemMenuSettings(readSystemMenuSettings(tenantId));
  }, [isControlPlane, tenantId]);

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

  const finalTree = useMemo(() => {
    if (hasDesignerScope) {
      return dragAndDrop.tree;
    }

    const treeWithProtectedSettings = applySystemMenuSettingsToTree(
      dragAndDrop.tree,
      systemMenuSettings,
    );

    return filterRemovedOfficeMenuItems(treeWithProtectedSettings);
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
    const capabilities = contract?.capabilities ?? {};
    const openSettingsActionKey =
      contract?.actions?.find((action) => action.id === "open-settings")?.actionKey
      ?? "open-menu-settings";

    if (editMode) {
      onAction?.("toggle-edit-mode");
      return;
    }

    if (capabilities.canEditMenu) {
      onAction?.("toggle-edit-mode");
      return;
    }

    if (capabilities.canOpenSettings !== false) {
      onAction?.(openSettingsActionKey);
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
    if (String(itemId).startsWith("system-designer-fallback-")) {
      return;
    }

    const item = findItemById(navigationItems, itemId);
    const isSystemItem = isSystemMenuItem(itemId, data, item);

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
      if (isControlPlane) {
        writeControlPlaneSystemMenuSettings(nextSettings);
      } else {
        writeSystemMenuSettings(tenantId, nextSettings);
      }
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
    const blockReason = getNavigationDeleteBlockReason(item);

    if (blockReason) {
      onAction?.("delete-menu-item-blocked", { id: itemId, reason: blockReason });
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
          hideEnvironmentBadge={isControlPlane}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: editMode ? "visible" : "hidden",
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
          activeSidebarItemId={activeItemId ?? null}
          activeSidebarParentIds={activeParentIds}
          onSelectPage={handleSelectPage}
          onItemAction={onItemAction}
          isEditMode={editMode}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          dragAndDrop={canDragMenu ? dragAndDrop : null}
          scale={menuScale}
          sidebarCollapsed={collapsed}
          sidebarMode={hasDesignerScope ? "designer" : "runtime"}
          routeOwner={routeOwner}
          tenantId={tenantId}
        />

        {!collapsed && !editMode && serviceNavigationActions.length > 0 ? (
          <div className="app-sidebar-renderer__service-actions app-sidebar-renderer__service-actions--nav">
            {serviceNavigationActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="app-sidebar-renderer__service-action"
                onClick={() => onAction?.(action.actionKey || action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}

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
        className={`app-sidebar-renderer__footer${
          collapsed ? " app-sidebar-renderer__footer--collapsed" : ""
        }`}
        style={{
          padding: collapsed ? "10px 8px 12px" : sidebarFooterStyle.padding,
        }}
      >
        <div
          className="app-sidebar-renderer__footer-row"
          style={{
            justifyContent: collapsed ? "center" : sidebarFooterStyle.justifyContent,
            gap: collapsed ? 0 : sidebarFooterStyle.gap,
          }}
        >
          <div className="app-sidebar-renderer__collapse-block">
            <button
              type="button"
              onClick={onToggleCollapse}
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

            <SidebarTodayActiveTime collapsed={collapsed} />
          </div>

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
      </div>
    </aside>
  );
}

function SidebarBrand({ menuScale, collapsed, logoSrc, brand, hideEnvironmentBadge = false }) {
  const { environment } = useTenantEnvironment();
  const sidebarVisual = LAYOUT_TOKENS.sidebar;
  const logoSize = collapsed
    ? sidebarVisual.brandLogoCollapsedSize
    : sidebarVisual.brandLogoSize;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: collapsed ? "column" : "row",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 6 : 10,
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
      {collapsed && !hideEnvironmentBadge ? (
        <TenantEnvironmentBadge environment={environment} collapsed />
      ) : null}
      {!collapsed ? (
        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            lineHeight: 1.15,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "#0F172A",
                fontSize: sidebarVisual.brandTitleFontSize * menuScale,
                fontWeight: 800,
                letterSpacing: 0.2,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {brand.title}
            </div>
            {!hideEnvironmentBadge ? (
              <TenantEnvironmentBadge environment={environment} />
            ) : null}
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
