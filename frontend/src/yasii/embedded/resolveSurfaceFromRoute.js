import { buildDesignerContextData } from "../designer/buildDesignerContextData.js";
import { buildProcessContextData } from "../process/buildProcessContextData.js";
import { resolvePlatformDashboardUserId } from "../hostContextBuilders.js";
import { resolveCanonicalYasiiTenantId } from "../runtime/yasiiRuntimeSurfaceContext.js";
import { resolveTenantIdFromPathname } from "../../shared/tenantContext/tenantContextResolver.js";
import { EMBEDDED_SURFACE_IDS } from "./embeddedSurfaceTypes.js";

function extractObjectTypeRefFromPath(pathname) {
  const match = String(pathname || "").match(/\/object-types\/([^/?#]+)/);
  return match?.[1] ?? "";
}

function extractPageIdFromPath(pathname) {
  const match = String(pathname || "").match(/\/portal\/\d+\/page\/(\d+)/);
  return match?.[1] ?? "";
}

function extractWorkspaceSlugFromPath(pathname) {
  const match = String(pathname || "").match(/\/portal\/\d+\/workspaces\/([^/?#]+)/);
  return match?.[1] ?? "";
}

function buildGlobalContextData(pathname) {
  return {
    tenantId: resolveCanonicalYasiiTenantId({ pathname }) ?? "",
    userId: resolvePlatformDashboardUserId(),
    widgetId: "global-entry",
    selectedScope: "global-entry",
  };
}

function buildDashboardFallbackContextData(pathname) {
  return {
    tenantId: resolveCanonicalYasiiTenantId({ pathname }) ?? "",
    userId: resolvePlatformDashboardUserId(),
    widgetId: "platform-dashboard",
    selectedScope: "platform-dashboard",
    metadata: {},
  };
}

function buildRegistryRouteFallbackContext(pathname, {
  viewId = "default_table",
  viewName = "Таблица",
} = {}) {
  const objectTypeRef = extractObjectTypeRefFromPath(pathname);
  const registryId = objectTypeRef || "registry";

  return {
    ...buildGlobalContextData(pathname),
    registryId,
    registryName: objectTypeRef || "Реестр",
    viewId,
    viewName,
    selectedCount: 0,
    activeFilters: "",
    activeSorts: "",
    searchQuery: "",
    widgetId: `registry-${registryId}`,
    selectedScope: `registry:${registryId}:${viewId}`,
    metadata: {},
  };
}

function isObjectRegistryTableRoute(path) {
  if (/\/object-types\/[^/]+\/data(?:\/|$|\?|#)/.test(path)) {
    return true;
  }

  if (/\/portal\/[^/]+\/object-types\/[^/]+(?:\/data)?(?:\/|$|\?|#)/.test(path)) {
    return true;
  }

  return false;
}

function isPlanViewRoute(path) {
  return /\/object-types\/[^/]+\/plan(?:\/|$|\?|#)/.test(path);
}

function isQuickFormRoute(path) {
  return /\/object-types\/[^/]+\/quick_form(?:\/|$|\?|#)/.test(path);
}

/**
 * Resolve embedded surface from current route when no page-level override is set.
 */
export function resolveSurfaceFromRoute(pathname) {
  const path = String(pathname || "");

  if (path === "/yasii" || path.startsWith("/yasii/")) {
    const tenantId =
      resolveCanonicalYasiiTenantId({ pathname: path })
      ?? (resolveTenantIdFromPathname(path) ? String(resolveTenantIdFromPathname(path)) : "");

    return {
      surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
      contextData: {
        tenantId,
        userId: resolvePlatformDashboardUserId(),
        widgetId: "yasii-workspace",
        selectedScope: "yasii-workspace",
        metadata: {
          workspaceMode: "workspace",
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о текущем контексте платформы...",
    };
  }

  if (/\/portal\/\d+\/page\/\d+/.test(path)) {
    const pageId = extractPageIdFromPath(path);
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: `portal-page-${pageId || "unknown"}`,
        selectedScope: `portal-page:${pageId || "unknown"}`,
        metadata: {
          pageId,
          surfaceType: "portal_page",
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о текущей странице...",
    };
  }

  if (/\/portal\/\d+\/workspaces\/[^/]+/.test(path)) {
    const workspaceSlug = extractWorkspaceSlugFromPath(path);
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: `workspace-${workspaceSlug || "unknown"}`,
        selectedScope: `workspace:${workspaceSlug || "unknown"}`,
        metadata: {
          workspaceSlug,
          surfaceType: "workspace",
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о текущем рабочем пространстве...",
    };
  }

  if (/\/designer\/[^/]+\/platform(?:\/|$)/.test(path) || /\/platform(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.DASHBOARD,
      contextData: buildDashboardFallbackContextData(path),
      inputPlaceholder: "Спросите ЯСИИ о roadmap или текущем этапе...",
    };
  }

  if (isPlanViewRoute(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
      contextData: buildRegistryRouteFallbackContext(path, {
        viewId: "plan",
        viewName: "План",
      }),
      inputPlaceholder: "Спросите ЯСИИ о текущем плане...",
    };
  }

  if (isQuickFormRoute(path)) {
    const objectTypeRef = extractObjectTypeRefFromPath(path);
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.OBJECT_CARD,
      contextData: {
        ...buildGlobalContextData(path),
        objectTypeId: objectTypeRef,
        objectTypeName: objectTypeRef || "Объект",
        objectId: "new",
        objectTitle: "Новая запись",
        activeTab: "quick_form",
        widgetId: `quick-form-${objectTypeRef || "object"}`,
        selectedScope: `quick-form:${objectTypeRef || "object"}:new`,
        metadata: {
          surfaceType: "quick_form",
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о быстром создании...",
    };
  }

  if (isObjectRegistryTableRoute(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
      contextData: buildRegistryRouteFallbackContext(path),
      inputPlaceholder: "Спросите ЯСИИ о текущем реестре...",
    };
  }

  if (/\/registry(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
      contextData: buildRegistryRouteFallbackContext(path),
      inputPlaceholder: "Спросите ЯСИИ о реестре...",
    };
  }

  if (/\/portal\/[^/]+\/library(?:\/|$)/.test(path) || /\/documents(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.DOCUMENT,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: "document",
        selectedScope: "document",
      },
      inputPlaceholder: "Спросите ЯСИИ о документе...",
    };
  }

  if (/\/designer(?:\/|$)/.test(path)) {
    const tenantId = resolveCanonicalYasiiTenantId({ pathname: path }) ?? "";
    const contextData =
      buildDesignerContextData({
        pathname: path,
        tenantId,
        userId: resolvePlatformDashboardUserId(),
      }) ?? {
        ...buildGlobalContextData(path),
        widgetId: "designer",
        selectedScope: "designer",
        designerArea: "Студия",
        designerEntityType: "designer",
        designerEntityId: "studio",
        designerEntityName: "Студия",
        selectedNodeId: "studio",
        selectedNodeName: "Студия",
        metadata: {
          designerMode: "designer",
          designerPath: path,
          designerSection: "Студия",
        },
      };

    return {
      surfaceId: EMBEDDED_SURFACE_IDS.DESIGNER,
      contextData,
      inputPlaceholder: "Спросите ЯСИИ о текущем разделе конструктора...",
    };
  }

  if (/\/processes(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.PROCESS,
      contextData: buildProcessContextData({
        tenantId: resolveCanonicalYasiiTenantId({ pathname: path }) ?? "",
        userId: resolvePlatformDashboardUserId(),
        metadata: {
          integrationReady: "true",
          processPath: path,
        },
      }),
      inputPlaceholder: "Спросите ЯСИИ о процессе...",
    };
  }

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
    contextData: buildGlobalContextData(path),
    inputPlaceholder: "Спросите ЯСИИ...",
  };
}
