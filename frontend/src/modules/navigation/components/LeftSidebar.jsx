import { useEffect, useMemo, useState } from "react";

import { getMe } from "../../../api/authApi";

import logo from "../../../assets/icons/logo.png";
import settingsIcon from "../../../assets/icons/settings.gif";
import saveIcon from "../../../assets/icons/save.gif";
import chevronLeftIcon from "../../../assets/icons/Chevronleft.png";
import chevronRightIcon from "../../../assets/icons/Chevronright.png";

import MenuTree from "./MenuTree";
import CreateMenuItemModal from "./CreateMenuItemModal";

import { getPageFull } from "../../../api/pagesApi";
import { updateTable } from "../../universalTable/services/tableApi";
import { dispatchUniversalTableTitleChanged } from "../../universalTable/utils/universalTableTitleEvents";
import {
  isUniversalTableNavigationItem,
  resolvePrimaryTableIdForPage,
} from "../../universalTable/utils/resolvePrimaryTableId";
import { findNavigationItemById } from "../../../portal/utils/portalPageUtils";

import useMenuEditor from "../hooks/useMenuEditor";
import useMenuDragAndDrop from "../hooks/useMenuDragAndDrop";

const SYSTEM_MENU_SETTINGS_KEY = "systemMenuSettings";

const PROTECTED_MENU_TITLES = ["главная страница", "мои задачи"];

function getSystemMenuSettings() {
  try {
    return JSON.parse(localStorage.getItem(SYSTEM_MENU_SETTINGS_KEY)) || {};
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

async function canLeaveCurrentPage() {
  if (window.__UNIVERSAL_TABLE_DIRTY__ !== true) return true;

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("universal-table:request-leave-confirm", {
        detail: {
          onConfirm: async () => {
            try {
              const saveHandler = window.__UNIVERSAL_TABLE_SAVE_HANDLER__;

              if (typeof saveHandler === "function") {
                await saveHandler();
              }

              window.__UNIVERSAL_TABLE_DIRTY__ = false;
              resolve(true);
            } catch (error) {
              console.error("Ошибка сохранения представления:", error);
              resolve(false);
            }
          },
          onCancel: () => resolve(false),
        },
      })
    );
  });
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
    getSystemMenuSettings()
  );

  const editor = useMenuEditor({
    portalId,
    reload: reloadNavigation,
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
    const treeWithProtectedSettings = applyProtectedMenuSettings(
      dragAndDrop.tree,
      systemMenuSettings
    );

    return insertMyTasksAfterMainPage(
      treeWithProtectedSettings,
      getMyTasksItem(systemMenuSettings)
    );
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
    const isSystemItem =
      String(itemId).startsWith("system-") ||
      data?.isSystem ||
      isProtectedMenuItem(data);

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
      saveSystemMenuSettings(nextSettings);

      return;
    }

    try {
      const navigationItem = findNavigationItemById(items, itemId);
      const nextTitle = String(data?.title || "").trim();

      if (
        navigationItem &&
        nextTitle &&
        isUniversalTableNavigationItem(navigationItem) &&
        navigationItem.page_id
      ) {
        try {
          const linkedPage = await getPageFull(navigationItem.page_id);
          const tableId = await resolvePrimaryTableIdForPage(linkedPage);

          if (tableId) {
            const updatedTable = await updateTable(tableId, {
              title: nextTitle,
            });

            const syncedTitle = updatedTable?.title || nextTitle;

            dispatchUniversalTableTitleChanged({
              tableId,
              title: syncedTitle,
              dedicatedPageId: navigationItem.page_id,
            });

            await editor.updateItem(itemId, {
              ...data,
              title: syncedTitle,
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
    if (String(itemId).startsWith("system-")) return;
    await editor.deleteItem(itemId);
  };

  const handleEditButtonClick = () => {
    if (editor.isEditMode) {
      editor.exitEditMode?.();
      return;
    }

    editor.enterEditMode?.();
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        style={expandFloatingButtonStyle}
        title="Развернуть меню"
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "scale(1)";
        }}
      >
        <img src={chevronRightIcon} alt="" style={chevronRightImageStyle} />
      </button>
    );
  }

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
        transition: "width 180ms ease, background 180ms ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "8px 14px 8px 14px" }}>
        <SidebarBrand menuScale={menuScale} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
overflowX: "hidden",
scrollbarWidth: "none",
msOverflowStyle: "none",
          paddingLeft: 14,
          paddingRight: 10,
          paddingBottom: 4,
        }}
      >
        {editor.isEditMode && (
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
        />

        {editor.isEditMode && (
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

      <div style={sidebarFooterStyle}>
        <button
          type="button"
          onClick={onToggleCollapse}
          style={collapseButtonStyle}
        >
          <img src={chevronLeftIcon} alt="" style={chevronLeftImageStyle} />
          <span>Свернуть меню</span>
        </button>

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
      </div>

      {editor.isEditMode && isCreateOpen && (
        <CreateMenuItemModal
          onCreate={async (data) => {
            await editor.createItem(data);
            setIsCreateOpen(false);
          }}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </aside>
  );
}

function SidebarBrand({ menuScale }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
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
          width: 34,
          height: 34,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />

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
            fontSize: 16 * menuScale,
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
            fontSize: 11 * menuScale,
            marginTop: 3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Система управления
        </div>
      </div>
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

const expandFloatingButtonStyle = {
  position: "fixed",
  left: 10,
  bottom: 10,
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "1px solid #BFD2FF",
  background: "linear-gradient(180deg, #FFFFFF 0%, #EDF4FF 100%)",
  color: "#2563EB",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: `
    0 10px 24px rgba(37, 99, 235, 0.22),
    0 4px 10px rgba(15, 23, 42, 0.10)
  `,
  transition: "transform 140ms ease, box-shadow 140ms ease",
  zIndex: 10000,
};

const chevronLeftImageStyle = {
  width: 10,
  height: 10,
  objectFit: "contain",
  display: "block",
  flexShrink: 0,
  opacity: 0.72,
};

const chevronRightImageStyle = {
  width: 16,
  height: 16,
  objectFit: "contain",
  display: "block",
  opacity: 0.92,
};

const settingsImageStyle = {
  width: 14,
  height: 14,
  objectFit: "contain",
  display: "block",
  opacity: 0.72,
};