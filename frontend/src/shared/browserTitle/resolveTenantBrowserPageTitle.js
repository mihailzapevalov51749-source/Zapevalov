import { TENANT_ADMIN_PAGE_META } from "../../modules/admin/routes/resolveTenantAdminPage.jsx";
import { buildTenantProfileWorkspaceTabs } from "../../modules/profileWorkspace/profileWorkspaceConfig.js";
import {
  buildDesignerBreadcrumbs,
  resolveDesignerSectionByPath,
  resolveDesignerTenantIdFromPath,
} from "../shell/designer/designerNavigationResolver.js";

function normalizePath(pathname = "") {
  return String(pathname || "").trim().replace(/\/+$/, "") || "/";
}

function resolveProfileSettingsTabTitle(pathname, tenantId) {
  const match = normalizePath(pathname).match(
    /\/designer\/tenant\/(\d+)\/administration\/settings\/([^/]+)/,
  );
  if (!match) {
    return null;
  }

  const resolvedTenantId = Number(match[1]) || tenantId;
  const slug = String(match[2] || "").trim();
  const tab = buildTenantProfileWorkspaceTabs(resolvedTenantId).find(
    (item) => item.slug === slug,
  );
  return tab?.label || null;
}

function resolveAdministrationPageTitle(pathname, tenantId) {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/\/designer\/tenant\/(\d+)\/administration(?:\/(.*))?$/);
  if (!match) {
    return null;
  }

  const suffix = String(match[2] || "").trim();
  if (!suffix) {
    return "Администрирование";
  }

  const settingsTabTitle = resolveProfileSettingsTabTitle(pathname, tenantId);
  if (settingsTabTitle) {
    return settingsTabTitle;
  }

  const section = suffix.split("/")[0];
  return TENANT_ADMIN_PAGE_META[section]?.title || null;
}

function resolveDesignerPageTitle(pathname) {
  const normalized = normalizePath(pathname);
  if (!normalized.startsWith("/designer/")) {
    return null;
  }

  const tenantId = resolveDesignerTenantIdFromPath(normalized);
  const administrationTitle = resolveAdministrationPageTitle(normalized, tenantId);
  if (administrationTitle) {
    return administrationTitle;
  }

  if (/\/designer\/tenant\/\d+\/modules(?:\/|$)/.test(normalized)) {
    return "Модули";
  }

  const breadcrumbs = buildDesignerBreadcrumbs(normalized, { tenantId });
  const activeCrumb = [...breadcrumbs].reverse().find((item) => item?.label);
  if (activeCrumb?.label) {
    return String(activeCrumb.label).trim();
  }

  const section = resolveDesignerSectionByPath(normalized, tenantId);
  if (section?.label) {
    return section.label;
  }

  return "Студия";
}

function resolvePortalPageTitle(pathname) {
  const normalized = normalizePath(pathname);
  if (!normalized.startsWith("/portal/")) {
    return null;
  }

  if (/\/portal\/\d+\/administration/.test(normalized)) {
    const tenantId = Number(normalized.match(/\/portal\/(\d+)/)?.[1]) || 1;
    const designerEquivalent = normalized.replace(/^\/portal\/\d+/, `/designer/tenant/${tenantId}`);
    return resolveAdministrationPageTitle(designerEquivalent, tenantId) || "Администрирование";
  }

  if (/\/portal\/\d+\/object-types/.test(normalized)) {
    return "Объекты";
  }

  if (/\/portal\/\d+\/library/.test(normalized)) {
    return "Библиотека";
  }

  if (/\/portal\/\d+\/workspace/.test(normalized)) {
    return "Рабочее пространство";
  }

  if (/\/portal\/\d+\/yasii/.test(normalized)) {
    return "Ассистент";
  }

  if (/\/portal\/\d+\/page\//.test(normalized)) {
    return null;
  }

  if (/\/portal\/\d+(\/|$)/.test(normalized)) {
    return "Главная";
  }

  return null;
}

/**
 * Resolves tenant page title from URL for browser tab (static routes).
 * Dynamic CMS page titles are supplied via tenantBrowserTitleBridge.
 */
export function resolveTenantBrowserPageTitle(pathname = "") {
  const normalized = normalizePath(pathname);

  if (normalized.startsWith("/yasii")) {
    return "Ассистент";
  }

  const designerTitle = resolveDesignerPageTitle(normalized);
  if (designerTitle) {
    return designerTitle;
  }

  return resolvePortalPageTitle(normalized);
}
