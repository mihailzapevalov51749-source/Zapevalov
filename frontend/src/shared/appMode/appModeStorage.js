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

export function saveLastRuntimePath(fullPath) {
  const normalized = normalizeFullPath(fullPath);
  const pathname = resolvePathname(normalized);
  if (!pathname || pathname.startsWith("/designer") || isTechnicalRoute(normalized)) {
    return;
  }

  try {
    localStorage.setItem(LAST_RUNTIME_PATH_KEY, normalized);
  } catch {
    // ignore
  }
}

export function saveLastDesignerPath(fullPath) {
  const normalized = normalizeFullPath(fullPath);
  const pathname = resolvePathname(normalized);
  if (!pathname.startsWith("/designer") || isTechnicalRoute(normalized)) {
    return;
  }

  try {
    localStorage.setItem(LAST_DESIGNER_PATH_KEY, normalized);
  } catch {
    // ignore
  }
}

export function getLastRuntimePath() {
  try {
    return localStorage.getItem(LAST_RUNTIME_PATH_KEY) || DEFAULT_RUNTIME_PATH;
  } catch {
    return DEFAULT_RUNTIME_PATH;
  }
}

export function getDesignerPath(tenantId = 1) {
  return `/designer/tenant/${tenantId}/object-types`;
}

export function getLastDesignerPath(tenantId = 1) {
  const fallback = getDesignerPath(tenantId);
  try {
    return localStorage.getItem(LAST_DESIGNER_PATH_KEY) || fallback;
  } catch {
    return fallback;
  }
}
