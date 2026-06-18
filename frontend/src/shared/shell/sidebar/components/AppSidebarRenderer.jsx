import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import defaultBrandLogo from "../../../../assets/icons/logo.png";
import chevronLeftIcon from "../../../../assets/icons/Chevronleft.png";
import settingsIcon from "../../../../assets/icons/settings.gif";
import saveIcon from "../../../../assets/icons/save.gif";
import MenuTree from "../../../../modules/navigation/components/MenuTree";
import useBlockedMenuDragAndDrop from "../../../../modules/navigation/hooks/useBlockedMenuDragAndDrop";
import useMenuDragAndDrop from "../../../../modules/navigation/hooks/useMenuDragAndDrop";
import { getNavigationDeleteBlockReason } from "../../../../modules/navigation/utils/navigationDeletePolicy";
import { LAYOUT_TOKENS } from "../../../layout/layoutTokens";
import { TRANSITION_TOKENS } from "../../../layout/transitionTokens";
import { filterRemovedOfficeMenuItems } from "../../../navigation/removedSystemMenuItems";
import { buildNavigationMenuSavePayload } from "../../../navigation/navigationMenuIconPolicy.js";
import {
  applySystemMenuSettingsToTree,
  isSystemMenuItem,
} from "../../../navigation/applySystemMenuSettingsToTree.js";
import {
  buildTenantMenuSettingPayload,
  buildUserMenuPreferencePayload,
  buildMovePreferencesPayload,
} from "../../../navigation/mergeRuntimeMenuLayers.js";
import {
  persistNavigationMenuBlockMove,
  readNavigationMenuBlockSettings,
} from "../../../navigation/navigationMenuSettings.js";
import { useRuntimeMenuLayerSettings } from "../../../navigation/useRuntimeMenuLayerSettings.js";
import { getDesignerSystemMenuSettingsEventName } from "../designerSystemMenuSettings.js";
import SidebarTodayActiveTime from "./SidebarTodayActiveTime";
import SidebarModeSwitcher from "./SidebarModeSwitcher";
import TenantEnvironmentBadge from "../../../tenantEnvironment/TenantEnvironmentBadge";
import { useTenantEnvironment } from "../../../tenantEnvironment/useTenantEnvironment";
import { resolveTenantIdFromPathname } from "../../../tenantContext/tenantContextResolver.js";
import { isControlPlanePath } from "../../../../modules/controlPlane/config/controlPlanePaths.js";
import {
  CONTROL_PLANE_SYSTEM_MENU_SETTINGS_CHANGED_EVENT,
  patchControlPlaneSystemMenuItemSetting,
  readControlPlaneSystemMenuSettings,
} from "../../../uiStorage/controlPlaneUiStorage.js";
import {
  readSystemMenuSettings,
  writeSystemMenuSettings,
} from "../../../uiStorage/systemMenuSettingsStorage.js";
import {
  formatLeftMenuScalePercent,
  resolveAppliedLeftMenuScale,
} from "../../../uiStorage/leftMenuScaleStorage.js";
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
    personalizeMode = false,
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

  const pendingPersonalMoveRef = useRef(null);
  const holdPersonalBlocksRef = useRef(false);

  const useRuntimeMenuLayers = !isControlPlane && !hasDesignerScope && tenantId;
  const menuLayers = useRuntimeMenuLayerSettings({
    tenantId,
    navigationItems,
    enabled: Boolean(useRuntimeMenuLayers),
    applyUserPreferences: false,
    loadUserPreferences: false,
  });

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

  useEffect(() => {
    if (!isControlPlane) {
      return undefined;
    }

    const handleSettingsChanged = () => {
      setSystemMenuSettings(readControlPlaneSystemMenuSettings());
    };

    window.addEventListener(
      CONTROL_PLANE_SYSTEM_MENU_SETTINGS_CHANGED_EVENT,
      handleSettingsChanged,
    );

    return () => {
      window.removeEventListener(
        CONTROL_PLANE_SYSTEM_MENU_SETTINGS_CHANGED_EVENT,
        handleSettingsChanged,
      );
    };
  }, [isControlPlane]);

  const menuProfile = isControlPlane
    ? "control-plane"
    : hasDesignerScope
      ? "designer"
      : "platform";

  const [menuBlockSettingsVersion, setMenuBlockSettingsVersion] = useState(0);

  const rootItemsForBlocks = useMemo(() => {
    const baseTree = navigationItems;
    let treeWithProtectedSettings = baseTree;

    if (isControlPlane) {
      treeWithProtectedSettings = applySystemMenuSettingsToTree(baseTree, systemMenuSettings);
    } else if (!hasDesignerScope && useRuntimeMenuLayers) {
      treeWithProtectedSettings = menuLayers.applyMenuLayers(baseTree);
    } else if (!hasDesignerScope) {
      treeWithProtectedSettings = applySystemMenuSettingsToTree(baseTree, systemMenuSettings);
    }

    return filterRemovedOfficeMenuItems(treeWithProtectedSettings);
  }, [
    hasDesignerScope,
    isControlPlane,
    navigationItems,
    systemMenuSettings,
    useRuntimeMenuLayers,
    menuLayers.applyMenuLayers,
    menuLayers.tenantSettingsByItemId,
    menuLayers.userPreferencesByItemId,
  ]);

  const canDragMenu = Boolean(
    (editMode || personalizeMode) &&
      contract?.capabilities?.canDragItems &&
      (hasDesignerScope ||
        useRuntimeMenuLayers ||
        hasPersistableNavigationItems(navigationItems)),
  );

  const isPersonalizeBlockDrag =
    personalizeMode && !editMode && canDragMenu && useRuntimeMenuLayers;

  const handlePersonalMoveDraft = async (itemsPayload) => {
    const preferences = buildMovePreferencesPayload(
      itemsPayload,
      rootItemsForBlocks,
    );
    menuLayers.applyLocalUserPreferencesMove(preferences);
    pendingPersonalMoveRef.current = itemsPayload;
    holdPersonalBlocksRef.current = true;
  };

  const effectiveTenantSettings = useRuntimeMenuLayers
    ? menuLayers.tenantSettingsByItemId
    : systemMenuSettings;

  const dragAndDrop = useMenuDragAndDrop({
    portalId: tenantId,
    items: navigationItems,
    isEnabled: hasDesignerScope && canDragMenu,
    reload: reloadNavigation,
    onMove: async (itemsPayload) => {
      const result = await persistNavigationMenuBlockMove({
        menuProfile,
        tenantId,
        itemsPayload,
        rootItems: rootItemsForBlocks,
        reloadNavigation,
        preferenceScope: editMode ? "tenant" : "user",
      });

      setMenuBlockSettingsVersion((previous) => previous + 1);

      if (useRuntimeMenuLayers) {
        await menuLayers.reload();
      } else if (menuProfile === "control-plane" || menuProfile === "platform") {
        setSystemMenuSettings(result.settings);
      }
    },
  });

  const menuBlockSettings = useMemo(
    () =>
      readNavigationMenuBlockSettings({
        menuProfile,
        tenantId,
        rootItems: rootItemsForBlocks,
        tenantSettingsOverride: useRuntimeMenuLayers ? effectiveTenantSettings : null,
      }),
    [
      menuProfile,
      tenantId,
      rootItemsForBlocks,
      effectiveTenantSettings,
      useRuntimeMenuLayers,
      systemMenuSettings,
      menuBlockSettingsVersion,
    ],
  );

  useEffect(() => {
    if (!hasDesignerScope || !tenantId) {
      return undefined;
    }

    const handleDesignerSettingsChanged = () => {
      setMenuBlockSettingsVersion((previous) => previous + 1);
    };

    window.addEventListener(
      getDesignerSystemMenuSettingsEventName(),
      handleDesignerSettingsChanged,
    );

    return () => {
      window.removeEventListener(
        getDesignerSystemMenuSettingsEventName(),
        handleDesignerSettingsChanged,
      );
    };
  }, [hasDesignerScope, tenantId]);

  const blockedMenuDrag = useBlockedMenuDragAndDrop({
    rootItems: rootItemsForBlocks,
    settings: menuBlockSettings,
    menuProfile,
    isEnabled: canDragMenu,
    skipBlocksSyncRef: holdPersonalBlocksRef,
    onMove: async (itemsPayload) => {
      if (isPersonalizeBlockDrag) {
        await handlePersonalMoveDraft(itemsPayload);
        return;
      }

      const result = await persistNavigationMenuBlockMove({
        menuProfile,
        tenantId,
        itemsPayload,
        rootItems: rootItemsForBlocks,
        reloadNavigation,
        preferenceScope: editMode ? "tenant" : "user",
      });

      setMenuBlockSettingsVersion((previous) => previous + 1);

      if (useRuntimeMenuLayers) {
        await menuLayers.reload();
      } else if (menuProfile === "control-plane" || menuProfile === "platform") {
        setSystemMenuSettings(result.settings);
      }
    },
  });

  useEffect(() => {
    if (!personalizeMode) {
      holdPersonalBlocksRef.current = false;
    }
  }, [personalizeMode]);

  const logoSrc = brand.logoSrc || defaultBrandLogo;
  const sidebarVisual = LAYOUT_TOKENS.sidebar;

  const rootClassName = [
    "app-sidebar-renderer",
    hasDesignerScope ? "app-sidebar-renderer--designer" : "app-sidebar-renderer--runtime",
    collapsed ? "is-collapsed" : "",
    editMode ? "is-edit-mode" : "",
    personalizeMode ? "is-personalize-mode" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleEditButtonClick = () => {
    const capabilities = contract?.capabilities ?? {};

    if (editMode) {
      onAction?.("toggle-edit-mode");
      return;
    }

    if (personalizeMode) {
      onAction?.("toggle-personalize-mode");
      return;
    }

    if (capabilities.canEditMenu) {
      onAction?.("toggle-edit-mode");
      return;
    }

    if (capabilities.canPersonalizeMenu) {
      onAction?.("toggle-personalize-mode");
      return;
    }
  };

  const handleCancelPersonalize = async () => {
    pendingPersonalMoveRef.current = null;
    holdPersonalBlocksRef.current = false;
    if (useRuntimeMenuLayers) {
      await menuLayers.reload();
    }
    onAction?.("cancel-personalize-mode");
  };

  const handleResetPersonalize = async () => {
    pendingPersonalMoveRef.current = null;
    holdPersonalBlocksRef.current = false;
    if (useRuntimeMenuLayers) {
      try {
        await menuLayers.resetUserPreferences();
        await menuLayers.reload();
      } catch (resetError) {
        console.error("Failed to reset user menu preferences:", resetError);
      }
      return;
    }

    onAction?.("reset-menu-preferences");
  };

  const handleSavePersonalize = async () => {
    if (useRuntimeMenuLayers && pendingPersonalMoveRef.current) {
      try {
        await menuLayers.saveUserMove(
          pendingPersonalMoveRef.current,
          rootItemsForBlocks,
        );
        pendingPersonalMoveRef.current = null;
        holdPersonalBlocksRef.current = false;
        await menuLayers.reload();
      } catch (saveError) {
        console.error("Failed to save personal menu order:", saveError);
        return;
      }
    } else {
      holdPersonalBlocksRef.current = false;
    }

    onAction?.("toggle-personalize-mode");
  };

  const settingsButtonTitle = editMode
    ? "Сохранить меню"
    : personalizeMode
      ? "Готово"
      : contract?.capabilities?.canEditMenu
        ? "Редактировать меню"
        : "Мои настройки меню";

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
    if (personalizeMode && useRuntimeMenuLayers && item) {
      try {
        await menuLayers.saveUserMenuItem(item, {
          is_hidden: data.is_visible === false,
          color: data.color,
          is_bold: data.is_bold,
        });
        await menuLayers.reload();
      } catch (saveError) {
        console.error("Failed to save user menu preference:", saveError);
      }
      return;
    }

    const isSystemItem = isSystemMenuItem(itemId, data, item);

    if (isSystemItem && !hasDesignerScope && !personalizeMode) {
      const safeData = buildNavigationMenuSavePayload(data);

      if (useRuntimeMenuLayers && item) {
        try {
          await menuLayers.saveTenantMenuItem(item, safeData);
          await menuLayers.reload();
        } catch (saveError) {
          console.error("Failed to save tenant runtime menu setting:", saveError);
        }
        return;
      }

      const nextSettings = isControlPlane
        ? patchControlPlaneSystemMenuItemSetting(itemId, safeData)
        : {
            ...systemMenuSettings,
            [itemId]: {
              ...(systemMenuSettings[itemId] &&
              typeof systemMenuSettings[itemId] === "object"
                ? systemMenuSettings[itemId]
                : {}),
              ...safeData,
            },
          };

      setSystemMenuSettings(nextSettings);
      if (!isControlPlane) {
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
          overflowX: editMode || personalizeMode ? "visible" : "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingLeft: collapsed ? 6 : 14,
          paddingRight: collapsed ? 6 : 10,
          paddingBottom: 4,
        }}
      >
        {!collapsed && personalizeMode && !editMode ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 12,
              padding: "8px 10px",
              borderRadius: 8,
              background: "#F3F9FD",
              border: "1px solid #DEECF9",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0078D4",
              }}
            >
              Мои настройки меню
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  void handleSavePersonalize();
                }}
                style={personalizeActionButtonStyle}
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCancelPersonalize();
                }}
                style={personalizeSecondaryButtonStyle}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleResetPersonalize();
                }}
                style={personalizeSecondaryButtonStyle}
              >
                Сбросить мои настройки
              </button>
            </div>
          </div>
        ) : null}

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
              {formatLeftMenuScalePercent(menuScale)}
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
          items={rootItemsForBlocks}
          navigationBlocks={blockedMenuDrag.blocks}
          blockedDragAndDrop={canDragMenu ? blockedMenuDrag : null}
          activePageId={menuActivePageId}
          activeSidebarItemId={activeItemId ?? null}
          activeSidebarParentIds={activeParentIds}
          onSelectPage={handleSelectPage}
          onItemAction={onItemAction}
          isEditMode={editMode || personalizeMode}
          personalizeOnly={personalizeMode && !editMode}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          dragAndDrop={hasDesignerScope && canDragMenu ? dragAndDrop : null}
          scale={menuScale}
          sidebarCollapsed={collapsed}
          sidebarMode={
            hasDesignerScope ? "designer" : isControlPlane ? "control-plane" : "runtime"
          }
          routeOwner={routeOwner}
          tenantId={tenantId}
        />

        {!collapsed && !editMode && serviceNavigationActions.length > 0 ? (
          <div className="app-sidebar-renderer__service-actions app-sidebar-renderer__service-actions--nav">
            {serviceNavigationActions.map((action) => {
              const actionBadgeCount = Number(action.badgeCount ?? action.badge_count ?? 0);
              return (
              <button
                key={action.id}
                type="button"
                className={[
                  "app-sidebar-renderer__service-action",
                  action.className,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onAction?.(action.actionKey || action.id)}
              >
                <span className="app-sidebar-renderer__service-action-label">
                  {action.label}
                </span>
                {actionBadgeCount > 0 ? (
                  <span
                    className="app-sidebar-renderer__service-action-badge"
                    aria-label={`Доступно: ${actionBadgeCount}`}
                  >
                    {actionBadgeCount > 99 ? "99+" : actionBadgeCount}
                  </span>
                ) : null}
              </button>
            );
            })}
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
        {!collapsed && !editMode ? <SidebarModeSwitcher tenantIdFallback={tenantId ?? 1} /> : null}

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

          {!collapsed && contract?.capabilities?.canEditMenu ? (
            <button
              type="button"
              onClick={handleEditButtonClick}
              disabled={isSaving}
              title={settingsButtonTitle}
              style={{
                ...settingsButtonStyle,
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              <img
                src={editMode || personalizeMode ? saveIcon : settingsIcon}
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
  const appliedMenuScale = resolveAppliedLeftMenuScale(menuScale);
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
                fontSize: sidebarVisual.brandTitleFontSize * appliedMenuScale,
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
                fontSize: sidebarVisual.brandSubtitleFontSize * appliedMenuScale,
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

const personalizeActionButtonStyle = {
  border: "none",
  borderRadius: 8,
  background: "#0078D4",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  cursor: "pointer",
};

const personalizeSecondaryButtonStyle = {
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#334155",
  fontSize: 12,
  fontWeight: 500,
  padding: "6px 12px",
  cursor: "pointer",
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
  const isControlPlaneItem = itemId.startsWith("cp-");
  const isSystem = itemType === "system_page" || itemId.startsWith("system-");
  const hasBackendKey =
    typeof item.sort_order === "number" ||
    item.page_id != null ||
    (itemId.length > 0 && !itemId.startsWith("designer-"));

  if ((!isSystem || isControlPlaneItem) && hasBackendKey) {
    return true;
  }

  if (Array.isArray(item.children) && item.children.length > 0) {
    return item.children.some((child) => isPersistableNavigationItem(child));
  }

  return false;
}
