import {
  buildControlPlaneCompaniesPath,
  buildControlPlanePlatformProfilePath,
  buildControlPlaneRoute,
  buildControlPlaneUsersRolesPath,
} from "./controlPlanePaths.js";
import { resolvePlatformProfileWorkspaceTab } from "../platformProfile/platformProfileWorkspaceConfig.js";

const CP = buildControlPlaneRoute();

function cpNavItem({
  id,
  title,
  route = null,
  children = null,
  iconType = "settings",
  sortOrder = 0,
  type = "system_page",
}) {
  const hasChildren = Array.isArray(children) && children.length > 0;

  return {
    id,
    title,
    type: hasChildren ? "section" : type,
    ...(route ? { route, path: route } : {}),
    iconType,
    menu_scope: "runtime",
    scope: "runtime",
    mode: "runtime",
    is_system: true,
    is_protected: true,
    is_visible: true,
    sort_order: sortOrder,
    ...(hasChildren ? { children } : {}),
  };
}

export const CONTROL_PLANE_NAV_ITEMS = [
  cpNavItem({
    id: "cp-overview",
    title: "Главная",
    route: CP,
    iconType: "settings",
    sortOrder: 10,
  }),
  cpNavItem({
    id: "cp-group-companies",
    title: "Компании",
    route: buildControlPlaneCompaniesPath("clients"),
    iconType: "users",
    sortOrder: 20,
  }),
  cpNavItem({
    id: "cp-group-templates",
    title: "Шаблоны",
    iconType: "objects",
    sortOrder: 30,
    children: [
      cpNavItem({
        id: "cp-templates-versions",
        title: "Версии шаблонов",
        route: buildControlPlaneRoute("templates/versions"),
        sortOrder: 10,
      }),
      cpNavItem({
        id: "cp-templates-updates",
        title: "Обновления",
        route: buildControlPlaneRoute("templates/updates"),
        sortOrder: 20,
      }),
      cpNavItem({
        id: "cp-templates-publish",
        title: "Публикация",
        route: buildControlPlaneRoute("templates/publish"),
        sortOrder: 30,
      }),
    ],
  }),
  cpNavItem({
    id: "cp-group-platform-profile",
    title: "Профиль платформы",
    route: buildControlPlanePlatformProfilePath("general"),
    iconType: "settings",
    sortOrder: 35,
  }),
  cpNavItem({
    id: "cp-group-platform",
    title: "Платформа",
    iconType: "settings",
    sortOrder: 40,
    children: [
      cpNavItem({
        id: "cp-platform-licenses",
        title: "Лицензии",
        route: buildControlPlaneRoute("platform/licenses"),
        sortOrder: 10,
      }),
      cpNavItem({
        id: "cp-platform-policies",
        title: "Глобальные политики",
        route: buildControlPlaneRoute("platform/policies"),
        sortOrder: 20,
      }),
      cpNavItem({
        id: "cp-platform-monitoring",
        title: "Мониторинг",
        route: buildControlPlaneRoute("platform/monitoring"),
        sortOrder: 30,
      }),
      cpNavItem({
        id: "cp-platform-backup",
        title: "Резервное копирование",
        route: buildControlPlaneRoute("platform/backup"),
        sortOrder: 40,
      }),
    ],
  }),
  cpNavItem({
    id: "cp-group-users-roles",
    title: "Пользователи и роли",
    route: buildControlPlaneUsersRolesPath("users"),
    iconType: "users",
    sortOrder: 50,
  }),
  cpNavItem({
    id: "cp-audit-log",
    title: "Журнал событий",
    route: buildControlPlaneRoute("audit-log"),
    iconType: "settings",
    sortOrder: 60,
  }),
];

const ROUTE_MATCHERS = [
  {
    test: (path) => path === CP,
    itemId: "cp-overview",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/companies\/clients(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/companies(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/clients\/companies(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/clients\/registry(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/clients\/create(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/clients\/clone(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/clients(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/templates\/versions(?:\/|$)/.test(path),
    itemId: "cp-templates-versions",
    parentIds: ["cp-group-templates"],
  },
  {
    test: (path) => /^\/control-plane\/templates\/updates(?:\/|$)/.test(path),
    itemId: "cp-templates-updates",
    parentIds: ["cp-group-templates"],
  },
  {
    test: (path) => /^\/control-plane\/templates\/publish(?:\/|$)/.test(path),
    itemId: "cp-templates-publish",
    parentIds: ["cp-group-templates"],
  },
  {
    test: (path) => /^\/control-plane\/templates(?:\/|$)/.test(path),
    itemId: "cp-templates-versions",
    parentIds: ["cp-group-templates"],
  },
  {
    test: (path) => /^\/control-plane\/platform-profile(?:\/|$)/.test(path),
    itemId: "cp-group-platform-profile",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/platform\/licenses(?:\/|$)/.test(path),
    itemId: "cp-platform-licenses",
    parentIds: ["cp-group-platform"],
  },
  {
    test: (path) => /^\/control-plane\/platform\/policies(?:\/|$)/.test(path),
    itemId: "cp-platform-policies",
    parentIds: ["cp-group-platform"],
  },
  {
    test: (path) => /^\/control-plane\/platform\/monitoring(?:\/|$)/.test(path),
    itemId: "cp-platform-monitoring",
    parentIds: ["cp-group-platform"],
  },
  {
    test: (path) => /^\/control-plane\/platform\/backup(?:\/|$)/.test(path),
    itemId: "cp-platform-backup",
    parentIds: ["cp-group-platform"],
  },
  {
    test: (path) => /^\/control-plane\/platform(?:\/|$)/.test(path),
    itemId: "cp-platform-licenses",
    parentIds: ["cp-group-platform"],
  },
  {
    test: (path) => /^\/control-plane\/users-roles(?:\/|$)/.test(path),
    itemId: "cp-group-users-roles",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/platform-users(?:\/|$)/.test(path),
    itemId: "cp-group-users-roles",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/platform-roles(?:\/|$)/.test(path),
    itemId: "cp-group-users-roles",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/users(?:\/|$)/.test(path),
    itemId: "cp-group-users-roles",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/roles(?:\/|$)/.test(path),
    itemId: "cp-group-users-roles",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/audit-log(?:\/|$)/.test(path),
    itemId: "cp-audit-log",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/settings(?:\/|$)/.test(path),
    itemId: "cp-platform-policies",
    parentIds: ["cp-group-platform"],
  },
  {
    test: (path) => /^\/control-plane\/modules(?:\/|$)/.test(path),
    itemId: "cp-platform-monitoring",
    parentIds: ["cp-group-platform"],
  },
  {
    test: (path) => /^\/control-plane\/integrations(?:\/|$)/.test(path),
    itemId: "cp-platform-monitoring",
    parentIds: ["cp-group-platform"],
  },
];

export function resolveControlPlaneNavState(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "") || CP;
  const match = ROUTE_MATCHERS.find((entry) => entry.test(normalized));

  if (match) {
    return {
      activeItemId: match.itemId,
      activeParentIds: match.parentIds,
    };
  }

  return {
    activeItemId: "cp-overview",
    activeParentIds: [],
  };
}

export function resolveControlPlaneActiveNavItemId(pathname = "") {
  return resolveControlPlaneNavState(pathname).activeItemId;
}

export function resolveControlPlaneActiveParentIds(pathname = "") {
  return resolveControlPlaneNavState(pathname).activeParentIds;
}

export function resolveControlPlanePageMeta(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const subtitle = "Управление платформой — Control Plane";

  if (normalized === "/control-plane") {
    return { title: "Главная", subtitle: "Control Plane" };
  }
  if (/\/companies\/clients\/\d+/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/companies\/clients/.test(normalized) || /\/companies/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/clients\/registry\/\d+/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/clients\/registry/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/clients\/companies\/\d+/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/clients\/companies/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/clients\/create/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/clients\/clone/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/clients/.test(normalized)) {
    return { title: "Компании", subtitle: "Клиенты" };
  }
  if (/\/templates\/versions/.test(normalized)) {
    return { title: "Версии шаблонов", subtitle: "Шаблоны" };
  }
  if (/\/templates\/updates/.test(normalized)) {
    return { title: "Обновления", subtitle: "Шаблоны" };
  }
  if (/\/templates\/publish/.test(normalized)) {
    return { title: "Публикация", subtitle: "Шаблоны" };
  }
  if (/\/platform-profile/.test(normalized)) {
    const slugMatch = normalized.match(/\/platform-profile\/([^/]+)/);
    const slug = slugMatch?.[1] || "general";
    const tab = resolvePlatformProfileWorkspaceTab(slug);
    const profileRoot = buildControlPlanePlatformProfilePath("general");
    const breadcrumbTrail = [
      {
        label: "Профиль платформы",
        path: profileRoot,
      },
      {
        label: tab.label,
        path: buildControlPlanePlatformProfilePath(tab.slug),
      },
    ];

    return {
      title: tab.label,
      subtitle: "Профиль платформы",
      breadcrumbTrail,
    };
  }
  if (/\/platform\/licenses/.test(normalized)) {
    return { title: "Лицензии", subtitle: "Платформа" };
  }
  if (/\/platform\/policies/.test(normalized)) {
    return { title: "Глобальные политики", subtitle: "Платформа" };
  }
  if (/\/platform\/monitoring/.test(normalized)) {
    return { title: "Мониторинг", subtitle: "Платформа" };
  }
  if (/\/platform\/backup/.test(normalized)) {
    return { title: "Резервное копирование", subtitle: "Платформа" };
  }
  if (/\/users-roles\/roles/.test(normalized) || /\/platform-roles/.test(normalized)) {
    return { title: "Роли", subtitle: "Пользователи и роли" };
  }
  if (/\/users-roles\/users/.test(normalized) || /\/platform-users/.test(normalized)) {
    return { title: "Пользователи", subtitle: "Пользователи и роли" };
  }
  if (/\/users-roles/.test(normalized)) {
    return { title: "Пользователи", subtitle: "Пользователи и роли" };
  }
  if (/\/modules/.test(normalized)) {
    return { title: "Модули платформы", subtitle: "Платформа" };
  }
  if (/\/settings/.test(normalized)) {
    return { title: "Настройки платформы", subtitle: "Платформа" };
  }
  if (/\/integrations/.test(normalized)) {
    return { title: "Интеграции платформы", subtitle: "Платформа" };
  }
  if (/\/audit-log/.test(normalized)) {
    return { title: "Журнал событий", subtitle: "Control Plane" };
  }

  return { title: "Управление платформой", subtitle };
}
