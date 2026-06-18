import {
  buildControlPlaneCompaniesPath,
  buildControlPlanePlatformPath,
  buildControlPlanePlatformProfilePath,
  buildControlPlaneRoute,
  buildControlPlaneUsersRolesPath,
} from "./controlPlanePaths.js";
import { resolvePlatformProfileWorkspaceTab } from "../platformProfile/platformProfileWorkspaceConfig.js";
import { resolvePlatformWorkspaceTab } from "../platform/platformWorkspaceConfig.js";

const CP = buildControlPlaneRoute();

function cpNavItem({
  id,
  title,
  route = null,
  children = null,
  sortOrder = 0,
  type = "system_page",
}) {
  const hasChildren = Array.isArray(children) && children.length > 0;

  return {
    id,
    title,
    type: hasChildren ? "section" : type,
    ...(route ? { route, path: route } : {}),
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
    sortOrder: 10,
  }),
  cpNavItem({
    id: "cp-group-platform-profile",
    title: "Профиль платформы",
    route: buildControlPlanePlatformProfilePath("general"),
    sortOrder: 20,
  }),
  cpNavItem({
    id: "cp-group-users-roles",
    title: "Пользователи и роли",
    route: buildControlPlaneUsersRolesPath("users"),
    sortOrder: 30,
  }),
  cpNavItem({
    id: "cp-group-releases",
    title: "Релизы",
    route: buildControlPlaneRoute("releases"),
    sortOrder: 40,
  }),
  cpNavItem({
    id: "cp-group-companies",
    title: "Компании",
    route: buildControlPlaneCompaniesPath("clients"),
    sortOrder: 50,
  }),
  cpNavItem({
    id: "cp-group-platform",
    title: "Платформа",
    route: buildControlPlanePlatformPath("overview"),
    sortOrder: 60,
  }),
  cpNavItem({
    id: "cp-group-templates",
    title: "Шаблоны",
    sortOrder: 70,
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
    ],
  }),
  cpNavItem({
    id: "cp-audit-log",
    title: "Журнал событий",
    route: buildControlPlaneRoute("audit-log"),
    sortOrder: 80,
  }),
];

const PLATFORM_WORKSPACE_ROUTE_PATTERN =
  /^\/control-plane\/platform\/(overview|environments|modules|module-update-offers|module-update-previews|policies|monitoring|tenant-module-configurations|module-configuration-diffs)(?:\/|$)/;

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
    test: (path) => /^\/control-plane\/companies\/clients\/\d+\/profile(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/companies\/licenses(?:\/|$)/.test(path),
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
    test: (path) => /^\/control-plane\/releases\/versions(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/releases(?:\/|$)/.test(path),
    itemId: "cp-group-releases",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/templates\/publish(?:\/|$)/.test(path),
    itemId: "cp-group-releases",
    parentIds: [],
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
    test: (path) => PLATFORM_WORKSPACE_ROUTE_PATTERN.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/platform\/licenses(?:\/|$)/.test(path),
    itemId: "cp-group-companies",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/platform\/backup(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/platform(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
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
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/module-configuration-diffs(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/module-applies(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/module-publications(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/module-rollbacks(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/tenant-module-configurations(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/module-update-previews(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/module-update-offers(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/modules(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
  },
  {
    test: (path) => /^\/control-plane\/integrations(?:\/|$)/.test(path),
    itemId: "cp-group-platform",
    parentIds: [],
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

export function applyControlPlaneNavBadges(navigationItems, badgeCounts = {}) {
  const counts = badgeCounts && typeof badgeCounts === "object" ? badgeCounts : {};

  return navigationItems.map((item) => {
    const badgeCount = Number(counts[item.id] ?? 0);
    const nextItem = badgeCount > 0 ? { ...item, badge_count: badgeCount } : item;

    if (!Array.isArray(item.children) || item.children.length === 0) {
      return nextItem;
    }

    return {
      ...nextItem,
      children: applyControlPlaneNavBadges(item.children, counts),
    };
  });
}

function buildPlatformWorkspacePageMeta(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  const slugMatch = normalized.match(/\/platform\/([^/]+)/);
  const slug = slugMatch?.[1] || "overview";
  const tab = resolvePlatformWorkspaceTab(slug);
  const platformRoot = buildControlPlanePlatformPath("overview");

  return {
    title: tab.label,
    subtitle: "Платформа",
    breadcrumbTrail: [
      {
        label: "Платформа",
        path: platformRoot,
      },
      {
        label: tab.label,
        path: tab.route,
      },
    ],
  };
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
  if (/\/companies\/licenses/.test(normalized)) {
    return { title: "Компании", subtitle: "Лицензии" };
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
  if (/\/releases\/versions/.test(normalized)) {
    return { title: "Компании", subtitle: "Версии" };
  }
  if (/\/releases/.test(normalized)) {
    return { title: "Проверка релизов", subtitle: "Релизы" };
  }
  if (/\/templates\/publish/.test(normalized)) {
    return { title: "Релизы", subtitle: "Control Plane" };
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
  if (PLATFORM_WORKSPACE_ROUTE_PATTERN.test(normalized)) {
    return buildPlatformWorkspacePageMeta(normalized);
  }
  if (/\/platform\/licenses/.test(normalized)) {
    return { title: "Компании", subtitle: "Лицензии" };
  }
  if (/\/platform\/policies/.test(normalized)) {
    return buildPlatformWorkspacePageMeta(normalized);
  }
  if (/\/platform\/monitoring/.test(normalized)) {
    return buildPlatformWorkspacePageMeta(normalized);
  }
  if (/\/platform\/backup/.test(normalized)) {
    return { title: "Резервное копирование", subtitle: "Платформа" };
  }
  if (/\/users-roles\/roles/.test(normalized) || /\/platform-roles/.test(normalized)) {
    return { title: "Роли", subtitle: "Пользователи и роли" };
  }
  if (/\/users-roles\/global-users/.test(normalized)) {
    return { title: "Глобальные пользователи", subtitle: "Пользователи и роли" };
  }
  if (/\/users-roles\/users/.test(normalized) || /\/platform-users/.test(normalized)) {
    return { title: "Пользователи", subtitle: "Пользователи и роли" };
  }
  if (/\/users-roles/.test(normalized)) {
    return { title: "Пользователи", subtitle: "Пользователи и роли" };
  }
  if (/\/module-configuration-diffs/.test(normalized)) {
    return buildPlatformWorkspacePageMeta(
      buildControlPlanePlatformPath("module-configuration-diffs"),
    );
  }
  if (/\/module-applies/.test(normalized)) {
    return { title: "Module Applies", subtitle: "Платформа" };
  }
  if (/\/module-publications/.test(normalized)) {
    return { title: "Module Publications", subtitle: "Платформа" };
  }
  if (/\/module-rollbacks/.test(normalized)) {
    return { title: "Module Rollbacks", subtitle: "Платформа" };
  }
  if (/\/tenant-module-configurations/.test(normalized)) {
    return buildPlatformWorkspacePageMeta(
      buildControlPlanePlatformPath("tenant-module-configurations"),
    );
  }
  if (/\/module-update-previews/.test(normalized)) {
    return buildPlatformWorkspacePageMeta(
      buildControlPlanePlatformPath("module-update-previews"),
    );
  }
  if (/\/module-update-offers/.test(normalized)) {
    return buildPlatformWorkspacePageMeta(
      buildControlPlanePlatformPath("module-update-offers"),
    );
  }
  if (/\/modules/.test(normalized)) {
    return buildPlatformWorkspacePageMeta(buildControlPlanePlatformPath("modules"));
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
