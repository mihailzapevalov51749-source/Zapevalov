import { buildTenantAdminPath } from "../admin/config/tenantAdminPaths.js";
import { buildControlPlanePlatformProfilePath } from "../controlPlane/config/controlPlanePaths.js";
import {
  PROFILE_MODE_PLATFORM,
  isProfileModePlatform,
} from "./profileMode.js";

export const PROFILE_WORKSPACE_DEFAULT_TAB_SLUG = "general";

const PLATFORM_OWNER_TAB_SLUG = "platform-owner";
const TENANT_OWNER_TAB_SLUG = "company-owner";
const TENANT_LICENSE_TAB_SLUG = "license";

function buildPlatformTab(slug, label) {
  return {
    id: slug,
    slug,
    label,
    route: buildControlPlanePlatformProfilePath(slug),
    enabled: true,
  };
}

function buildTenantStudioTab(tenantId, slug, label) {
  return {
    id: slug,
    slug,
    label,
    route: buildTenantAdminPath(tenantId, `settings/${slug}`),
    enabled: true,
  };
}

export const PLATFORM_PROFILE_WORKSPACE_TABS = [
  buildPlatformTab("general", "Общие настройки"),
  buildPlatformTab("branding", "Брендинг"),
  buildPlatformTab(PLATFORM_OWNER_TAB_SLUG, "Владелец платформы"),
  buildPlatformTab("notifications", "Уведомления"),
  buildPlatformTab("limits", "Лимиты и квоты"),
  buildPlatformTab("backup", "Резервное копирование"),
  buildPlatformTab("security", "Безопасность"),
  buildPlatformTab("behavior", "Поведение системы"),
];

export function buildTenantProfileWorkspaceTabs(tenantId) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {
    return [];
  }

  return [
    buildTenantStudioTab(normalizedTenantId, "general", "Общие настройки"),
    buildTenantStudioTab(normalizedTenantId, "branding", "Брендинг"),
    buildTenantStudioTab(normalizedTenantId, TENANT_OWNER_TAB_SLUG, "Владелец компании"),
    buildTenantStudioTab(normalizedTenantId, "notifications", "Уведомления"),
    buildTenantStudioTab(normalizedTenantId, "limits", "Лимиты и квоты"),
    buildTenantStudioTab(normalizedTenantId, "backup", "Резервное копирование"),
    buildTenantStudioTab(normalizedTenantId, "security", "Безопасность"),
    buildTenantStudioTab(normalizedTenantId, "behavior", "Поведение системы"),
  ];
}

export function getProfileWorkspaceTabs(mode, portalId = null) {
  if (isProfileModePlatform(mode)) {
    return PLATFORM_PROFILE_WORKSPACE_TABS;
  }
  return buildTenantProfileWorkspaceTabs(portalId);
}

export function resolveProfileOwnerTabSlug(mode) {
  return isProfileModePlatform(mode) ? PLATFORM_OWNER_TAB_SLUG : TENANT_OWNER_TAB_SLUG;
}

export function resolveProfileWorkspaceTab(mode, slug, portalId = null) {
  const normalized = String(slug || "").trim() || PROFILE_WORKSPACE_DEFAULT_TAB_SLUG;
  const tabs = getProfileWorkspaceTabs(mode, portalId);
  return (
    tabs.find((tab) => tab.slug === normalized && tab.enabled)
    ?? tabs.find((tab) => tab.slug === PROFILE_WORKSPACE_DEFAULT_TAB_SLUG && tab.enabled)
    ?? tabs[0]
    ?? null
  );
}

export function buildProfileWorkspaceRootPath(mode, portalId = null) {
  if (isProfileModePlatform(mode)) {
    return buildControlPlanePlatformProfilePath(PROFILE_WORKSPACE_DEFAULT_TAB_SLUG);
  }
  return buildTenantAdminPath(portalId, `settings/${PROFILE_WORKSPACE_DEFAULT_TAB_SLUG}`);
}

export {
  PLATFORM_OWNER_TAB_SLUG,
  TENANT_OWNER_TAB_SLUG,
  TENANT_LICENSE_TAB_SLUG,
};
