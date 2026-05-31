import { resolvePlatformDashboardUserId } from "../hostContextBuilders.js";
import { EMBEDDED_SURFACE_IDS } from "./embeddedSurfaceTypes.js";

function extractTenantIdFromPath(pathname) {
  const match = String(pathname || "").match(/\/designer\/tenant\/([^/]+)/);
  return match?.[1] ?? "0";
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

/**
 * Resolve embedded surface from current route when no page-level override is set.
 */
export function resolveSurfaceFromRoute(pathname) {
  const path = String(pathname || "");

  if (/\/designer\/[^/]+\/platform(?:\/|$)/.test(path) || /\/platform(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.DASHBOARD,
      contextData: buildDashboardFallbackContextData(path),
      inputPlaceholder: "Спросите ЯСИИ о roadmap или текущем этапе...",
    };
  }

  if (/\/portal\/[^/]+\/object-types(?:\/|$)/.test(path) || /\/object(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.OBJECT_CARD,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: "object-card",
        selectedScope: "object-card",
      },
      inputPlaceholder: "Спросите ЯСИИ о карточке объекта...",
    };
  }

  if (/\/registry(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: "registry",
        selectedScope: "registry",
      },
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

  if (/\/processes(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.PROCESS,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: "process",
        selectedScope: "process",
      },
      inputPlaceholder: "Спросите ЯСИИ о процессе...",
    };
  }

  if (/\/designer(?:\/|$)/.test(path)) {
    return {
      surfaceId: EMBEDDED_SURFACE_IDS.DESIGNER,
      contextData: {
        ...buildGlobalContextData(path),
        widgetId: "designer",
        selectedScope: "designer",
      },
      inputPlaceholder: "Спросите ЯСИИ о конструкторе...",
    };
  }

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
    contextData: buildGlobalContextData(path),
    inputPlaceholder: "Спросите ЯСИИ...",
  };
}
