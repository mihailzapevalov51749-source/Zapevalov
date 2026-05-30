import {
  isDesignerMenuObjectShortcutItem,
  isDesignerObjectDetailRoute,
  isDesignerObjectTypesListRoute,
  isDesignerPlatformRoute,
  normalizeDesignerPath,
  resolveDesignerMenuItemPath,
  resolveDesignerSectionByPath,
  resolveDesignerTenantIdFromPath,
  resolveObjectTypeIdFromDesignerPath,
} from "./designerNavigationResolver";

export const DESIGNER_ROUTE_OWNER_KIND = {
  OBJECTS_SECTION: "objects_section",
  OBJECT_SHORTCUT: "object_shortcut",
  ROOT_SECTION: "root_section",
};

const ROUTE_OWNER_STORAGE_KEY = "yasnopro:designer-route-owner";

function readStoredRouteOwner() {
  try {
    const raw = sessionStorage.getItem(ROUTE_OWNER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function setDesignerRouteOwner(owner) {
  if (!owner || typeof owner !== "object") {
    sessionStorage.removeItem(ROUTE_OWNER_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(ROUTE_OWNER_STORAGE_KEY, JSON.stringify(owner));
}

export function getDesignerRouteOwner() {
  return readStoredRouteOwner();
}

export function publishObjectsSectionRouteOwner(tenantId) {
  setDesignerRouteOwner({
    kind: DESIGNER_ROUTE_OWNER_KIND.OBJECTS_SECTION,
    sectionKey: "objects",
    tenantId: Number(tenantId) || 1,
  });
}

export function publishRootSectionRouteOwner(sectionKey, tenantId) {
  const normalizedSectionKey = String(sectionKey ?? "").trim();
  if (!normalizedSectionKey) {
    return;
  }

  if (normalizedSectionKey === "objects") {
    publishObjectsSectionRouteOwner(tenantId);
    return;
  }

  setDesignerRouteOwner({
    kind: DESIGNER_ROUTE_OWNER_KIND.ROOT_SECTION,
    sectionKey: normalizedSectionKey,
    tenantId: Number(tenantId) || 1,
  });
}

export function publishPlatformSectionRouteOwner(tenantId) {
  publishRootSectionRouteOwner("platform", tenantId);
}

export function publishObjectShortcutRouteOwner(menuItem, tenantId) {
  if (!menuItem) {
    return;
  }

  const label = String(
    menuItem.display_title || menuItem.title || menuItem.label || "",
  ).trim();

  setDesignerRouteOwner({
    kind: DESIGNER_ROUTE_OWNER_KIND.OBJECT_SHORTCUT,
    tenantId: Number(tenantId) || 1,
    menuItemId: String(menuItem.id ?? ""),
    label,
    objectTypeId: String(
      menuItem.object_type_id ??
        menuItem.objectTypeId ??
        menuItem.meta?.object_type_id ??
        "",
    ).trim(),
    menuPath: resolveDesignerMenuItemPath(menuItem),
  });
}

function walkNavigationItems(items, visitor) {
  if (!Array.isArray(items)) {
    return;
  }

  for (const item of items) {
    visitor(item);
    walkNavigationItems(item.children ?? item.items, visitor);
  }
}

export function collectDesignerObjectShortcutMenuItems(navigationItems) {
  const shortcuts = [];

  walkNavigationItems(navigationItems, (item) => {
    if (isDesignerMenuObjectShortcutItem(item)) {
      shortcuts.push(item);
    }
  });

  return shortcuts;
}

function buildShortcutRouteOwner(shortcut, tenantId) {
  return {
    kind: DESIGNER_ROUTE_OWNER_KIND.OBJECT_SHORTCUT,
    tenantId: Number(tenantId) || 1,
    menuItemId: String(shortcut?.id ?? ""),
    label: String(shortcut?.display_title || shortcut?.title || shortcut?.label || "").trim(),
    objectTypeId: String(
      shortcut?.object_type_id ??
        shortcut?.objectTypeId ??
        shortcut?.meta?.object_type_id ??
        "",
    ).trim(),
    menuPath: resolveDesignerMenuItemPath(shortcut),
  };
}

function storedOwnerMatchesPath(stored, pathname) {
  if (!stored || typeof stored !== "object") {
    return false;
  }

  const normalizedPath = normalizeDesignerPath(pathname);
  const objectTypeId = resolveObjectTypeIdFromDesignerPath(normalizedPath);

  if (stored.kind === DESIGNER_ROUTE_OWNER_KIND.OBJECTS_SECTION) {
    return (
      isDesignerObjectTypesListRoute(normalizedPath) ||
      (Boolean(objectTypeId) && isDesignerObjectDetailRoute(normalizedPath))
    );
  }

  if (stored.kind === DESIGNER_ROUTE_OWNER_KIND.ROOT_SECTION) {
    const section = resolveDesignerSectionByPath(
      normalizedPath,
      stored.tenantId ?? resolveDesignerTenantIdFromPath(normalizedPath),
    );
    return section?.key === String(stored.sectionKey ?? "").trim();
  }

  if (stored.kind !== DESIGNER_ROUTE_OWNER_KIND.OBJECT_SHORTCUT) {
    return false;
  }

  const storedObjectTypeId = String(stored.objectTypeId ?? "").trim();
  if (storedObjectTypeId && objectTypeId && storedObjectTypeId === objectTypeId) {
    return true;
  }

  const storedMenuPath = normalizeDesignerPath(stored.menuPath);
  if (!storedMenuPath || !objectTypeId) {
    return false;
  }

  return (
    normalizedPath === storedMenuPath ||
    normalizedPath.startsWith(`${storedMenuPath}/`)
  );
}

export function findObjectShortcutMenuItemForPath(navigationItems, pathname) {
  const normalizedPath = normalizeDesignerPath(pathname);
  const objectTypeId = resolveObjectTypeIdFromDesignerPath(normalizedPath);

  if (!objectTypeId) {
    return null;
  }

  const shortcuts = collectDesignerObjectShortcutMenuItems(navigationItems);

  const exactMatches = shortcuts.filter(
    (item) => resolveDesignerMenuItemPath(item) === normalizedPath,
  );
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const prefixMatches = shortcuts.filter((item) => {
    const itemPath = resolveDesignerMenuItemPath(item);
    return (
      itemPath &&
      (normalizedPath === itemPath || normalizedPath.startsWith(`${itemPath}/`))
    );
  });
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  return null;
}

/**
 * Resolves who owns the current Designer route for breadcrumb + sidebar active state.
 */
export function resolveDesignerRouteOwner(pathname, navigationItems = [], tenantId = null) {
  const resolvedTenantId =
    tenantId ?? resolveDesignerTenantIdFromPath(pathname);
  const normalizedPath = normalizeDesignerPath(pathname);

  if (isDesignerPlatformRoute(normalizedPath)) {
    return {
      kind: DESIGNER_ROUTE_OWNER_KIND.ROOT_SECTION,
      sectionKey: "platform",
      tenantId: resolvedTenantId,
    };
  }

  const stored = readStoredRouteOwner();

  if (storedOwnerMatchesPath(stored, normalizedPath)) {
    return stored;
  }

  if (isDesignerObjectTypesListRoute(normalizedPath)) {
    return {
      kind: DESIGNER_ROUTE_OWNER_KIND.OBJECTS_SECTION,
      tenantId: resolvedTenantId,
    };
  }

  if (isDesignerObjectDetailRoute(normalizedPath)) {
    const shortcut = findObjectShortcutMenuItemForPath(
      navigationItems,
      normalizedPath,
    );

    if (shortcut) {
      return buildShortcutRouteOwner(shortcut, resolvedTenantId);
    }

    return {
      kind: DESIGNER_ROUTE_OWNER_KIND.OBJECTS_SECTION,
      sectionKey: "objects",
      tenantId: resolvedTenantId,
    };
  }

  const section = resolveDesignerSectionByPath(normalizedPath, resolvedTenantId);
  if (section && section.key !== "objects") {
    return {
      kind: DESIGNER_ROUTE_OWNER_KIND.ROOT_SECTION,
      sectionKey: section.key,
      tenantId: resolvedTenantId,
    };
  }

  return null;
}
