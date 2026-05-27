const UNIFIED_SHELL_PILOT_FLAG_KEY = "yasnopro:feature:unified-shell-pilot";
const APP_SIDEBAR_RENDERER_FLAG_KEY = "yasnopro:feature:app-sidebar-renderer";
const APP_HEADER_RENDERER_FLAG_KEY = "yasnopro:feature:app-header-renderer";

function readBooleanFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readUnifiedShellPilotFlag(): boolean {
  return readBooleanFlag(UNIFIED_SHELL_PILOT_FLAG_KEY);
}

export const SHELL_FEATURE_FLAGS = {
  unifiedShellPilot: readUnifiedShellPilotFlag(),
  appSidebarRenderer:
    readUnifiedShellPilotFlag() || readBooleanFlag(APP_SIDEBAR_RENDERER_FLAG_KEY),
  appHeaderRenderer:
    readUnifiedShellPilotFlag() || readBooleanFlag(APP_HEADER_RENDERER_FLAG_KEY),
} as const;
