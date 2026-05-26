const LAST_RUNTIME_PATH_KEY = "yasnopro-last-runtime-path";
const DEFAULT_RUNTIME_PATH = "/portal/1/page/1";

export function saveLastRuntimePath(pathname) {
  if (!pathname || pathname.startsWith("/designer")) {
    return;
  }

  try {
    localStorage.setItem(LAST_RUNTIME_PATH_KEY, pathname);
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
