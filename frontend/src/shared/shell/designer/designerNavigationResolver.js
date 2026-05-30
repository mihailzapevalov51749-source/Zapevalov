/**
 * Centralized Designer section matching, breadcrumb building, and route-active rules.
 * Runtime breadcrumb logic lives separately (WorkspaceTopBar / PortalPageView).
 */

const DESIGNER_TAB_LABELS = {
  general: "Общие",
  fields: "Поля",
  relations: "Связи",
  views: "Вкладки",
  "runtime-preview": "Runtime Preview",
  data: "Данные",
};

const ADMIN_SECTION_LABELS = {
  users: "Пользователи системы",
  roles: "Роли и доступы",
  "org-structure": "Оргструктура",
  departments: "Подразделения",
  modules: "Модули",
  integrations: "Интеграции",
  "audit-log": "Журнал событий",
  audit: "Журнал событий",
  "ai-assistants": "AI-ассистенты",
  "system-settings": "Настройка системы",
  system: "Настройка системы",
};

const DETAIL_SEGMENT_LABELS = {
  layout: "Макет",
  settings: "Настройки",
  schema: "Схема",
  items: "Пункты",
  points: "Пункты",
  general: "Общие",
};

function normalizePath(value) {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed === "/") {
    return "/";
  }

  return trimmed.replace(/\/+$/, "");
}

export const normalizeDesignerPath = normalizePath;

export function resolveObjectTypeIdFromDesignerPath(pathname) {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/\/object-types\/([^/?]+)/);
  return match ? String(match[1]).trim() : "";
}

export function resolveDesignerTenantBase(tenantId) {
  const normalizedTenantId = Number(tenantId) || 1;
  return `/designer/tenant/${normalizedTenantId}`;
}

export function isDesignerPlatformRoute(pathname) {
  const normalized = normalizePath(pathname);
  return /\/designer\/tenant\/\d+\/platform(?:\/|$)/.test(normalized);
}

export function getDesignerSectionDefinitions(tenantId) {
  const base = resolveDesignerTenantBase(tenantId);

  return [
    {
      key: "objects",
      label: "Объекты",
      path: `${base}/object-types`,
      match: (pathname) => /\/object-types(?:\/|$)/.test(pathname),
    },
    {
      key: "administration",
      label: "Администрирование",
      path: `${base}/administration`,
      match: (pathname) => /\/administration(?:\/|$)/.test(pathname),
    },
    {
      key: "pages",
      label: "Страницы",
      path: `${base}/pages`,
      match: (pathname) =>
        /\/pages(?:\/|$)/.test(pathname) || /\/page\/\d+(?:\/|$)/.test(pathname),
    },
    {
      key: "navigation",
      label: "Навигация",
      path: `${base}/navigation`,
      match: (pathname) => /\/navigation(?:\/|$)/.test(pathname),
    },
    {
      key: "processes",
      label: "Бизнес-процессы",
      path: `${base}/processes`,
      match: (pathname) => /\/processes(?:\/|$)/.test(pathname),
    },
    {
      key: "workspaces",
      label: "Рабочие пространства",
      path: `${base}/workspaces`,
      match: (pathname) => /\/workspaces(?:\/|$)/.test(pathname),
    },
    {
      key: "publishing",
      label: "Публикация",
      path: `${base}/publishing`,
      match: (pathname) => /\/publishing(?:\/|$)/.test(pathname),
    },
    {
      key: "platform",
      label: "Платформа",
      path: `${base}/platform`,
      match: (pathname) => /\/platform(?:\/|$)/.test(pathname),
    },
    {
      key: "relations",
      label: "Связи",
      path: `${base}/relations`,
      match: (pathname) => /\/relations(?:\/|$)/.test(pathname),
    },
    {
      key: "views",
      label: "Вкладки",
      path: `${base}/views`,
      match: (pathname) => /\/views(?:\/|$)/.test(pathname),
    },
  ];
}

export function resolveDesignerSectionByPath(pathname, tenantId) {
  const normalizedPath = normalizePath(pathname);

  if (!normalizedPath.startsWith("/designer/")) {
    return null;
  }

  const sections = getDesignerSectionDefinitions(tenantId);

  return sections.find((section) => section.match(normalizedPath)) ?? null;
}

export function resolveDesignerActiveSectionKey(pathname, tenantId) {
  return resolveDesignerSectionByPath(pathname, tenantId)?.key ?? "objects";
}

export const DESIGNER_MENU_ITEM_KIND = {
  ROOT_SECTION: "root_section",
  OBJECT_SHORTCUT: "object_shortcut",
  NESTED_DETAIL: "nested_detail",
  CUSTOM: "custom",
};

export function resolveDesignerMenuItemPath(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  return normalizePath(
    item.path ||
      item.route ||
      item.url ||
      item.meta?.path ||
      item.meta?.route ||
      item.meta?.url,
  );
}

export function resolveDesignerTenantIdFromPath(pathname) {
  const match = normalizePath(pathname).match(/\/designer\/tenant\/(\d+)/);
  return match ? Number(match[1]) || 1 : 1;
}

/**
 * Routes that open a concrete object type inside Objects (detail context).
 */
export function isDesignerObjectDetailRoute(pathname) {
  const normalized = normalizePath(pathname);
  return /\/designer\/tenant\/\d+\/object-types\/[^/]+(?:\/|$)/.test(normalized);
}

export function isDesignerMenuObjectShortcutItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const type = String(item.type || item.meta?.type || "").trim();
  if (type === "object_type") {
    return true;
  }

  if (item.object_type_id != null || item.objectTypeId != null) {
    return true;
  }

  if (item.meta?.is_object_type === true) {
    return true;
  }

  if (item.meta?.object_type_id != null || item.meta?.objectTypeId != null) {
    return true;
  }

  const route = resolveDesignerMenuItemPath(item);
  if (isDesignerObjectDetailRoute(route)) {
    return true;
  }

  return false;
}

export function isDesignerMenuRootSectionItem(item, tenantId) {
  if (isDesignerMenuObjectShortcutItem(item)) {
    return false;
  }

  const id = String(item?.id || item?.key || "").trim();
  if (id.startsWith("system-designer-")) {
    return true;
  }

  const route = resolveDesignerMenuItemPath(item);
  if (!route.startsWith("/designer/")) {
    return false;
  }

  const sections = getDesignerSectionDefinitions(tenantId);
  return sections.some(
    (section) => normalizePath(section.path) === route,
  );
}

export function classifyDesignerMenuItem(item, tenantId) {
  if (isDesignerMenuRootSectionItem(item, tenantId)) {
    return DESIGNER_MENU_ITEM_KIND.ROOT_SECTION;
  }

  if (isDesignerMenuObjectShortcutItem(item)) {
    return DESIGNER_MENU_ITEM_KIND.OBJECT_SHORTCUT;
  }

  const route = resolveDesignerMenuItemPath(item);
  if (isDesignerObjectDetailRoute(route)) {
    return DESIGNER_MENU_ITEM_KIND.NESTED_DETAIL;
  }

  return DESIGNER_MENU_ITEM_KIND.CUSTOM;
}

export function isDesignerPathBoundaryMatch(itemPath, activePath) {
  const normalizedItemPath = normalizePath(itemPath);
  const normalizedActivePath = normalizePath(activePath);

  if (!normalizedItemPath || !normalizedActivePath) {
    return false;
  }

  if (normalizedActivePath === normalizedItemPath) {
    return true;
  }

  return normalizedActivePath.startsWith(`${normalizedItemPath}/`);
}

function resolveDesignerNavigationItemId(item) {
  const id = item?.id ?? item?.key;
  if (id == null || id === "") {
    return null;
  }

  return String(id);
}

function walkDesignerNavigationItems(items, visitor) {
  if (!Array.isArray(items)) {
    return;
  }

  for (const item of items) {
    visitor(item);
    walkDesignerNavigationItems(item.children ?? item.items, visitor);
  }
}

function resolveOwnedRootSectionMenuItemActive({
  item,
  normalizedActivePath,
  normalizedItemPath,
  resolvedTenantId,
  ownedSectionKey,
  ownedSection,
}) {
  if (isDesignerMenuObjectShortcutItem(item)) {
    return false;
  }

  if (!isDesignerMenuRootSectionItem(item, resolvedTenantId)) {
    return false;
  }

  const itemSection = resolveDesignerSectionByPath(
    normalizedItemPath,
    resolvedTenantId,
  );

  if (itemSection?.key !== ownedSectionKey) {
    return false;
  }

  if (ownedSectionKey === "platform") {
    return isDesignerPlatformRoute(normalizedActivePath);
  }

  const ownedSectionPath = normalizePath(ownedSection.path);
  if (ownedSectionPath === normalizedItemPath) {
    return isDesignerSectionRouteActive(normalizedItemPath, normalizedActivePath);
  }

  return normalizedActivePath === normalizedItemPath;
}

function scoreDesignerSidebarItemActive({
  item,
  normalizedActivePath,
  resolvedTenantId,
  routeOwner,
  activePageId,
}) {
  const normalizedItemPath = normalizePath(resolveDesignerMenuItemPath(item));
  const itemId = resolveDesignerNavigationItemId(item);

  if (!itemId || !normalizedActivePath.startsWith("/designer/")) {
    return -1;
  }

  if (routeOwner?.kind === "object_shortcut") {
    if (isDesignerMenuRootSectionItem(item, resolvedTenantId)) {
      return -1;
    }

    if (!isDesignerMenuObjectShortcutItem(item)) {
      return -1;
    }

    const ownerMenuItemId = String(routeOwner.menuItemId ?? "").trim();
    if (ownerMenuItemId && itemId === ownerMenuItemId) {
      return 100000;
    }

    const ownerMenuPath = normalizePath(routeOwner.menuPath);
    if (ownerMenuPath && normalizedItemPath === ownerMenuPath) {
      return 100000;
    }

    return -1;
  }

  const ownedSectionKey = String(
    routeOwner?.sectionKey ??
      (routeOwner?.kind === "objects_section" ? "objects" : ""),
  ).trim();

  if (
    routeOwner?.kind === "root_section" ||
    (routeOwner?.kind === "objects_section" && ownedSectionKey)
  ) {
    const ownedSection = getDesignerSectionDefinitions(resolvedTenantId).find(
      (section) => section.key === ownedSectionKey,
    );

    if (!ownedSection) {
      return -1;
    }

    if (
      resolveOwnedRootSectionMenuItemActive({
        item,
        normalizedActivePath,
        normalizedItemPath,
        resolvedTenantId,
        ownedSectionKey,
        ownedSection,
      })
    ) {
      if (ownedSectionKey === "platform") {
        return 50000;
      }

      return 40000 + normalizePath(ownedSection.path).length;
    }

    return -1;
  }

  const designerPageId = Number(normalizedActivePath.match(/\/page\/(\d+)/)?.[1]);
  const resolvedActivePageId = Number(activePageId ?? designerPageId);
  const itemPageId = Number(item?.page_id ?? item?.pageId ?? item?.meta?.page_id);

  if (
    Number.isFinite(resolvedActivePageId) &&
    Number.isFinite(itemPageId) &&
    resolvedActivePageId === itemPageId &&
    !isDesignerMenuRootSectionItem(item, resolvedTenantId)
  ) {
    return 80000 + normalizedItemPath.length;
  }

  if (
    !isDesignerMenuRootSectionItem(item, resolvedTenantId) &&
    !isDesignerMenuObjectShortcutItem(item) &&
    normalizedItemPath &&
    isDesignerPathBoundaryMatch(normalizedItemPath, normalizedActivePath)
  ) {
    return 1000 + normalizedItemPath.length;
  }

  if (isDesignerMenuRootSectionItem(item, resolvedTenantId)) {
    if (isDesignerPlatformRoute(normalizedActivePath)) {
      const itemSection = resolveDesignerSectionByPath(
        normalizedItemPath,
        resolvedTenantId,
      );
      if (itemSection?.key === "platform") {
        return 50000;
      }
      return -1;
    }

    if (isDesignerSectionRouteActive(normalizedItemPath, normalizedActivePath)) {
      return 2000 + normalizedItemPath.length;
    }
  }

  if (
    isDesignerMenuObjectShortcutItem(item) &&
    isDesignerSectionRouteActive(normalizedItemPath, normalizedActivePath)
  ) {
    return 3000 + normalizedItemPath.length;
  }

  return -1;
}

/**
 * Returns a single sidebar item id for the current Designer route.
 */
export function resolveActiveDesignerSidebarItemId({
  activePathname,
  navigationItems = [],
  tenantId = null,
  routeOwner = null,
  activePageId = null,
}) {
  const normalizedActivePath = normalizePath(activePathname);

  if (!normalizedActivePath.startsWith("/designer/")) {
    return null;
  }

  const resolvedTenantId =
    tenantId ?? resolveDesignerTenantIdFromPath(normalizedActivePath);

  let bestId = null;
  let bestScore = -1;

  walkDesignerNavigationItems(navigationItems, (item) => {
    const score = scoreDesignerSidebarItemActive({
      item,
      normalizedActivePath,
      resolvedTenantId,
      routeOwner,
      activePageId,
    });

    if (score > bestScore) {
      bestScore = score;
      bestId = resolveDesignerNavigationItemId(item);
    }
  });

  return bestId;
}

export function findDesignerNavigationItemById(navigationItems, activeItemId) {
  if (activeItemId == null || !Array.isArray(navigationItems)) {
    return null;
  }

  const targetId = String(activeItemId);
  let found = null;

  walkDesignerNavigationItems(navigationItems, (item) => {
    if (found) {
      return;
    }

    if (resolveDesignerNavigationItemId(item) === targetId) {
      found = item;
    }
  });

  return found;
}

export function resolveDesignerMenuItemLabel(item) {
  return (
    String(item?.display_title || item?.title || item?.label || "").trim() ||
    "Раздел"
  );
}

function buildSidebarItemBreadcrumbs(pathname, item) {
  const itemId = resolveDesignerNavigationItemId(item);
  const chain = [
    {
      id: itemId ?? String(item?.id ?? item?.key ?? "designer-sidebar-item"),
      label: resolveDesignerMenuItemLabel(item),
      path:
        resolveDesignerMenuItemPath(item) ||
        String(item?.route || item?.path || "").trim() ||
        undefined,
    },
  ];

  const pageMatch = pathname.match(/\/page\/(\d+)(?:\/([^/?]+))?/);
  if (pageMatch?.[2]) {
    chain.push({
      id: "designer-page-detail",
      label: resolveDetailSegmentLabel(pageMatch[2]),
    });
  }

  return markLastActive(chain);
}

function resolveDesignerBreadcrumbActiveItem(pathname, context, tenantId) {
  const {
    activeItemId = null,
    navigationItems = [],
    routeOwner = null,
    activePageId = null,
  } = context;

  if (!Array.isArray(navigationItems) || navigationItems.length === 0) {
    return null;
  }

  const acceptItem = (item) =>
    item && !isDesignerMenuRootSectionItem(item, tenantId) ? item : null;

  if (activeItemId != null) {
    const byId = acceptItem(
      findDesignerNavigationItemById(navigationItems, activeItemId),
    );
    if (byId) {
      return byId;
    }
  }

  const resolvedActiveItemId = resolveActiveDesignerSidebarItemId({
    activePathname: pathname,
    navigationItems,
    tenantId,
    routeOwner,
    activePageId,
  });

  if (resolvedActiveItemId != null) {
    const byResolvedId = acceptItem(
      findDesignerNavigationItemById(navigationItems, resolvedActiveItemId),
    );
    if (byResolvedId) {
      return byResolvedId;
    }
  }

  const pageMatch = pathname.match(/\/page\/(\d+)/);
  if (pageMatch) {
    const pageId = Number(pageMatch[1]);
    if (Number.isFinite(pageId)) {
      const byPageId = acceptItem(
        findDesignerNavigationItemByPageId(navigationItems, pageId),
      );
      if (byPageId) {
        return byPageId;
      }
    }
  }

  return null;
}

/**
 * Designer sidebar active rule:
 * only the route owner menu item is active.
 */
export function resolveDesignerSidebarItemActive({
  item,
  activePathname,
  itemPath = null,
  tenantId = null,
  routeOwner = null,
  activePageId = null,
  activeItemId = null,
  navigationItems = null,
}) {
  const itemId = resolveDesignerNavigationItemId(item);

  if (activeItemId != null) {
    return itemId != null && itemId === String(activeItemId);
  }

  if (Array.isArray(navigationItems) && navigationItems.length > 0) {
    const resolvedActiveItemId = resolveActiveDesignerSidebarItemId({
      activePathname,
      navigationItems,
      tenantId,
      routeOwner,
      activePageId,
    });

    if (resolvedActiveItemId != null) {
      return itemId != null && itemId === resolvedActiveItemId;
    }
  }

  const normalizedActivePath = normalizePath(activePathname);
  const normalizedItemPath = normalizePath(
    itemPath || resolveDesignerMenuItemPath(item),
  );

  if (
    !normalizedActivePath.startsWith("/designer/") ||
    !normalizedItemPath.startsWith("/designer/")
  ) {
    return false;
  }

  const resolvedTenantId =
    tenantId ?? resolveDesignerTenantIdFromPath(normalizedActivePath);

  const score = scoreDesignerSidebarItemActive({
    item,
    normalizedActivePath,
    resolvedTenantId,
    routeOwner,
    activePageId,
  });

  return score >= 0;
}

export function isDesignerObjectTypesListRoute(route) {
  const normalized = normalizePath(route);
  return /\/designer\/tenant\/\d+\/object-types\/?$/.test(normalized);
}

export function isDesignerSectionRouteActive(sectionRoute, activePathname) {
  const normalizedRoute = normalizePath(sectionRoute);
  const normalizedActivePath = normalizePath(activePathname);

  if (!normalizedRoute || !normalizedActivePath) {
    return false;
  }

  if (normalizedActivePath === normalizedRoute) {
    return true;
  }

  if (!normalizedActivePath.startsWith("/designer/")) {
    return false;
  }

  if (isDesignerObjectTypesListRoute(normalizedRoute)) {
    return normalizedActivePath.startsWith(`${normalizedRoute}/`);
  }

  if (!normalizedActivePath.startsWith(`${normalizedRoute}/`)) {
    return false;
  }

  return true;
}

export function resolveDesignerTabLabel(tabSegment) {
  const segment = String(tabSegment || "").trim().toLowerCase();
  return DESIGNER_TAB_LABELS[segment] || (segment ? segment : "Раздел");
}

export function resolveObjectTypeNameFromNavigation(navigationItems, objectTypeId) {
  const targetId = String(objectTypeId ?? "").trim();
  if (!targetId) {
    return "";
  }

  const walk = (items) => {
    if (!Array.isArray(items)) {
      return "";
    }

    for (const item of items) {
      const itemObjectTypeId = String(item?.object_type_id ?? "").trim();
      if (itemObjectTypeId && itemObjectTypeId === targetId) {
        return String(item?.display_title || item?.title || "").trim();
      }

      const nested = walk(item?.children);
      if (nested) {
        return nested;
      }
    }

    return "";
  };

  return walk(navigationItems);
}

export function resolveDesignerPageLabel(pathname, navigationItems) {
  const pageId = Number(pathname.match(/\/page\/(\d+)/)?.[1]);
  if (!Number.isFinite(pageId)) {
    return "Страница";
  }

  const match = findDesignerNavigationItemByPageId(navigationItems, pageId);

  return String(match?.display_title || match?.title || match?.label || "").trim()
    || `Страница ${pageId}`;
}

function findDesignerNavigationItemByPageId(navigationItems, pageId) {
  if (!Array.isArray(navigationItems)) {
    return null;
  }

  let found = null;

  walkDesignerNavigationItems(navigationItems, (item) => {
    if (found) {
      return;
    }

    const itemPageId = Number(item?.page_id ?? item?.pageId ?? item?.meta?.page_id);
    if (Number.isFinite(itemPageId) && itemPageId === pageId) {
      found = item;
    }
  });

  return found;
}

function resolveDetailSegmentLabel(segment) {
  const normalized = String(segment || "").trim().toLowerCase();
  return DETAIL_SEGMENT_LABELS[normalized] || segment || "Раздел";
}

function markLastActive(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((item, index) => ({
    ...item,
    active: index === items.length - 1,
  }));
}

function buildSectionRootItem(section) {
  return {
    id: `designer-section-${section.key}`,
    label: section.label,
    path: section.path,
  };
}

function buildObjectShortcutBreadcrumbs(pathname, base, context = {}, routeOwner = {}) {
  const { activeObjectAdapterLabel = "" } = context;

  const rootLabel =
    String(routeOwner.label || "").trim() ||
    "Объект";
  const rootPath =
    normalizePath(routeOwner.menuPath) ||
    normalizePath(pathname);

  const chain = [
    {
      id: "designer-object-shortcut-root",
      label: rootLabel,
      path: rootPath,
    },
  ];

  const isDataPage = /\/object-types\/[^/]+\/data\/?$/.test(pathname);
  if (isDataPage) {
    const adapterLabel =
      String(activeObjectAdapterLabel || "").trim() || "Таблица";
    chain.push({
      id: "designer-object-shortcut-view",
      label: adapterLabel,
    });
    return markLastActive(chain);
  }

  const tabMatch = pathname.match(/\/object-types\/[^/]+\/([^/?]+)/);
  if (tabMatch && tabMatch[1] !== "data") {
    chain.push({
      id: "designer-object-shortcut-detail",
      label: resolveDesignerTabLabel(tabMatch[1]),
    });
  }

  return markLastActive(chain);
}

function buildObjectTypeBreadcrumbs(pathname, base, context = {}) {
  const {
    objectTypeName = "",
    navigationItems = [],
    activeObjectAdapterLabel = "",
    routeOwner = null,
  } = context;

  if (routeOwner?.kind === "object_shortcut") {
    return buildObjectShortcutBreadcrumbs(pathname, base, context, routeOwner);
  }

  const objectMatch = pathname.match(/\/object-types\/([^/?]+)/);
  if (!objectMatch) {
    return markLastActive([
      {
        id: "designer-objects",
        label: "Объекты",
        path: `${base}/object-types`,
      },
    ]);
  }

  const objectTypeId = objectMatch[1];
  const resolvedObjectName =
    String(objectTypeName || "").trim() ||
    resolveObjectTypeNameFromNavigation(navigationItems, objectTypeId) ||
    objectTypeId;

  const isDataPage = /\/object-types\/[^/]+\/data\/?$/.test(pathname);
  const objectPath = isDataPage
    ? `${base}/object-types/${objectTypeId}/data`
    : `${base}/object-types/${objectTypeId}/general`;

  const chain = [
    {
      id: "designer-objects",
      label: "Объекты",
      path: `${base}/object-types`,
    },
    {
      id: "designer-object",
      label: resolvedObjectName,
      path: objectPath,
    },
  ];

  if (isDataPage) {
    const adapterLabel = String(activeObjectAdapterLabel || "").trim() || "Таблица";
    chain.push({
      id: "designer-active-adapter",
      label: adapterLabel,
    });
    return markLastActive(chain);
  }

  const tabMatch = pathname.match(/\/object-types\/[^/]+\/([^/?]+)/);
  if (tabMatch) {
    chain.push({
      id: "designer-tab",
      label: resolveDesignerTabLabel(tabMatch[1]),
    });
  }

  return markLastActive(chain);
}

function buildPagesBreadcrumbs(pathname, base, context = {}) {
  const { navigationItems = [] } = context;
  const pageMatch = pathname.match(/\/page\/(\d+)(?:\/([^/?]+))?/);

  if (pageMatch) {
    const pageId = Number(pageMatch[1]);
    const pageItem = Number.isFinite(pageId)
      ? findDesignerNavigationItemByPageId(navigationItems, pageId)
      : null;
    const pageLabel = pageItem
      ? resolveDesignerMenuItemLabel(pageItem)
      : resolveDesignerPageLabel(pathname, navigationItems);
    const pagePath =
      (pageItem ? resolveDesignerMenuItemPath(pageItem) : "") ||
      `${base}/page/${pageMatch[1]}`;

    const chain = [
      {
        id: pageItem
          ? resolveDesignerNavigationItemId(pageItem) ?? `designer-page-${pageMatch[1]}`
          : "designer-page-current",
        label: pageLabel,
        path: pagePath,
      },
    ];

    if (pageMatch[2]) {
      chain.push({
        id: "designer-page-detail",
        label: resolveDetailSegmentLabel(pageMatch[2]),
      });
    }

    return markLastActive(chain);
  }

  return markLastActive([
    {
      id: "designer-pages",
      label: "Страницы",
      path: `${base}/pages`,
    },
  ]);
}

const PLATFORM_TAB_LABELS = {
  architecture: "Архитектура",
  implementation: "Реализация",
  quality: "Качество",
  history: "История",
};

function resolvePlatformTabLabel(pathname) {
  const tabMatch = normalizePath(pathname).match(/\/platform\/([^/?]+)/);
  const tabKey = tabMatch?.[1];
  return PLATFORM_TAB_LABELS[tabKey] || null;
}

function buildPlatformBreadcrumbs(pathname, base) {
  const tabLabel = resolvePlatformTabLabel(pathname);
  const chain = [
    {
      id: "designer-platform",
      label: "Платформа",
      path: `${base}/platform/architecture`,
    },
  ];

  if (tabLabel) {
    chain.push({
      id: "designer-platform-tab",
      label: tabLabel,
    });
  }

  return markLastActive(chain);
}

function buildAdministrationBreadcrumbs(pathname, base) {
  const normalized = normalizePath(pathname);
  const root = `${base}/administration`;

  if (normalized === root) {
    return markLastActive([
      {
        id: "designer-administration",
        label: "Администрирование",
        path: root,
      },
    ]);
  }

  const section = normalized.slice(root.length + 1).split("/")[0];

  return markLastActive([
    {
      id: "designer-administration",
      label: "Администрирование",
      path: root,
    },
    {
      id: "designer-administration-section",
      label: ADMIN_SECTION_LABELS[section] || "Раздел",
    },
  ]);
}

function buildNestedSectionBreadcrumbs(section, pathname) {
  const chain = [buildSectionRootItem(section)];
  const sectionSegment = section.path.split("/").pop() || section.key;
  const detailMatch = pathname.match(
    new RegExp(`/designer/tenant/\\d+/${sectionSegment}/([^/?]+)(?:/([^/?]+))?`),
  );

  if (!detailMatch) {
    return markLastActive(chain);
  }

  const entitySegment = detailMatch[1];
  const subSegment = detailMatch[2];

  chain.push({
    id: `designer-${section.key}-entity`,
    label: decodeURIComponent(entitySegment),
    path: `${section.path}/${entitySegment}`,
  });

  if (subSegment) {
    chain.push({
      id: `designer-${section.key}-detail`,
      label: resolveDetailSegmentLabel(subSegment),
    });
  }

  return markLastActive(chain);
}

/**
 * Builds Designer header path chain:
 * Menu section / selected entity / current tab or subsection.
 */
export function buildDesignerBreadcrumbs(pathname, context = {}) {
  const tenantId = context.tenantId ?? 1;
  const base = resolveDesignerTenantBase(tenantId);
  const section = resolveDesignerSectionByPath(pathname, tenantId);

  if (!section) {
    return markLastActive([
      {
        id: "designer-root",
        label: "Студия",
        path: base,
      },
    ]);
  }

  if (section.key === "objects") {
    return buildObjectTypeBreadcrumbs(pathname, base, context);
  }

  if (section.key === "platform") {
    return buildPlatformBreadcrumbs(pathname, base);
  }

  const activeItem = resolveDesignerBreadcrumbActiveItem(pathname, context, tenantId);
  if (activeItem) {
    return buildSidebarItemBreadcrumbs(pathname, activeItem);
  }

  if (section.key === "pages") {
    return buildPagesBreadcrumbs(pathname, base, context);
  }

  if (section.key === "administration") {
    return buildAdministrationBreadcrumbs(pathname, base);
  }

  if (section.key === "navigation" || section.key === "processes") {
    return buildNestedSectionBreadcrumbs(section, pathname);
  }

  return markLastActive([buildSectionRootItem(section)]);
}
