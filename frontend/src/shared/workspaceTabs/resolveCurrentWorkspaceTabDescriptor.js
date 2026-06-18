import { PAGE_LAYOUT_PAGE_TYPE } from "../appShell/pageLayoutContract/pageLayoutContractTypes.js";

import {
  resolveStudioSectionTitle,
} from "./studioSectionTitles.js";
import { resolveWorkspaceTabDisplayTitle } from "./resolveWorkspaceTabDisplayTitle.js";

function buildRoute(location) {
  const pathname = String(location?.pathname || "").trim();
  const search = String(location?.search || "");
  const hash = String(location?.hash || "");
  return `${pathname}${search}${hash}`;
}

function parseTenantId(pathname) {
  const portalMatch = pathname.match(/^\/portal\/(\d+)/);
  if (portalMatch?.[1]) {
    return Number(portalMatch[1]);
  }

  const designerMatch = pathname.match(/^\/designer\/tenant\/(\d+)/);
  if (designerMatch?.[1]) {
    return Number(designerMatch[1]);
  }

  return null;
}

function resolveStudioDescriptor(pathname, route, tenantId) {
  if (pathname.match(/^\/designer\/tenant\/\d+\/object-types\/?$/)) {
    return {
      title: "Объекты",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST,
      iconKey: "layers",
      tenantId,
      context: {},
    };
  }

  const objectDataMatch = pathname.match(/^\/designer\/tenant\/\d+\/object-types\/([^/]+)\/data$/);
  if (objectDataMatch) {
    return {
      title: "Данные объекта",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA,
      iconKey: "table",
      tenantId,
      context: {
        objectTypeId: decodeURIComponent(objectDataMatch[1]),
        tabKey: "data",
      },
    };
  }

  const objectTabMatch = pathname.match(
    /^\/designer\/tenant\/\d+\/object-types\/([^/]+)\/([^/]+)$/,
  );

  if (objectTabMatch) {
    const objectTypeId = decodeURIComponent(objectTabMatch[1]);
    const tab = decodeURIComponent(objectTabMatch[2]);

    return {
      title: "Объект",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT,
      iconKey: "settings",
      tenantId,
      context: {
        objectTypeId,
        tabKey: tab,
      },
    };
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/workspaces\/?$/)) {
    return {
      title: "Рабочие пространства",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES,
      iconKey: "briefcase",
      tenantId,
      context: {},
    };
  }

  const workspaceMatch = pathname.match(/^\/designer\/tenant\/\d+\/workspaces\/([^/]+)/);
  if (workspaceMatch) {
    const workspaceSlug = decodeURIComponent(workspaceMatch[1]);
    return {
      title: "Рабочее пространство",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACE_DETAIL,
      iconKey: "briefcase",
      tenantId,
      context: {
        workspaceSlug,
      },
    };
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/pages\/?$/)) {
    return {
      title: "Страницы",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES,
      iconKey: "file-text",
      tenantId,
      context: {},
    };
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/trash\/?$/)) {
    return {
      title: "Корзина",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH,
      iconKey: "trash-2",
      tenantId,
      context: {},
    };
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/administration/)) {
    return {
      title: "Администрирование",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN,
      iconKey: "shield",
      tenantId,
      context: {},
    };
  }

  const pageEditorMatch = pathname.match(/^\/designer\/tenant\/\d+\/page\/(\d+)/);
  if (pageEditorMatch) {
    return {
      title: "Страница",
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR,
      iconKey: "file-text",
      tenantId,
      context: {
        pageId: Number(pageEditorMatch[1]),
      },
    };
  }

  const sectionMatch = pathname.match(
    /^\/designer\/tenant\/\d+\/(relations|views|navigation|processes|publishing)\/?$/,
  );
  if (sectionMatch) {
    const sectionKey = sectionMatch[1];
    const sectionTitle = resolveStudioSectionTitle(sectionKey) || "Раздел";

    return {
      title: sectionTitle,
      route,
      moduleKey: "studio",
      pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
      iconKey: "pen-tool",
      tenantId,
      context: {
        sectionKey,
        sectionTitle,
        pageTitle: sectionTitle,
      },
    };
  }

  if (pathname.includes("/platform")) {
    return {
      title: "Развитие продукта",
      route,
      moduleKey: "dashboard",
      pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
      iconKey: "layout-dashboard",
      tenantId,
      context: {},
    };
  }

  return {
    title: "Студия",
    route,
    moduleKey: "studio",
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    iconKey: "pen-tool",
    tenantId,
    context: {},
  };
}

function resolveOfficeDescriptor(pathname, route, tenantId) {
  const objectViewMatch = pathname.match(
    /^\/portal\/\d+\/object-types\/([^/]+)(?:\/([^/]+))?$/,
  );

  if (objectViewMatch) {
    const objectTypeRef = decodeURIComponent(objectViewMatch[1]);
    const viewKey = objectViewMatch[2] ? decodeURIComponent(objectViewMatch[2]) : "default_table";
    const isPlan = viewKey === "plan";

    return {
      title: "Объект",
      route,
      moduleKey: "office",
      pageType: isPlan ? PAGE_LAYOUT_PAGE_TYPE.OBJECT_PLAN : PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME,
      iconKey: isPlan ? "git-branch" : "table",
      tenantId,
      context: {
        objectTypeKey: objectTypeRef,
        viewKey,
      },
    };
  }

  const workspaceMatch = pathname.match(/^\/portal\/\d+\/workspaces\/([^/]+)/);
  if (workspaceMatch) {
    const workspaceSlug = decodeURIComponent(workspaceMatch[1]);
    return {
      title: "Рабочее пространство",
      route,
      moduleKey: "office",
      pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE,
      iconKey: "briefcase",
      tenantId,
      context: {
        workspaceSlug,
      },
    };
  }

  const pageMatch = pathname.match(/^\/portal\/\d+\/page\/(\d+)/);
  if (pageMatch) {
    return {
      title: "Страница",
      route,
      moduleKey: "office",
      pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE,
      iconKey: "file-text",
      tenantId,
      context: {
        pageId: Number(pageMatch[1]),
      },
    };
  }

  const libraryMatch = pathname.match(/^\/portal\/\d+\/library\/([^/]+)/);
  if (libraryMatch) {
    return {
      title: "Документы",
      route,
      moduleKey: "office",
      pageType: PAGE_LAYOUT_PAGE_TYPE.OFFICE_LIBRARY,
      iconKey: "folder",
      tenantId,
      context: {
        libraryId: decodeURIComponent(libraryMatch[1]),
      },
    };
  }

  return {
    title: "Страница",
    route,
    moduleKey: "office",
    pageType: "generic",
    iconKey: "home",
    tenantId,
    context: {},
  };
}

/**
 * @param {import('react-router-dom').Location | { pathname?: string, search?: string, hash?: string }} location
 * @param {{ titleOverride?: string, pageTitle?: string, context?: Record<string, unknown> }} [options]
 */
export function resolveCurrentWorkspaceTabDescriptor(location, options = {}) {
  const pathname = String(location?.pathname || "").trim();
  const route = buildRoute(location);
  const tenantId = parseTenantId(pathname);

  let descriptor;

  if (pathname.startsWith("/designer")) {
    descriptor = resolveStudioDescriptor(pathname, route, tenantId);
  } else if (pathname.startsWith("/portal/")) {
    descriptor = resolveOfficeDescriptor(pathname, route, tenantId);
  } else if (pathname.startsWith("/yasii")) {
    descriptor = {
      title: "Рабочее пространство",
      route,
      moduleKey: "chat",
      pageType: PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE,
      iconKey: "message-circle",
      tenantId,
      context: {},
    };
  } else {
    descriptor = {
      title: "Страница",
      route,
      moduleKey: "office",
      pageType: "generic",
      iconKey: "file",
      tenantId,
      context: {},
    };
  }

  const pageTitle = normalizeText(options.pageTitle || options.titleOverride);
  if (pageTitle) {
    descriptor = {
      ...descriptor,
      title: pageTitle,
      context: {
        ...descriptor.context,
        pageTitle,
      },
    };
  }

  if (options.context && typeof options.context === "object") {
    descriptor = {
      ...descriptor,
      context: {
        ...descriptor.context,
        ...options.context,
      },
    };
  }

  return descriptor;
}

function normalizeText(value) {
  return String(value || "").trim();
}

const API_PAGE_TYPE_MAP = {
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST]: "studio_object_settings",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT]: "studio_object_settings",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA]: "object_table",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES]: "workspace",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACE_DETAIL]: "workspace",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES]: "page",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH]: "generic",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR]: "page",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN]: "users",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION]: "generic",
  [PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE]: "workspace",
  [PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE]: "page",
  [PAGE_LAYOUT_PAGE_TYPE.OFFICE_LIBRARY]: "library",
  [PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME]: "object_table",
  [PAGE_LAYOUT_PAGE_TYPE.OBJECT_PLAN]: "object_plan",
  [PAGE_LAYOUT_PAGE_TYPE.DASHBOARD]: "dashboard",
  [PAGE_LAYOUT_PAGE_TYPE.PROFILE]: "settings",
  [PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE]: "chat_room",
  [PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM]: "chat_room",
  [PAGE_LAYOUT_PAGE_TYPE.CALENDAR]: "calendar",
};

function mapWorkspaceTabPageTypeForApi(pageType) {
  const normalized = normalizeText(pageType);
  return API_PAGE_TYPE_MAP[normalized] || normalized || "generic";
}

const API_MODULE_KEY_MAP = {
  yasii: "chat",
  profile: "settings",
};

export function mapWorkspaceTabModuleKeyForApi(moduleKey) {
  const normalized = normalizeText(moduleKey);
  return API_MODULE_KEY_MAP[normalized] || normalized;
}

export function buildWorkspaceTabPayload(descriptor, overrides = {}) {
  const mergedContext = {
    ...(descriptor?.context && typeof descriptor.context === "object" ? descriptor.context : {}),
    ...(overrides.context && typeof overrides.context === "object" ? overrides.context : {}),
  };

  const pageTitle = normalizeText(overrides.pageTitle || overrides.title);
  if (pageTitle) {
    mergedContext.pageTitle = pageTitle;
  }

  const layoutPageType = overrides.pageType || descriptor.pageType;
  mergedContext.layoutPageType = layoutPageType;

  const resolvedModuleKey = normalizeText(overrides.moduleKey || descriptor.moduleKey);
  const apiModuleKey = mapWorkspaceTabModuleKeyForApi(resolvedModuleKey);

  const payloadBase = {
    title: pageTitle || descriptor?.title,
    route: overrides.route || descriptor.route,
    module_key: apiModuleKey,
    page_type: mapWorkspaceTabPageTypeForApi(layoutPageType),
    tenant_id: overrides.tenantId ?? descriptor.tenantId ?? null,
    icon_key: overrides.iconKey ?? descriptor.iconKey ?? null,
    context_json: mergedContext,
    pageTitle,
    context: mergedContext,
    moduleKey: resolvedModuleKey || descriptor.moduleKey,
    pageType: layoutPageType,
  };

  return {
    title: resolveWorkspaceTabDisplayTitle(payloadBase),
    route: payloadBase.route,
    module_key: apiModuleKey,
    page_type: payloadBase.page_type,
    tenant_id: payloadBase.tenant_id,
    icon_key: payloadBase.icon_key,
    context_json: payloadBase.context_json,
    is_pinned: overrides.isPinned === true,
    is_minimized: overrides.isMinimized === true,
    sort_order: overrides.sortOrder ?? 100,
  };
}
