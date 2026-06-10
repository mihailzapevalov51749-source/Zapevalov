import { buildControlPlaneClientsPath, buildControlPlaneRoute } from "./controlPlanePaths.js";

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
    iconType: "users",
    sortOrder: 20,
    children: [
      cpNavItem({
        id: "cp-companies-list",
        title: "Компании",
        route: buildControlPlaneClientsPath("companies"),
        iconType: "users",
        sortOrder: 10,
      }),
      cpNavItem({
        id: "cp-companies-registry",
        title: "Tenant Registry",
        route: buildControlPlaneClientsPath("registry"),
        iconType: "settings",
        sortOrder: 20,
      }),
      cpNavItem({
        id: "cp-companies-create",
        title: "Создание компании",
        route: buildControlPlaneClientsPath("create"),
        iconType: "settings",
        sortOrder: 30,
      }),
      cpNavItem({
        id: "cp-companies-clone",
        title: "Клонирование",
        route: buildControlPlaneClientsPath("clone"),
        iconType: "settings",
        sortOrder: 40,
      }),
    ],
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
    id: "cp-group-system",
    title: "Система",
    iconType: "settings",
    sortOrder: 50,
    children: [
      cpNavItem({
        id: "cp-platform-users",
        title: "Пользователи платформы",
        route: buildControlPlaneRoute("platform-users"),
        iconType: "users",
        sortOrder: 10,
      }),
      cpNavItem({
        id: "cp-platform-roles",
        title: "Роли платформы",
        route: buildControlPlaneRoute("platform-roles"),
        sortOrder: 20,
      }),
      cpNavItem({
        id: "cp-audit-log",
        title: "Журнал событий",
        route: buildControlPlaneRoute("audit-log"),
        sortOrder: 30,
      }),
    ],
  }),
];

const ROUTE_MATCHERS = [
  {
    test: (path) => path === CP,
    itemId: "cp-overview",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/clients\/companies(?:\/|$)/.test(path),
    itemId: "cp-companies-list",
    parentIds: ["cp-group-companies"],
  },
  {
    test: (path) => /^\/control-plane\/clients\/registry(?:\/|$)/.test(path),
    itemId: "cp-companies-registry",
    parentIds: ["cp-group-companies"],
  },
  {
    test: (path) => /^\/control-plane\/clients\/create(?:\/|$)/.test(path),
    itemId: "cp-companies-create",
    parentIds: ["cp-group-companies"],
  },
  {
    test: (path) => /^\/control-plane\/clients\/clone(?:\/|$)/.test(path),
    itemId: "cp-companies-clone",
    parentIds: ["cp-group-companies"],
  },
  {
    test: (path) => /^\/control-plane\/clients(?:\/|$)/.test(path),
    itemId: "cp-companies-list",
    parentIds: ["cp-group-companies"],
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
    test: (path) => /^\/control-plane\/platform-users(?:\/|$)/.test(path),
    itemId: "cp-platform-users",
    parentIds: ["cp-group-system"],
  },
  {
    test: (path) => /^\/control-plane\/users(?:\/|$)/.test(path),
    itemId: "cp-platform-users",
    parentIds: ["cp-group-system"],
  },
  {
    test: (path) => /^\/control-plane\/platform-roles(?:\/|$)/.test(path),
    itemId: "cp-platform-roles",
    parentIds: ["cp-group-system"],
  },
  {
    test: (path) => /^\/control-plane\/roles(?:\/|$)/.test(path),
    itemId: "cp-platform-roles",
    parentIds: ["cp-group-system"],
  },
  {
    test: (path) => /^\/control-plane\/audit-log(?:\/|$)/.test(path),
    itemId: "cp-audit-log",
    parentIds: ["cp-group-system"],
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
  if (/\/clients\/registry\/\d+/.test(normalized)) {
    return { title: "Tenant Registry", subtitle: "Компании" };
  }
  if (/\/clients\/registry/.test(normalized)) {
    return { title: "Tenant Registry", subtitle: "Компании" };
  }
  if (/\/clients\/companies\/\d+/.test(normalized)) {
    return { title: "Карточка компании", subtitle: "Компании" };
  }
  if (/\/clients\/companies/.test(normalized)) {
    return { title: "Компании", subtitle: "Компании" };
  }
  if (/\/clients\/create/.test(normalized)) {
    return { title: "Создание компании", subtitle: "Компании" };
  }
  if (/\/clients\/clone/.test(normalized)) {
    return { title: "Клонирование", subtitle: "Компании" };
  }
  if (/\/clients/.test(normalized)) {
    return { title: "Клиенты ЯсноПро", subtitle };
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
  if (/\/platform-users/.test(normalized)) {
    return { title: "Пользователи платформы", subtitle: "Система" };
  }
  if (/\/platform-roles/.test(normalized)) {
    return { title: "Роли платформы", subtitle: "Система" };
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
    return { title: "Журнал событий", subtitle: "Система" };
  }

  return { title: "Управление платформой", subtitle };
}
