const LAST_RUNTIME_PATH_KEY = "yasnopro-last-runtime-path";
const LAST_DESIGNER_PATH_KEY = "yasnopro-last-designer-path";
const DEFAULT_RUNTIME_PATH = "/portal/1/page/1";
const TECHNICAL_ROUTE_PREFIXES = ["/login", "/auth", "/error", "/not-found"];

function normalizeFullPath(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function resolvePathname(fullPath) {
  const normalized = normalizeFullPath(fullPath);
  if (!normalized) return "";
  return normalized.split("#")[0].split("?")[0];
}

function isTechnicalRoute(fullPath) {
  const pathname = resolvePathname(fullPath);
  if (!pathname) return true;
  return TECHNICAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function writeStoredPath(storageKey, normalized) {
  try {
    sessionStorage.setItem(storageKey, normalized);
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(storageKey, normalized);
  } catch {
    // ignore
  }
}

function readStoredPath(storageKey) {
  try {
    return sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function saveLastRuntimePath(fullPath) {
  const normalized = normalizeFullPath(fullPath);
  const pathname = resolvePathname(normalized);
  if (
    !pathname
    || pathname.startsWith("/designer")
    || pathname === "/yasii"
    || pathname.startsWith("/yasii/")
    || isTechnicalRoute(normalized)
  ) {
    return;
  }

  writeStoredPath(LAST_RUNTIME_PATH_KEY, normalized);
}

export function saveLastDesignerPath(fullPath) {
  const normalized = normalizeFullPath(fullPath);
  const pathname = resolvePathname(normalized);
  if (!pathname.startsWith("/designer") || isTechnicalRoute(normalized)) {
    return;
  }

  writeStoredPath(LAST_DESIGNER_PATH_KEY, normalized);
}

/** Raw stored runtime path for current tab (sessionStorage) with localStorage fallback. */
export function getStoredRuntimePath() {
  return readStoredPath(LAST_RUNTIME_PATH_KEY);
}

/** Raw stored designer path for current tab (sessionStorage) with localStorage fallback. */
export function getStoredDesignerPath() {
  return readStoredPath(LAST_DESIGNER_PATH_KEY);
}

export function getDesignerPath(tenantId = 1) {
  return `/designer/tenant/${tenantId}/object-types`;
}

/** @deprecated Prefer resolveStudioToOfficePath / resolveRuntimeFallbackPath. */
export function getLastRuntimePath() {
  return getStoredRuntimePath() || DEFAULT_RUNTIME_PATH;
}

/** @deprecated Prefer resolveOfficeToStudioPath / buildDefaultDesignerPath. */
export function getLastDesignerPath(tenantId = 1) {
  const fallback = getDesignerPath(tenantId);
  return getStoredDesignerPath() || fallback;
}
