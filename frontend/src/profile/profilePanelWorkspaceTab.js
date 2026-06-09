import { resolveWorkspaceTabDisplayTitle } from "../shared/workspaceTabs/resolveWorkspaceTabDisplayTitle.js";

export const PROFILE_PANEL_PAGE_TYPE = "profile_panel";
export const PROFILE_PANEL_ROUTE_PREFIX = "__panel__/profile";

function normalizeText(value) {
  return String(value || "").trim();
}

/**
 * @param {{ full_name?: string, fullName?: string, display_name?: string, displayName?: string } | null | undefined} user
 */
export function resolveProfileDisplayName(user) {
  return (
    normalizeText(
      user?.full_name ||
        user?.fullName ||
        user?.display_name ||
        user?.displayName,
    ) || "Личный кабинет"
  );
}

/**
 * @param {number | string | null | undefined} userId
 */
export function buildProfilePanelRoute(userId) {
  const normalizedUserId = Number(userId);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    return `${PROFILE_PANEL_ROUTE_PREFIX}/me`;
  }

  return `${PROFILE_PANEL_ROUTE_PREFIX}/${normalizedUserId}`;
}

/**
 * @param {{ page_type?: string, pageType?: string, context_json?: Record<string, unknown>, context?: Record<string, unknown> }} tab
 */
export function isProfilePanelWorkspaceTab(tab) {
  const pageType = normalizeText(tab?.page_type || tab?.pageType);
  if (pageType === PROFILE_PANEL_PAGE_TYPE) {
    return true;
  }

  const context = tab?.context_json || tab?.context;
  return context?.panelType === PROFILE_PANEL_PAGE_TYPE;
}

/**
 * @param {{ context_json?: Record<string, unknown>, context?: Record<string, unknown> }} tab
 */
export function readProfilePanelStateFromTab(tab) {
  const context = tab?.context_json || tab?.context || {};

  return {
    userId: context.userId ?? null,
    panelState:
      context.panelState && typeof context.panelState === "object"
        ? context.panelState
        : {},
  };
}

/**
 * @param {{
 *   user: { id?: number | string, full_name?: string, fullName?: string },
 *   panelState?: Record<string, unknown>,
 *   sortOrder?: number,
 *   tenantId?: number | null,
 * }} input
 */
export function buildProfilePanelWorkspaceTabPayload({
  user,
  panelState = {},
  sortOrder = 100,
  tenantId = null,
}) {
  const userName = resolveProfileDisplayName(user);
  const userId = Number(user?.id);
  const route = buildProfilePanelRoute(userId);
  const context = {
    panelType: PROFILE_PANEL_PAGE_TYPE,
    userId: Number.isFinite(userId) && userId > 0 ? userId : null,
    userName,
    panelState,
  };

  const payloadBase = {
    title: `Профиль: ${userName}`,
    route,
    module_key: "settings",
    page_type: PROFILE_PANEL_PAGE_TYPE,
    tenant_id: tenantId,
    icon_key: "user",
    context_json: context,
    pageType: PROFILE_PANEL_PAGE_TYPE,
    context,
  };

  return {
    title: resolveWorkspaceTabDisplayTitle(payloadBase),
    route,
    module_key: "settings",
    page_type: PROFILE_PANEL_PAGE_TYPE,
    tenant_id: tenantId,
    icon_key: "user",
    context_json: context,
    is_pinned: false,
    is_minimized: true,
    sort_order: sortOrder,
  };
}
