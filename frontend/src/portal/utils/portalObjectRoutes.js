/**
 * Portal Object Route helpers — Phase 9.2.
 * Resolves object_type menu items to portal runtime URLs (never designer data URLs).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DESIGNER_OBJECT_DATA_RE =
  /^\/designer\/tenant\/(\d+)\/object-types\/([^/]+)\/data\/?$/i;

const PORTAL_OBJECT_RE =
  /^\/portal\/(\d+)\/object-types\/([^/?#]+)(?:\/data)?\/?$/i;

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
 * @param {{ objectTypeId?: string, objectTypeKey?: string }} identifiers
 */
export function buildPortalObjectRoute(portalId, identifiers = {}) {
  const pid = Number(portalId) || 1;
  const key = String(identifiers.objectTypeKey ?? "").trim();

  if (key && !isObjectTypeUuid(key)) {
    return `/portal/${pid}/object-types/${encodeURIComponent(key)}`;
  }

  const id = String(identifiers.objectTypeId ?? "").trim();
  if (id) {
    return `/portal/${pid}/object-types/${encodeURIComponent(id)}/data`;
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

    if (!isObjectTypeNavigationItem(item)) {
      return { ...item, children };
    }

    const portalPath = resolvePortalObjectNavigationPath(item, portalId);
    if (!portalPath) {
      return { ...item, children };
    }

    return {
      ...item,
      url: portalPath,
      route: portalPath,
      path: portalPath,
      children,
    };
  });
}

export function parsePortalObjectRoute(pathname) {
  const match = String(pathname || "").match(PORTAL_OBJECT_RE);
  if (!match) {
    return null;
  }

  return {
    portalId: Number(match[1]),
    objectTypeRef: decodeURIComponent(match[2]),
  };
}
