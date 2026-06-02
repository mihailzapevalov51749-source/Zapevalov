function normalizePath(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "");
}

function getItemPath(item) {
  return normalizePath(
    item?.targetPath ||
      item?.path ||
      item?.route ||
      item?.url ||
      item?.meta?.targetPath ||
      item?.meta?.path ||
      item?.meta?.route ||
      item?.meta?.url,
  );
}

function walkTree(items, parentId = null, depth = 0, acc = []) {
  if (!Array.isArray(items)) return acc;
  items.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const id = String(item.id ?? "");
    if (!id) return;
    acc.push({
      id,
      item,
      parentId,
      depth,
      path: getItemPath(item),
    });
    walkTree(item.children, id, depth + 1, acc);
  });
  return acc;
}

function byId(entries, id) {
  if (!id) return null;
  const target = String(id);
  return entries.find((entry) => entry.id === target) ?? null;
}

function byRoute(entries, currentPath) {
  const normalizedCurrent = normalizePath(currentPath);
  if (!normalizedCurrent) return null;
  const matched = entries.filter((entry) => {
    if (!entry.path) return false;
    return (
      normalizedCurrent === entry.path ||
      normalizedCurrent.startsWith(`${entry.path}/`)
    );
  });
  if (!matched.length) return null;
  matched.sort((a, b) => b.path.length - a.path.length || b.depth - a.depth);
  return matched[0];
}

function byEntity(entries, entityType, entityId, entityRefs = {}) {
  if (entityType === "page" && entityId != null) {
    const target = String(entityId);
    return (
      entries.find(
        (entry) =>
          String(entry.item?.page_id ?? entry.item?.pageId ?? entry.item?.meta?.page_id ?? "") === target,
      ) ?? null
    );
  }

  if (entityType === "object_type" && entityId) {
    const target = String(entityId);
    return (
      entries.find(
        (entry) =>
          String(
            entry.item?.object_type_id ??
              entry.item?.objectTypeId ??
              entry.item?.meta?.object_type_id ??
              entry.item?.meta?.objectTypeId ??
              "",
          ) === target,
      ) ?? null
    );
  }

  if (entityType === "workspace" && entityRefs?.workspaceSlug) {
    const slug = String(entityRefs.workspaceSlug).trim().toLowerCase();
    return (
      entries.find((entry) => {
        const path = String(entry.path || "").toLowerCase();
        return path.includes(`/workspaces/${slug}`);
      }) ?? null
    );
  }

  return null;
}

export function resolveNavigationChain(navigationItems, currentItemId) {
  const entries = walkTree(navigationItems);
  const byIdMap = new Map(entries.map((entry) => [entry.id, entry]));
  const current = byId(entries, currentItemId);
  if (!current) return [];

  const chain = [];
  let cursor = current;
  while (cursor) {
    chain.unshift(cursor);
    cursor = cursor.parentId ? byIdMap.get(cursor.parentId) ?? null : null;
  }
  return chain;
}

export function resolveNavigationItemByRoute(navigationItems, currentPath) {
  const entries = walkTree(navigationItems);
  return byRoute(entries, currentPath)?.item ?? null;
}

export function resolveNavigationItemByEntity(
  navigationItems,
  entityType,
  entityId,
  entityRefs = {},
) {
  const entries = walkTree(navigationItems);
  return byEntity(entries, entityType, entityId, entityRefs)?.item ?? null;
}

export function buildBreadcrumbsFromNavigationChain(chain, rootLabel = "") {
  const normalizeLabel = (value) => String(value || "").trim().toLowerCase();
  const items = [];
  if (rootLabel) {
    items.push({ id: "navigation-root", label: String(rootLabel) });
  }
  const chainItems = [];
  chain.forEach((entry, index) => {
    const label = String(
      entry?.item?.display_title || entry?.item?.title || entry?.item?.label || "",
    ).trim();
    if (!label) return;
    chainItems.push({
      id: String(entry.id || `navigation-${index}`),
      label,
      path: entry.path || undefined,
    });
  });

  // Prevent duplicate root in final breadcrumbs:
  // Header root "Офис" + first chain node "Офис" -> keep only one.
  if (
    rootLabel &&
    chainItems.length > 0 &&
    normalizeLabel(chainItems[0].label) === normalizeLabel(rootLabel)
  ) {
    chainItems.shift();
  }

  items.push(...chainItems);
  return items;
}

export function resolveNavigationContext({
  navigationItems = [],
  currentPath = "",
  currentItemId = null,
  entityType = "",
  entityId = null,
  entityRefs = {},
}) {
  const entries = walkTree(navigationItems);
  const resolvedEntry =
    byId(entries, currentItemId) ||
    byRoute(entries, currentPath) ||
    byEntity(entries, entityType, entityId, entityRefs);

  if (!resolvedEntry) {
    return {
      currentNavigationItem: null,
      currentNavigationItemId: null,
      activeParentIds: [],
      chain: [],
      targetPath: "",
    };
  }

  const chain = resolveNavigationChain(navigationItems, resolvedEntry.id);
  const activeParentIds = chain.slice(0, -1).map((entry) => String(entry.id));

  return {
    currentNavigationItem: resolvedEntry.item,
    currentNavigationItemId: String(resolvedEntry.id),
    activeParentIds,
    chain,
    targetPath: resolvedEntry.path || "",
  };
}

