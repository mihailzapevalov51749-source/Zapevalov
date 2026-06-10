import { resolveOfficeToStudioPath } from "../../../shared/appMode/appModeNavigation.js";

export const CONTROL_PLANE_BASE = "/control-plane";

export function resolveControlPlaneReturnToStudioPath(tenantIdFallback = 1) {
  return resolveOfficeToStudioPath(CONTROL_PLANE_BASE, tenantIdFallback);
}

export function buildControlPlaneRoute(segment = "") {
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  return normalizedSegment
    ? `${CONTROL_PLANE_BASE}/${normalizedSegment}`
    : CONTROL_PLANE_BASE;
}

export function buildControlPlaneClientsPath(segment = "") {
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  return buildControlPlaneRoute(
    normalizedSegment ? `clients/${normalizedSegment}` : "clients",
  );
}

export function isControlPlanePath(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  return (
    normalized === CONTROL_PLANE_BASE
    || normalized.startsWith(`${CONTROL_PLANE_BASE}/`)
  );
}

function normalizeLegacySuffix(suffix = "") {
  return String(suffix || "").replace(/^\//, "");
}

export function isPlatformAdminLegacySuffix(suffix = "") {
  const path = normalizeLegacySuffix(suffix);

  if (!path) {
    return false;
  }

  if (path === "clients" || path.startsWith("clients/")) {
    return true;
  }

  if (path === "tenants" || path.startsWith("tenants/")) {
    return true;
  }

  if (path === "control-plane/tenants" || path.startsWith("control-plane/tenants/")) {
    return true;
  }

  return false;
}

export function isPlatformAdminLegacyPath(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");

  if (normalized === "/admin") {
    return true;
  }

  if (normalized.startsWith("/admin/")) {
    return isPlatformAdminLegacySuffix(normalized.replace(/^\/admin\//, ""));
  }

  const studioMatch = normalized.match(
    /^\/designer\/tenant\/\d+\/administration(\/.*)?$/,
  );
  if (studioMatch) {
    return isPlatformAdminLegacySuffix(studioMatch[1] || "");
  }

  return false;
}

function mapPlatformSuffixToControlPlane(suffix = "") {
  const path = normalizeLegacySuffix(suffix);

  if (!path) {
    return CONTROL_PLANE_BASE;
  }

  if (path === "control-plane/tenants") {
    return buildControlPlaneClientsPath("registry");
  }

  const legacyRegistryDetail = path.match(/^control-plane\/tenants\/(\d+)$/);
  if (legacyRegistryDetail) {
    return buildControlPlaneClientsPath(`registry/${legacyRegistryDetail[1]}`);
  }

  if (path === "tenants") {
    return buildControlPlaneClientsPath("companies");
  }

  const legacyCompanyDetail = path.match(/^tenants\/(\d+)$/);
  if (legacyCompanyDetail) {
    return buildControlPlaneClientsPath(`companies/${legacyCompanyDetail[1]}`);
  }

  if (path === "users") {
    return buildControlPlaneRoute("platform-users");
  }

  if (path === "roles") {
    return buildControlPlaneRoute("platform-roles");
  }

  if (path === "system-settings" || path === "system") {
    return buildControlPlaneRoute("settings");
  }

  if (
    path === "clients"
    || path.startsWith("clients/")
    || path === "modules"
    || path === "integrations"
    || path === "audit-log"
    || path === "audit"
  ) {
    return buildControlPlaneRoute(path === "audit" ? "audit-log" : path);
  }

  return buildControlPlaneRoute(path);
}

export function mapLegacyAdministrationPathToControlPlane(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");

  if (normalized === "/admin") {
    return CONTROL_PLANE_BASE;
  }

  if (normalized.startsWith("/admin/")) {
    return mapPlatformSuffixToControlPlane(normalized.replace(/^\/admin\//, ""));
  }

  const studioMatch = normalized.match(
    /^\/designer\/tenant\/\d+\/administration(\/.*)?$/,
  );
  if (studioMatch && isPlatformAdminLegacySuffix(studioMatch[1] || "")) {
    return mapPlatformSuffixToControlPlane(studioMatch[1] || "");
  }

  return CONTROL_PLANE_BASE;
}

export function resolveControlPlaneSectionKey(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");

  if (/\/clients\/registry(?:\/|$)/.test(normalized)) {
    return "clients-registry";
  }
  if (/\/clients\/companies(?:\/|$)/.test(normalized)) {
    return "clients-companies";
  }
  if (/\/clients\/create(?:\/|$)/.test(normalized)) {
    return "clients-create";
  }
  if (/\/clients\/clone(?:\/|$)/.test(normalized)) {
    return "clients-clone";
  }
  if (/\/clients(?:\/|$)/.test(normalized)) {
    return "clients";
  }
  if (/\/templates\/versions(?:\/|$)/.test(normalized)) {
    return "templates-versions";
  }
  if (/\/templates\/updates(?:\/|$)/.test(normalized)) {
    return "templates-updates";
  }
  if (/\/templates\/publish(?:\/|$)/.test(normalized)) {
    return "templates-publish";
  }
  if (/\/platform\/licenses(?:\/|$)/.test(normalized)) {
    return "platform-licenses";
  }
  if (/\/platform\/policies(?:\/|$)/.test(normalized)) {
    return "platform-policies";
  }
  if (/\/platform\/monitoring(?:\/|$)/.test(normalized)) {
    return "platform-monitoring";
  }
  if (/\/platform\/backup(?:\/|$)/.test(normalized)) {
    return "platform-backup";
  }
  if (/\/platform-users(?:\/|$)/.test(normalized)) {
    return "platform-users";
  }
  if (/\/platform-roles(?:\/|$)/.test(normalized)) {
    return "platform-roles";
  }
  if (/\/modules(?:\/|$)/.test(normalized)) {
    return "modules";
  }
  if (/\/settings(?:\/|$)/.test(normalized)) {
    return "settings";
  }
  if (/\/integrations(?:\/|$)/.test(normalized)) {
    return "integrations";
  }
  if (/\/audit-log(?:\/|$)/.test(normalized)) {
    return "audit-log";
  }

  return "overview";
}
