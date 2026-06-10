/**
 * Portal Object Route helpers — Phase 9.2.
 * Resolves object_type menu items to portal runtime URLs (never designer data URLs).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DESIGNER_OBJECT_DATA_RE =
  /^\/designer\/tenant\/(\d+)\/object-types\/([^/]+)\/data\/?$/i;

const PORTAL_OBJECT_RE =
  /^\/portal\/(\d+)\/object-types\/([^/?#]+)(?:\/([^/?#]+))?\/?$/i;

const PORTAL_SCOPED_PATH_RE = /^\/portal\/(\d+)(\/.*)?$/i;

const DESIGNER_TENANT_PATH_RE = /^\/designer\/tenant\/(\d+)(\/.*)?$/i;

const DESIGNER_WORKSPACE_PATH_RE =
  /^\/designer\/tenant\/\d+\/workspaces\/([^/?#]+)(?:\/([^/?#]+))?\/?$/i;

const NAVIGATION_PATH_FIELDS = ["targetPath", "url", "path", "route"];

function splitPathWithSuffix(rawPath) {
  const raw = String(rawPath || "").trim();
  if (!raw) {
    return { pathname: "", suffix: "" };
  }

  const hashIndex = raw.indexOf("#");
  const queryIndex = raw.indexOf("?");
  const cutIndex =
    hashIndex === -1
      ? queryIndex
      : queryIndex === -1
        ? hashIndex
        : Math.min(hashIndex, queryIndex);

  if (cutIndex === -1) {
    return { pathname: raw, suffix: "" };
  }

  return {
    pathname: raw.slice(0, cutIndex),
    suffix: raw.slice(cutIndex),
  };
}

/**
 * Active portal id from runtime URL (/portal/:portalId).
 */
export function resolvePortalIdFromPath(pathname, fallback = 1) {
  const match = String(pathname || "").match(/^\/portal\/(\d+)/);
  if (!match) {
    const parsedFallback = Number(fallback);
    return Number.isFinite(parsedFallback) && parsedFallback > 0
      ? parsedFallback
      : 1;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Rewrites /portal/{oldId}/… and runtime-relevant /designer/tenant/{oldId}/… paths
 * to the active portal id. Query string and hash are preserved.
 */
export function rewritePortalScopedPath(path, portalId) {
  const raw = String(path || "").trim();
  if (!raw) {
    return raw;
  }

  const pid = Number(portalId);
  if (!Number.isFinite(pid) || pid <= 0) {
    return raw;
  }

  const { pathname, suffix } = splitPathWithSuffix(raw);
  if (!pathname) {
    return raw;
  }

  const portalMatch = pathname.match(PORTAL_SCOPED_PATH_RE);
  if (portalMatch) {
    const tail = portalMatch[2] || "";
    return `/portal/${pid}${tail}${suffix}`;
  }

  const designerMatch = pathname.match(DESIGNER_TENANT_PATH_RE);
  if (!designerMatch) {
    return raw;
  }

  const workspaceMatch = pathname.match(DESIGNER_WORKSPACE_PATH_RE);
  if (workspaceMatch) {
    const slug = decodeURIComponent(workspaceMatch[1]);
    const tabSlug = workspaceMatch[2]
      ? decodeURIComponent(workspaceMatch[2])
      : null;

    if (tabSlug) {
      return `/portal/${pid}/workspaces/${encodeURIComponent(slug)}/${encodeURIComponent(tabSlug)}${suffix}`;
    }

    return `/portal/${pid}/workspaces/${encodeURIComponent(slug)}${suffix}`;
  }

  const pageMatch = pathname.match(/\/page\/(\d+)/);
  if (pageMatch) {
    return `/portal/${pid}/page/${pageMatch[1]}${suffix}`;
  }

  const libraryMatch = pathname.match(/\/library\/(\d+)/);
  if (libraryMatch) {
    return `/portal/${pid}/library/${libraryMatch[1]}${suffix}`;
  }

  const objectTypeMatch = pathname.match(
    /\/object-types\/([^/]+)(?:\/([^/]+))?\/?$/,
  );
  if (objectTypeMatch) {
    const objectTypeRef = objectTypeMatch[1];
    const viewKey = objectTypeMatch[2];
    const base = `/portal/${pid}/object-types/${objectTypeRef}`;

    if (viewKey) {
      return `${base}/${viewKey}${suffix}`;
    }

    return `${base}${suffix}`;
  }

  return raw;
}

function rewriteNavigationPathFields(item, portalId) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const nextItem = { ...item };

  NAVIGATION_PATH_FIELDS.forEach((field) => {
    if (typeof nextItem[field] === "string" && nextItem[field].trim()) {
      nextItem[field] = rewritePortalScopedPath(nextItem[field], portalId);
    }
  });

  if (nextItem.meta && typeof nextItem.meta === "object") {
    const nextMeta = { ...nextItem.meta };
    ["targetPath", "url", "route", "path"].forEach((field) => {
      if (typeof nextMeta[field] === "string" && nextMeta[field].trim()) {
        nextMeta[field] = rewritePortalScopedPath(nextMeta[field], portalId);
      }
    });
    nextItem.meta = nextMeta;
  }

  return nextItem;
}

/**
 * Resolves sidebar click target for portal runtime navigation.
 * @returns {{ path: string } | { pageId: number | string } | null}
 */
export function resolvePortalNavigationClickTarget(item, portalId) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const objectTypePath = resolvePortalObjectNavigationPath(item, portalId);
  if (objectTypePath) {
    return { path: objectTypePath };
  }

  const rawPath = String(
    item.targetPath ||
      item.path ||
      item.route ||
      item.url ||
      item.meta?.targetPath ||
      item.meta?.path ||
      item.meta?.route ||
      item.meta?.url ||
      "",
  ).trim();

  if (rawPath) {
    return { path: rewritePortalScopedPath(rawPath, portalId) };
  }

  const pageId = item.pageId ?? item.page_id ?? item.meta?.page_id;
  if (pageId != null) {
    return { pageId };
  }

  return null;
}

export function isObjectTypeUuid(value) {
  return UUID_RE.test(String(value ?? "").trim());
}

export function isObjectTypeNavigationItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  return item.type === "object_type" || item.object_type_id != null;
}

/**
 * @param {number | string} portalId
 * @param {{ objectTypeId?: string, objectTypeKey?: string, viewKey?: string | null }} identifiers
 */
export function buildPortalObjectRoute(portalId, identifiers = {}) {
  const pid = Number(portalId) || 1;
  const key = String(identifiers.objectTypeKey ?? "").trim();
  const viewKey = String(identifiers.viewKey ?? "").trim();

  if (key && !isObjectTypeUuid(key)) {
    const base = `/portal/${pid}/object-types/${encodeURIComponent(key)}`;

    if (viewKey) {
      return `${base}/${encodeURIComponent(viewKey)}`;
    }

    return base;
  }

  const id = String(identifiers.objectTypeId ?? "").trim();

  if (id) {
    const base = `/portal/${pid}/object-types/${encodeURIComponent(id)}/data`;

    if (viewKey) {
      return `${base}?viewKey=${encodeURIComponent(viewKey)}`;
    }

    return base;
  }

  return null;
}

/**
 * Resolve navigation path for object_type menu item in portal runtime.
 * @returns {string | null}
 */
export function resolvePortalObjectNavigationPath(item, portalId) {
  if (!isObjectTypeNavigationItem(item)) {
    return null;
  }

  const raw = String(
    item.url || item.route || item.path || item.meta?.url || item.meta?.route || "",
  ).trim();

  if (raw) {
    const designerMatch = raw.match(DESIGNER_OBJECT_DATA_RE);

    if (designerMatch) {
      const objectTypeId = designerMatch[2];
      return buildPortalObjectRoute(portalId, { objectTypeId });
    }

    const portalMatch = raw.match(PORTAL_OBJECT_RE);

    if (portalMatch) {
      const normalized = raw.split("?")[0].split("#")[0].replace(/\/+$/, "");
      return normalized || raw;
    }
  }

  if (item.object_type_id) {
    return buildPortalObjectRoute(portalId, { objectTypeId: item.object_type_id });
  }

  if (item.object_type_key) {
    return buildPortalObjectRoute(portalId, { objectTypeKey: item.object_type_key });
  }

  return null;
}

/**
 * Rewrites object_type menu URLs for portal runtime sidebar.
 */
export function transformRuntimeNavigationForPortal(items, portalId) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    if (!item || typeof item !== "object") {
      return item;
    }

    const children = Array.isArray(item.children)
      ? transformRuntimeNavigationForPortal(item.children, portalId)
      : item.children;

    let nextItem = rewriteNavigationPathFields(item, portalId);

    if (isObjectTypeNavigationItem(nextItem)) {
      const portalPath = resolvePortalObjectNavigationPath(nextItem, portalId);

      if (portalPath) {
        nextItem = {
          ...nextItem,
          url: portalPath,
          route: portalPath,
          path: portalPath,
        };
      }
    }

    return {
      ...nextItem,
      children,
    };
  });
}

/**
 * @param {string} pathname
 * @param {string} [search]
 */
export function parsePortalObjectRoute(pathname, search = "") {
  const match = String(pathname || "").match(PORTAL_OBJECT_RE);

  if (!match) {
    return null;
  }

  const objectTypeRef = decodeURIComponent(match[2]);
  const thirdSegment = match[3] ? decodeURIComponent(match[3]) : null;

  let viewKey = null;
  let isDataRoute = false;

  if (thirdSegment === "data" && isObjectTypeUuid(objectTypeRef)) {
    isDataRoute = true;
  } else if (thirdSegment) {
    viewKey = thirdSegment;
  }

  const params = new URLSearchParams(String(search || ""));

  if (!viewKey) {
    const fromQuery = String(params.get("viewKey") || "").trim();

    if (fromQuery) {
      viewKey = fromQuery;
    }
  }

  return {
    portalId: Number(match[1]),
    objectTypeRef,
    viewKey,
    isDataRoute,
  };
}

/**
 * @param {string} pathname
 */
export function parsePortalObjectViewKeyFromPath(pathname, search = "") {
  return parsePortalObjectRoute(pathname, search)?.viewKey ?? null;
}

export function buildPortalObjectTabHref({
  portalId,
  objectTypeRef,
  objectTypeKey,
  viewKey,
}) {
  const ref = String(objectTypeRef ?? "").trim();
  const key = String(objectTypeKey ?? "").trim();

  if (key && !isObjectTypeUuid(key)) {
    return buildPortalObjectRoute(portalId, { objectTypeKey: key, viewKey });
  }

  if (isObjectTypeUuid(ref)) {
    return buildPortalObjectRoute(portalId, { objectTypeId: ref, viewKey });
  }

  return buildPortalObjectRoute(portalId, { objectTypeKey: key || ref, viewKey });
}
