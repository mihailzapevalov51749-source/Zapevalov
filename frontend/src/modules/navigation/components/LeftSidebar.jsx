import { useEffect, useMemo, useState } from "react";

import { getMe } from "../../../api/authApi";
import { theme } from "../../../styles/theme";

import logo from "../../../assets/icons/logo.png";

import MenuTree from "./MenuTree";
import MenuEditPanel from "./MenuEditPanel";
import CreateMenuItemModal from "./CreateMenuItemModal";
import useMenuEditor from "../hooks/useMenuEditor";
import useMenuDragAndDrop from "../hooks/useMenuDragAndDrop";

const ADMIN_ROLES = ["admin", "superadmin"];
const ADMIN_ROLE_IDS = [3, 4];

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

    const nextItem = {
      ...item,
      children,
    };

    if (!isProtectedMenuItem(nextItem)) {
      return nextItem;
    }

    return applySystemSettings(
      {
        ...nextItem,
        isSystem: true,
      },
      systemSettings
    );
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

  if (hasMyTasksAlready) {
    return tree;
  }

  const mainPageIndex = tree.findIndex((item) => {
    const title = String(item?.title || "").trim().toLowerCase();

    return (
      title === "главная страница" ||
      item?.is_home === true ||
      item?.isHome === true ||
      item?.type === "home"
    );
  });

  if (mainPageIndex === -1) {
    return [myTasksItem, ...tree];
  }

  return [
    ...tree.slice(0, mainPageIndex + 1),
    myTasksItem,
    ...tree.slice(mainPageIndex + 1),
  ];
}

function getAdministrationSection(menuScale = 1, systemSettings = {}) {
  const section = {
    id: "system-administration",
    title: "Администрирование",
    type: "section",
    isSystem: true,
    is_visible: true,
    is_hidden: false,
    position: 999999,
    children: [
      {
        id: "system-admin-users",
        title: "Пользователи",
        type: "system_page",
        route: "/admin/users",
        isSystem: true,
        is_visible: true,
        is_hidden: false,
        position: 1,
      },
      {
        id: "system-admin-org-structure",
        title: "Оргструктура",
        type: "system_page",
        route: "/admin/org-structure",
        isSystem: true,
        is_visible: true,
        is_hidden: false,
        position: 2,
      },
      {
        id: "system-admin-roles",
        title: "Роли и доступы",
        type: "system_page",
        route: "/admin/roles",
        isSystem: true,
        is_visible: true,
        is_hidden: false,
        position: 3,
      },
      {
        id: "system-admin-departments",
        title: "Подразделения",
        type: "system_page",
        route: "/admin/departments",
        isSystem: true,
        is_visible: true,
        is_hidden: false,
        position: 4,
      },
    ],
    style: {
      fontWeight: 700,
      color: theme.colors.textWhite,
      fontSize: 14 * menuScale,
    },
  };

  return applySystemSettings(section, systemSettings);
}

function canUserViewAdministration(user) {
  if (!user) return false;

  const roleName = user.role || user.role_name || user.roleName;
  const roleId = Number(user.role_id ?? user.roleId);

  return ADMIN_ROLES.includes(roleName) || ADMIN_ROLE_IDS.includes(roleId);
}

async function canLeaveCurrentPage() {
  if (window.__UNIVERSAL_TABLE_DIRTY__ !== true) {
    return true;
  }

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

          onCancel: () => {
            resolve(false);
          },
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
  width = 260,
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

        if (isMounted) {
          setCurrentUser(data);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const canViewAdministration = canUserViewAdministration(currentUser);

  const finalTree = useMemo(() => {
    const treeWithProtectedSettings = applyProtectedMenuSettings(
      dragAndDrop.tree,
      systemMenuSettings
    );

    const treeWithMyTasks = insertMyTasksAfterMainPage(
      treeWithProtectedSettings,
      getMyTasksItem(systemMenuSettings)
    );

    if (!canViewAdministration) {
      return treeWithMyTasks;
    }

    return [
      ...treeWithMyTasks,
      getAdministrationSection(menuScale, systemMenuSettings),
    ];
  }, [dragAndDrop.tree, canViewAdministration, menuScale, systemMenuSettings]);

  const handleSelectPage = async (item) => {
    if (!item) return;

    const canLeave = await canLeaveCurrentPage();

    if (!canLeave) {
      return;
    }

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

    await editor.updateItem(itemId, data);
  };

  const handleDeleteItem = async (itemId) => {
    if (String(itemId).startsWith("system-")) {
      return;
    }

    await editor.deleteItem(itemId);
  };

  return (
    <aside
      style={{
        width,
        height: `calc(100vh - ${topOffset}px)`,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        paddingTop: 14 * menuScale,
        paddingBottom: 72,
        paddingLeft: 12 * menuScale,
        paddingRight: 8 * menuScale,
        background: theme.colors.deepBackground,
        position: "fixed",
        left: 0,
        top: topOffset,
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <SidebarBrand menuScale={menuScale} />

      {editor.isEditMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          <button
            type="button"
            onClick={() => onChangeMenuScale?.(menuScale - 0.1)}
            title="Уменьшить меню"
            style={scaleButtonStyle}
          >
            −
          </button>

          <span
            style={{
              fontSize: 12,
              color: theme.colors.secondaryGray,
              minWidth: 42,
              textAlign: "center",
            }}
          >
            {Math.round(menuScale * 100)}%
          </span>

          <button
            type="button"
            onClick={() => onChangeMenuScale?.(menuScale + 0.1)}
            title="Увеличить меню"
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
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setIsCreateOpen((prev) => !prev)}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: theme.colors.textWhite,
              cursor: "pointer",
              fontSize: 26 * menuScale,
              lineHeight: 1,
              padding: 4,
              width: 34 * menuScale,
              height: 34 * menuScale,
              borderRadius: 10 * menuScale,
            }}
            title="Создать элемент"
          >
            +
          </button>
        </div>
      )}

      {editor.isEditMode && isCreateOpen && (
        <CreateMenuItemModal
          onCreate={async (data) => {
            await editor.createItem(data);
            setIsCreateOpen(false);
          }}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      <MenuEditPanel
        isEditMode={editor.isEditMode}
        isSaving={editor.isSaving}
        onEnterEditMode={editor.enterEditMode}
        onExitEditMode={editor.exitEditMode}
        width={width}
      />
    </aside>
  );
}

function SidebarBrand({ menuScale }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10 * menuScale,
        minHeight: 48 * menuScale,
        marginBottom: 18 * menuScale,
        padding: `${7 * menuScale}px ${6 * menuScale}px`,
        borderRadius: 14 * menuScale,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxSizing: "border-box",
      }}
    >
      <img
        src={logo}
        alt="ЯсноПро"
        style={{
          width: 34 * menuScale,
          height: 34 * menuScale,
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
            color: theme.colors.textWhite,
            fontSize: 15 * menuScale,
            fontWeight: 900,
            letterSpacing: 0.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          ЯсноПро
        </div>

        <div
          style={{
            color: theme.colors.secondaryGray,
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

const scaleButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: theme.colors.textWhite,
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1,
};