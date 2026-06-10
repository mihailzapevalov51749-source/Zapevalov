export const UI_STORAGE_PREFIX = "ui";

/** @deprecated Use tenant-scoped keys via uiPreferencesStorage — migration layer only. */
export const LEGACY_UI_KEYS = {
  SIDEBAR_COLLAPSED: "yasnopro-sidebar-collapsed",
  LEFT_MENU_SCALE: "leftMenuScale",
  MENU_COLLAPSED: "yasnopro-menu-collapsed",
  SYSTEM_MENU_SETTINGS: "systemMenuSettings",
  LAST_RUNTIME_PATH: "yasnopro-last-runtime-path",
  LAST_DESIGNER_PATH: "yasnopro-last-designer-path",
  MODAL_PREFERENCES: "yasnopro-modal-ui-preferences-v1",
  PLAN_TREE_WIDTH_PREFIX: "yasnopro.plan.treePanelWidth",
  YASII_PINNED: "yasnopro-yasii-pinned",
  YASII_PRE_WORKSPACE_PATH: "yasnopro-yasii-pre-workspace-path",
};

export const UI_PREF_KEYS = {
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
  LEFT_MENU_SCALE: "leftMenuScale",
  MENU_COLLAPSED: "menuCollapsed",
  SYSTEM_MENU_SETTINGS: "systemMenuSettings",
  LAST_RUNTIME_PATH: "lastRuntimePath",
  LAST_DESIGNER_PATH: "lastDesignerPath",
  MODAL_PREFERENCES: "modalPreferences",
  YASII_PINNED: "yasiiPinned",
  YASII_PRE_WORKSPACE_PATH: "yasiiPreWorkspacePath",
};

export const YASII_ACTIVE_TENANT_SESSION_KEY = "ui:yasii:activeTenantId";

export function buildPlanTreeWidthPrefKey(scopeKey = "default") {
  const scope = String(scopeKey || "default").trim() || "default";
  return `planTreeWidth:${scope}`;
}

export function buildLegacyPlanTreeWidthKey(scopeKey = "default") {
  const scope = String(scopeKey || "default").trim() || "default";
  return `${LEGACY_UI_KEYS.PLAN_TREE_WIDTH_PREFIX}:${scope}`;
}

export function normalizeTenantId(tenantId) {
  const normalized = Number(tenantId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }
  return normalized;
}

export function buildTenantUiStorageKey(tenantId, key) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId || !key) {
    return null;
  }
  return `${UI_STORAGE_PREFIX}:tenant:${normalizedTenantId}:${key}`;
}

export function buildWorkspaceUiStorageKey(tenantId, workspaceSlug, key) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const slug = String(workspaceSlug || "").trim();
  if (!normalizedTenantId || !slug || !key) {
    return null;
  }
  return `${UI_STORAGE_PREFIX}:tenant:${normalizedTenantId}:ws:${slug}:${key}`;
}

export function buildObjectViewUiStorageKey(
  tenantId,
  objectTypeKey,
  viewKey,
  key,
) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const objectKey = String(objectTypeKey || "").trim();
  const view = String(viewKey || "").trim();
  if (!normalizedTenantId || !objectKey || !view || !key) {
    return null;
  }
  return `${UI_STORAGE_PREFIX}:tenant:${normalizedTenantId}:ot:${objectKey}:${view}:${key}`;
}

export function buildGlobalUiStorageKey(key) {
  if (!key) {
    return null;
  }
  return `${UI_STORAGE_PREFIX}:global:${key}`;
}

export const PLATFORM_UI_SCOPES = {
  CONTROL_PLANE: "controlPlane",
};

export const PLATFORM_UI_PREF_KEYS = {
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
  LEFT_MENU_SCALE: "leftMenuScale",
  ACTIVE_SECTION: "activeSection",
  MENU_STATE: "menuState",
  SYSTEM_MENU_SETTINGS: "systemMenuSettings",
  /** @deprecated Read fallback only — use MENU_STATE */
  MENU_COLLAPSED: "menuCollapsed",
};

export function buildPlatformUiStorageKey(scope, key) {
  const normalizedScope = String(scope || "").trim();
  const normalizedKey = String(key || "").trim();
  if (!normalizedScope || !normalizedKey) {
    return null;
  }
  return `${UI_STORAGE_PREFIX}:platform:${normalizedScope}:${normalizedKey}`;
}

export function parseTenantIdFromUiStorageKey(storageKey) {
  const match = String(storageKey || "").match(
    /^ui:tenant:(\d+)(?::|$)/,
  );
  if (!match) {
    return null;
  }
  return normalizeTenantId(match[1]);
}
