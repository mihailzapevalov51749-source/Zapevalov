import { buildDesignerContextData } from "../designer/buildDesignerContextData.js";
import { buildProcessContextData } from "../process/buildProcessContextData.js";
import { resolvePlatformDashboardUserId } from "../hostContextBuilders.js";
import { EMBEDDED_SURFACE_IDS } from "./embeddedSurfaceTypes.js";

function extractTenantIdFromPath(pathname) {
  const match = String(pathname || "").match(/\/designer\/tenant\/([^/]+)/);
  return match?.[1] ?? "0";
}

function extractObjectTypeRefFromPath(pathname) {
  const match = String(pathname || "").match(/\/object-types\/([^/?#]+)/);
  return match?.[1] ?? "";
}

function buildGlobalContextData(pathname) {
  return {
    tenantId: extractTenantIdFromPath(pathname),
    userId: resolvePlatformDashboardUserId(),
    widgetId: "global-entry",
    selectedScope: "global-entry",
  };
}

function buildDashboardFallbackContextData(pathname) {
  return {
    tenantId: extractTenantIdFromPath(pathname),
    userId: resolvePlatformDashboardUserId(),
    widgetId: "platform-dashboard",
    selectedScope: "platform-dashboard",
    metadata: {},
  };
}

function buildRegistryRouteFallbackContext(pathname) {
  const objectTypeRef = extractObjectTypeRefFromPath(pathname);
  const registryId = objectTypeRef || "registry";

  return {
    ...buildGlobalContextData(pathname),
    registryId,
    registryName: objectTypeRef || "Реестр",
    viewId: "default_table",
    viewName: "Таблица",
    selectedCount: 0,
    activeFilters: "",
    activeSorts: "",
    searchQuery: "",
    widgetId: `registry-${registryId}`,
    selectedScope: `registry:${registryId}:default_table`,
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

/**
 * Resolve embedded surface from current route when no page-level override is set.
 */
export function resolveSurfaceFromRoute(pathname) {
  const path = String(pathname || "");

  if (path === "/yasii" || path.startsWith("/yasii/")) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: "yasii-workspace",
        selectedScope: "yasii-workspace",
        metadata: {
          workspaceMode: "workspace",
        },
      },
      inputPlaceholder: "Спросите ЯСИИ о текущем контексте платформы...",
    };
  }

  if (/\/designer\/[^/]+\/platform(?:\/|$)/.test(path) || /\/platform(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.DASHBOARD,
      contextData: buildDashboardFallbackContextData(path),
      inputPlaceholder: "Спросите ЯСИИ о roadmap или текущем этапе...",
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
    const tenantId = extractTenantIdFromPath(path);
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
        tenantId: extractTenantIdFromPath(path),
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
