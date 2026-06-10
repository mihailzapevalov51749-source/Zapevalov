import { useEffect, useMemo, useState } from "react";

import { getMe } from "../../../api/authApi";

import logo from "../../../assets/icons/logo.png";
import settingsIcon from "../../../assets/icons/settings.gif";
import saveIcon from "../../../assets/icons/save.gif";
import chevronLeftIcon from "../../../assets/icons/Chevronleft.png";
import { LAYOUT_TOKENS } from "../../../shared/layout/layoutTokens";
import { TRANSITION_TOKENS } from "../../../shared/layout/transitionTokens";

import MenuTree from "./MenuTree";
import CreateMenuItemModal from "./CreateMenuItemModal";
import NavigationDeleteDialogs from "./NavigationDeleteDialogs";
import { getNavigationDeleteBlockReason } from "../utils/navigationDeletePolicy";

import { getPageFull } from "../../../api/pagesApi";
import {
  isLegacyStorageNavigationItem,
  renameLegacyStorageForPage,
  requestLegacyLeaveConfirmation,
} from "../../../shared/legacy/adapters/legacyStorageAdapter";
import { findNavigationItemById } from "../../../portal/utils/portalPageUtils";

import useMenuEditor from "../hooks/useMenuEditor";
import useMenuDragAndDrop from "../hooks/useMenuDragAndDrop";
import { filterRemovedOfficeMenuItems } from "../../../shared/navigation/removedSystemMenuItems";
import {
  applySystemMenuSettingsToTree,
  isSystemMenuItem,
} from "../../../shared/navigation/applySystemMenuSettingsToTree.js";
import {
  readSystemMenuSettings,
  writeSystemMenuSettings,
} from "../../../shared/uiStorage/systemMenuSettingsStorage.js";

async function canLeaveCurrentPage() {
  return requestLegacyLeaveConfirmation();
}

export default function LeftSidebar({
  items = [],
  activePageId,
  onSelectPage,
  topOffset = 0,
  width = 220,
  collapsed = false,
  onToggleCollapse,
  portalId = 1,
  reloadNavigation,
  menuScale = 1,
  onChangeMenuScale,
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [systemMenuSettings, setSystemMenuSettings] = useState(() =>
    readSystemMenuSettings(portalId)
  );

  useEffect(() => {
    setSystemMenuSettings(readSystemMenuSettings(portalId));
  }, [portalId]);

  const editor = useMenuEditor({
    portalId,
    reload: reloadNavigation,
    navigationItems: items,
  });

  const dragAndDrop = useMenuDragAndDrop({
    items,
    isEnabled: editor.isEditMode,
    reload: reloadNavigation,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const data = await getMe();
        if (isMounted) setCurrentUser(data);
      } catch {
        if (isMounted) setCurrentUser(null);
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const finalTree = useMemo(() => {
    const treeWithProtectedSettings = applySystemMenuSettingsToTree(
      dragAndDrop.tree,
      systemMenuSettings,
    );

    return filterRemovedOfficeMenuItems(treeWithProtectedSettings);
  }, [dragAndDrop.tree, systemMenuSettings]);

  const handleSelectPage = async (item) => {
    if (!item) return;

    const canLeave = await canLeaveCurrentPage();
    if (!canLeave) return;

    if (item.type === "system_page" && item.route) {
      window.history.pushState({}, "", item.route);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    if (item.page_id) {
      onSelectPage?.(item.page_id);
      return;
    }

    onSelectPage?.(item);
  };

  const handleUpdateItem = async (itemId, data) => {
    const navigationItem = findNavigationItemById(items, itemId);
    const isSystemItem = isSystemMenuItem(itemId, data, navigationItem);

    if (isSystemItem) {
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
      writeSystemMenuSettings(portalId, nextSettings);

      return;
    }

    try {
      const navigationItem = findNavigationItemById(items, itemId);
      const nextTitle = String(data?.title || "").trim();

      if (
        navigationItem &&
        nextTitle &&
        isLegacyStorageNavigationItem(navigationItem) &&
        navigationItem.page_id
      ) {
        try {
          const linkedPage = await getPageFull(navigationItem.page_id);
          const renameResult = await renameLegacyStorageForPage({
            pageData: linkedPage,
            title: nextTitle,
            dedicatedPageId: navigationItem.page_id,
          });

          if (renameResult?.title) {
            await editor.updateItem(itemId, {
              ...data,
              title: renameResult.title,
            });

            return;
          }
        } catch (renameError) {
          console.error("Failed to save universal table menu item:", renameError);
        }
      }

      await editor.updateItem(itemId, data);
    } catch (saveError) {
      console.error("Failed to save menu item:", saveError);
    }
  };

  const handleDeleteItem = async (itemId) => {
    const item = findNavigationItemById(items, itemId);
    const blockReason = getNavigationDeleteBlockReason(item);

    if (blockReason) {
      editor.showDeleteNotice?.(blockReason);
      return;
    }

    editor.requestDeleteItem?.(itemId);
  };

  const handleEditButtonClick = () => {
    if (editor.isEditMode) {
      editor.exitEditMode?.();
      return;
    }

    editor.enterEditMode?.();
  };

  const sidebarVisual = LAYOUT_TOKENS.sidebar;

  return (
    <aside
      style={{
        width,
        height: `calc(100vh - ${topOffset}px)`,
        background: "#FFFFFF",
        borderRight: "1px solid #E2E8F0",
        position: "fixed",
        left: 0,
        top: topOffset,
        overflow: "hidden",
        boxSizing: "border-box",
        transition: TRANSITION_TOKENS.shell.sidebarWidth,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: collapsed ? "8px 6px" : "8px 14px",
        }}
      >
        <SidebarBrand menuScale={menuScale} collapsed={collapsed} />
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
        {!collapsed && editor.isEditMode && (
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
              onClick={() => onChangeMenuScale?.(menuScale - 0.1)}
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
              onClick={() => onChangeMenuScale?.(menuScale + 0.1)}
              style={scaleButtonStyle}
            >
              +
            </button>
          </div>
        )}

        <MenuTree
          items={finalTree}
          activePageId={activePageId}
          onSelectPage={handleSelectPage}
          isEditMode={editor.isEditMode}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          dragAndDrop={dragAndDrop}
          scale={menuScale}
          sidebarCollapsed={collapsed}
          tenantId={portalId}
        />

        {!collapsed && editor.isEditMode && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setIsCreateOpen((prev) => !prev)}
              style={createButtonStyle}
            >
              +
            </button>
          </div>
        )}
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
          onClick={onToggleCollapse}
          style={{
            ...collapseButtonStyle,
            flex: collapsed ? "0 0 auto" : collapseButtonStyle.flex,
            justifyContent: "center",
            width: collapsed ? sidebarVisual.menuItemHeight : undefined,
            minWidth: collapsed ? sidebarVisual.menuItemHeight : collapseButtonStyle.minWidth,
          }}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          <img
            src={chevronLeftIcon}
            alt=""
            style={{
              ...chevronLeftImageStyle,
              transform: collapsed ? "rotate(180deg)" : "none",
            }}
          />
          {!collapsed && <span>Свернуть меню</span>}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={handleEditButtonClick}
            disabled={editor.isSaving}
            title={editor.isEditMode ? "Сохранить меню" : "Редактировать меню"}
            style={{
              ...settingsButtonStyle,
              opacity: editor.isSaving ? 0.5 : 1,
            }}
          >
            <img
              src={editor.isEditMode ? saveIcon : settingsIcon}
              alt=""
              style={settingsImageStyle}
            />
          </button>
        )}
      </div>

      {!collapsed && editor.isEditMode && isCreateOpen && (
        <CreateMenuItemModal
          onCreate={async (data) => {
            try {
              await editor.createItem(data);
              setIsCreateOpen(false);
            } catch (error) {
              window.alert(
                error?.message || "Не удалось создать пункт меню",
              );
            }
          }}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
      <NavigationDeleteDialogs
        pendingDeleteId={editor.pendingDeleteId}
        pendingDeleteItem={editor.pendingDeleteItem}
        deleteError={editor.deleteError}
        deleteNotice={editor.deleteNotice}
        isSubmitting={editor.isSaving}
        onCancelDelete={editor.cancelDeleteItem}
        onConfirmDelete={editor.confirmDeleteItem}
        onCloseNotice={editor.clearDeleteNotice}
      />
    </aside>
  );
}

function SidebarBrand({ menuScale, collapsed = false }) {
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
        background: "transparent",
        border: "none",
        boxSizing: "border-box",
      }}
    >
      <img
        src={logo}
        alt="YasnoPro"
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />

      {!collapsed && (
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
            YasnoPro
          </div>

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
            Система управления
          </div>
        </div>
      )}
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

const chevronLeftImageStyle = {
  width: 10,
  height: 10,
  objectFit: "contain",
  display: "block",
  flexShrink: 0,
  opacity: 0.72,
};

const settingsImageStyle = {
  width: 14,
  height: 14,
  objectFit: "contain",
  display: "block",
  opacity: 0.72,
};