import { resolvePageLayoutFallbackRoute } from "../shared/appShell/pageLayoutContract/resolvePageLayoutContract.js";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
} from "../shared/appShell/pageLayoutContract/pageLayoutContractTypes.js";

export const CORPORATE_CHAT_PAGE_ID = 35;

export { isDesignerShellEmbeddedPortalRoute } from "../shared/shell/shellLayoutMode.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function humanizeSlug(slug) {
  return normalizeText(slug).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function resolveTenantId(pathname, portalId) {
  const portalMatch = String(pathname || "").match(/^\/portal\/(\d+)/);
  if (portalMatch?.[1]) {
    return Number(portalMatch[1]);
  }

  const designerMatch = String(pathname || "").match(/^\/designer\/tenant\/(\d+)/);
  if (designerMatch?.[1]) {
    return Number(designerMatch[1]);
  }

  const normalizedPortalId = Number(portalId);
  return Number.isFinite(normalizedPortalId) && normalizedPortalId > 0
    ? normalizedPortalId
    : 1;
}

/**
 * @param {{
 *   page?: { title?: string, name?: string, label?: string, display_name?: string, slug?: string } | null,
 *   navigationItemTitle?: string,
 *   pageTitleDraft?: string,
 *   headerTitle?: string,
 * }} [sources]
 */
export function resolvePortalPageTitle(sources = {}) {
  const page = sources.page && typeof sources.page === "object" ? sources.page : {};

  const fromPage = normalizeText(
    page.title || page.name || page.label || page.display_name,
  );
  if (fromPage) {
    return fromPage;
  }

  const fromDraft = normalizeText(sources.pageTitleDraft);
  if (fromDraft) {
    return fromDraft;
  }

  const fromNavigation = normalizeText(sources.navigationItemTitle);
  if (fromNavigation) {
    return fromNavigation;
  }

  const fromHeader = normalizeText(sources.headerTitle);
  if (fromHeader) {
    return fromHeader;
  }

  const fromSlug = humanizeSlug(page.slug);
  if (fromSlug) {
    return fromSlug;
  }

  return "";
}

/**
 * @param {string} pathname
 * @param {{
 *   portalId?: number,
 *   tenantId?: number,
 *   workspaceRuntimeContext?: { slug?: string, tabSlug?: string } | null,
 * }} [options]
 */
export function resolvePortalPageViewFallbackRoute(pathname, options = {}) {
  const normalizedPath = normalizeText(pathname);
  const tenantId = resolveTenantId(normalizedPath, options.portalId ?? options.tenantId);

  const studioPageMatch = normalizedPath.match(/^\/designer\/tenant\/(\d+)\/page\/\d+/);
  if (studioPageMatch) {
    return `/designer/tenant/${studioPageMatch[1]}/pages`;
  }

  const studioAdminNestedMatch = normalizedPath.match(
    /^\/designer\/tenant\/(\d+)\/administration\/.+/,
  );
  if (studioAdminNestedMatch) {
    return `/designer/tenant/${studioAdminNestedMatch[1]}/administration`;
  }

  if (options.workspaceRuntimeContext?.slug) {
    const tabSlug = normalizeText(options.workspaceRuntimeContext.tabSlug) || "home";
    return `/portal/${tenantId}/workspaces/${options.workspaceRuntimeContext.slug}/${tabSlug}`;
  }

  if (normalizedPath.match(/^\/portal\/\d+\/page\/\d+/)) {
    return `/portal/${tenantId}/page/1`;
  }

  if (normalizedPath.match(/^\/designer\/tenant\/\d+\/administration\/?$/)) {
    const designerMatch = normalizedPath.match(/^\/designer\/tenant\/(\d+)\/administration\/?$/);
    if (designerMatch?.[1]) {
      return `/designer/tenant/${designerMatch[1]}/pages`;
    }
  }

  return resolvePageLayoutFallbackRoute(tenantId);
}

function buildCmsContractFields({
  pageType,
  pageId,
  pageTitle,
  pathname,
  portalId,
  workspaceRuntimeContext,
}) {
  const normalizedPageTitle = normalizeText(pageTitle);
  const tenantId = resolveTenantId(pathname, portalId);
  const fallbackRoute = resolvePortalPageViewFallbackRoute(pathname, {
    portalId,
    tenantId,
    workspaceRuntimeContext,
  });

  const context = {
    layoutPageType: pageType,
  };

  const numericPageId = Number(pageId);
  if (Number.isFinite(numericPageId) && numericPageId > 0) {
    context.pageId = numericPageId;
  }

  if (normalizedPageTitle) {
    context.pageTitle = normalizedPageTitle;
  }

  return {
    title: normalizedPageTitle || undefined,
    fallbackRoute,
    context,
  };
}

/**
 * @param {{ pathname?: string }} location
 * @param {number | null | undefined} pageId
 * @param {{
 *   portalId?: number,
 *   page?: { title?: string, name?: string, label?: string, display_name?: string, slug?: string } | null,
 *   navigationItemTitle?: string,
 *   pageTitleDraft?: string,
 *   headerTitle?: string,
 *   workspaceRuntimeContext?: { slug?: string, tabSlug?: string } | null,
 * }} [options]
 */
export function resolvePortalPageViewLayoutContractOverrides(location, pageId, options = {}) {
  const pathname = String(location?.pathname || "").trim();
  const isUniversalTablePage = pathname === "/universal-table";
  const isAdminPage =
    pathname.startsWith("/admin") ||
    /^\/designer\/tenant\/\d+\/administration(\/|$)/.test(pathname);
  const isCorporateChatPage = Number(pageId) === CORPORATE_CHAT_PAGE_ID;
  const isDesignerCustomPageRoute = /^\/designer\/tenant\/\d+\/page\/\d+/.test(pathname);
  const isPortalCmsPage =
    /^\/portal\/\d+\/page\/\d+/.test(pathname) &&
    !isUniversalTablePage &&
    !isAdminPage &&
    !isCorporateChatPage;

  if (isCorporateChatPage) {
    return {
      canMinimize: false,
      toolbarZoneId: null,
    };
  }

  const pageTitle = resolvePortalPageTitle(options);
  const tenantId = resolveTenantId(pathname, options.portalId);

  if (isAdminPage) {
    const adminTitle = pageTitle || normalizeText(options.headerTitle) || "Администрирование";
    const fallbackRoute = resolvePortalPageViewFallbackRoute(pathname, {
      portalId: options.portalId,
      tenantId,
    });

    return {
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN,
      toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
      canMinimize: true,
      title: adminTitle,
      fallbackRoute,
      context: {
        pageTitle: adminTitle,
        layoutPageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN,
      },
    };
  }

  if (isDesignerCustomPageRoute) {
    return {
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR,
      toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
      canMinimize: true,
      ...buildCmsContractFields({
        pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR,
        pageId,
        pageTitle,
        pathname,
        portalId: options.portalId,
        workspaceRuntimeContext: options.workspaceRuntimeContext,
      }),
    };
  }

  if (isPortalCmsPage) {
    return {
      pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE,
      toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
      canMinimize: true,
      ...buildCmsContractFields({
        pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE,
        pageId,
        pageTitle,
        pathname,
        portalId: options.portalId,
        workspaceRuntimeContext: options.workspaceRuntimeContext,
      }),
    };
  }

  return {
    canMinimize: false,
    toolbarZoneId: null,
  };
}
