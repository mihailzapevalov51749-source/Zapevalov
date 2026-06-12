import { resolveRuntimeFallbackPath } from "../appMode/appModeNavigation.js";
import { peekTenantRuntimeEntryPath } from "../tenantContext/resolveTenantRuntimeEntryPath.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function extractPathname(route) {
  return normalizeText(route).split(/[?#]/)[0];
}

export function resolveFallbackRoute(tenantId) {
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  return resolveRuntimeFallbackPath(normalizedTenantId);
}

function routesDiffer(leftRoute, rightRoute) {
  return extractPathname(leftRoute) !== extractPathname(rightRoute);
}

function resolvePortalTenantHomePath(portalId) {
  const normalizedPortalId = Number(portalId);
  if (!Number.isFinite(normalizedPortalId) || normalizedPortalId <= 0) {
    return null;
  }

  return peekTenantRuntimeEntryPath(normalizedPortalId);
}

function resolveSafeParentRoute(currentRoute, tenantId) {
  const pathname = extractPathname(currentRoute);
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;

  const studioSectionMatch = pathname.match(
    /^\/designer\/tenant\/(\d+)\/(relations|views|navigation|processes|publishing)\/?$/,
  );
  if (studioSectionMatch) {
    return `/designer/tenant/${studioSectionMatch[1]}/object-types`;
  }

  const studioPageMatch = pathname.match(/^\/designer\/tenant\/(\d+)\/page\/\d+/);
  if (studioPageMatch) {
    return `/designer/tenant/${studioPageMatch[1]}/pages`;
  }

  const studioAdminNestedMatch = pathname.match(
    /^\/designer\/tenant\/(\d+)\/administration\/.+/,
  );
  if (studioAdminNestedMatch) {
    return `/designer/tenant/${studioAdminNestedMatch[1]}/administration`;
  }

  const portalPageMatch = pathname.match(/^\/portal\/(\d+)\/page\/\d+/);
  if (portalPageMatch) {
    return (
      resolvePortalTenantHomePath(portalPageMatch[1]) ||
      resolveFallbackRoute(normalizedTenantId)
    );
  }

  const portalWorkspaceMatch = pathname.match(/^\/portal\/(\d+)\/workspaces\/[^/]+/);
  if (portalWorkspaceMatch) {
    return (
      resolvePortalTenantHomePath(portalWorkspaceMatch[1]) ||
      resolveFallbackRoute(normalizedTenantId)
    );
  }

  return resolveFallbackRoute(normalizedTenantId);
}

/**
 * @param {{
 *   currentRoute?: string,
 *   contractFallbackRoute?: string | null,
 *   tenantId?: number | null,
 *   tabOpenRoute?: string | null,
 * }} input
 */
export function resolveMinimizeNavigateRoute({
  currentRoute,
  contractFallbackRoute,
  tenantId,
  tabOpenRoute,
} = {}) {
  const normalizedCurrentRoute = normalizeText(currentRoute);
  const explicitFallback = normalizeText(contractFallbackRoute);
  const safeParentRoute = normalizedCurrentRoute
    ? resolveSafeParentRoute(normalizedCurrentRoute, tenantId)
    : "";
  const genericFallback = resolveFallbackRoute(tenantId);

  const candidates = [explicitFallback, safeParentRoute, genericFallback].filter(Boolean);

  for (const candidate of candidates) {
    if (routesDiffer(candidate, normalizedCurrentRoute)) {
      return candidate;
    }
  }

  return null;
}

/**
 * @param {{
 *   tabCreated?: boolean,
 *   tabOpenRoute?: string | null,
 *   navigateRoute?: string | null,
 * }} input
 */
export function shouldWarnAboutMinimizeNavigateRoute({
  tabCreated = false,
  tabOpenRoute,
  navigateRoute,
} = {}) {
  if (!tabCreated) {
    return true;
  }

  if (normalizeText(tabOpenRoute)) {
    return false;
  }

  return !normalizeText(navigateRoute);
}
