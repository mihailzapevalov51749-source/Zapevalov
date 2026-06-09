export const SHELL_LAYOUT_MODE = {
  SHELL: "shell",
  EMBEDDED: "embedded",
};

export function isDesignerTenantRoute(pathname) {
  return /^\/designer\/tenant\/\d+\//.test(String(pathname || "").trim());
}

export function isDesignerShellEmbeddedPortalRoute(pathname) {
  return /^\/designer\/tenant\/\d+\/(?:administration(?:\/.*)?|page\/\d+)/.test(
    String(pathname || "").trim(),
  );
}

export function resolvePortalLayoutMode(pathname, explicitMode) {
  const normalizedMode = String(explicitMode || "").trim();

  if (
    normalizedMode === SHELL_LAYOUT_MODE.SHELL ||
    normalizedMode === SHELL_LAYOUT_MODE.EMBEDDED
  ) {
    return normalizedMode;
  }

  return isDesignerTenantRoute(pathname)
    ? SHELL_LAYOUT_MODE.EMBEDDED
    : SHELL_LAYOUT_MODE.SHELL;
}

export function shouldCreateTopLevelShell(layoutMode) {
  return layoutMode !== SHELL_LAYOUT_MODE.EMBEDDED;
}
