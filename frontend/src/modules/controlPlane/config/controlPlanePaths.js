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

export function buildControlPlaneCompaniesPath(segment = "") {
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  return buildControlPlaneRoute(
    normalizedSegment ? `companies/${normalizedSegment}` : "companies",
  );
}

export function buildControlPlaneUsersRolesPath(segment = "") {
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  return buildControlPlaneRoute(
    normalizedSegment ? `users-roles/${normalizedSegment}` : "users-roles",
  );
}

export function buildControlPlanePlatformProfilePath(segment = "") {
  const normalizedSegment = String(segment || "").replace(/^\//, "");
  return buildControlPlaneRoute(
    normalizedSegment ? `platform-profile/${normalizedSegment}` : "platform-profile",
  );
}

export function mapLegacyClientsPathToCompaniesWorkspace(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");

  const companiesDetailMatch = normalized.match(
    /^\/control-plane\/clients\/companies\/(\d+)$/,
  );
  if (companiesDetailMatch) {
    return buildControlPlaneCompaniesPath(`clients/${companiesDetailMatch[1]}`);
  }

  const registryDetailMatch = normalized.match(
    /^\/control-plane\/clients\/registry\/(\d+)$/,
  );
  if (registryDetailMatch) {
    return buildControlPlaneCompaniesPath(`clients/${registryDetailMatch[1]}`);
  }

  if (
    /^\/control-plane\/clients(?:\/|$)/.test(normalized)
    || /^\/control-plane\/clients\/(?:companies|registry|create|clone)(?:\/|$)/.test(normalized)
  ) {
    return buildControlPlaneCompaniesPath("clients");
  }

  return null;
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
    return buildControlPlaneCompaniesPath("clients");
  }

  const legacyRegistryDetail = path.match(/^control-plane\/tenants\/(\d+)$/);
  if (legacyRegistryDetail) {
    return buildControlPlaneCompaniesPath(`clients/${legacyRegistryDetail[1]}`);
  }

  if (path === "tenants") {
    return buildControlPlaneCompaniesPath("clients");
  }

  const legacyCompanyDetail = path.match(/^tenants\/(\d+)$/);
  if (legacyCompanyDetail) {
    return buildControlPlaneCompaniesPath(`clients/${legacyCompanyDetail[1]}`);
  }

  if (path === "users") {
    return buildControlPlaneUsersRolesPath("users");
  }

  if (path === "roles") {
    return buildControlPlaneUsersRolesPath("roles");
  }

  if (path === "platform-users") {
    return buildControlPlaneUsersRolesPath("users");
  }

  if (path === "platform-roles") {
    return buildControlPlaneUsersRolesPath("roles");
  }

  if (path === "system-settings" || path === "system") {
    return buildControlPlaneRoute("settings");
  }

  if (path === "clients") {
    return buildControlPlaneCompaniesPath("clients");
  }

  const clientsCompanyDetail = path.match(/^clients\/companies\/(\d+)$/);
  if (clientsCompanyDetail) {
    return buildControlPlaneCompaniesPath(`clients/${clientsCompanyDetail[1]}`);
  }

  const clientsRegistryDetail = path.match(/^clients\/registry\/(\d+)$/);
  if (clientsRegistryDetail) {
    return buildControlPlaneCompaniesPath(`clients/${clientsRegistryDetail[1]}`);
  }

  if (
    path === "clients/companies"
    || path === "clients/registry"
    || path === "clients/create"
    || path === "clients/clone"
    || path.startsWith("clients/")
  ) {
    return buildControlPlaneCompaniesPath("clients");
  }

  if (path === "modules" || path === "integrations" || path === "audit-log" || path === "audit") {
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

  if (/\/companies\/clients(?:\/|$)/.test(normalized)) {
    return "companies-clients";
  }
  if (/\/companies(?:\/|$)/.test(normalized)) {
    return "companies";
  }
  if (/\/clients\/registry(?:\/|$)/.test(normalized)) {
    return "companies-clients";
  }
  if (/\/clients\/companies(?:\/|$)/.test(normalized)) {
    return "companies-clients";
  }
  if (/\/clients\/create(?:\/|$)/.test(normalized)) {
    return "companies-clients";
  }
  if (/\/clients\/clone(?:\/|$)/.test(normalized)) {
    return "companies-clients";
  }
  if (/\/clients(?:\/|$)/.test(normalized)) {
    return "companies-clients";
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
  if (/\/platform-profile\/general(?:\/|$)/.test(normalized)) {
    return "platform-profile-general";
  }
  if (/\/platform-profile\/home(?:\/|$)/.test(normalized)) {
    return "platform-profile-general";
  }
  if (/\/platform-profile\/branding(?:\/|$)/.test(normalized)) {
    return "platform-profile-branding";
  }
  if (/\/platform-profile\/platform-owner(?:\/|$)/.test(normalized)) {
    return "platform-profile-platform-owner";
  }
  if (/\/platform-profile\/localization(?:\/|$)/.test(normalized)) {
    return "platform-profile-localization";
  }
  if (/\/platform-profile\/notifications(?:\/|$)/.test(normalized)) {
    return "platform-profile-notifications";
  }
  if (/\/platform-profile\/limits(?:\/|$)/.test(normalized)) {
    return "platform-profile-limits";
  }
  if (/\/platform-profile\/backup(?:\/|$)/.test(normalized)) {
    return "platform-profile-backup";
  }
  if (/\/platform-profile\/security(?:\/|$)/.test(normalized)) {
    return "platform-profile-security";
  }
  if (/\/platform-profile\/behavior(?:\/|$)/.test(normalized)) {
    return "platform-profile-behavior";
  }
  if (/\/platform-profile(?:\/|$)/.test(normalized)) {
    return "platform-profile-general";
  }
  if (/\/users-roles\/users(?:\/|$)/.test(normalized)) {
    return "users-roles-users";
  }
  if (/\/users-roles\/roles(?:\/|$)/.test(normalized)) {
    return "users-roles-roles";
  }
  if (/\/users-roles(?:\/|$)/.test(normalized)) {
    return "users-roles-users";
  }
  if (/\/platform-users(?:\/|$)/.test(normalized)) {
    return "users-roles-users";
  }
  if (/\/platform-roles(?:\/|$)/.test(normalized)) {
    return "users-roles-roles";
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
