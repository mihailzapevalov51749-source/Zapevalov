import { resolveTenantIdFromPathname } from "../../shared/tenantContext/tenantContextResolver.js";
import { resolvePlatformDashboardUserId } from "../hostContextBuilders.js";
import { EMBEDDED_SURFACE_IDS } from "../embedded/embeddedSurfaceTypes.js";

export function resolveCanonicalYasiiTenantId({ tenantId, pathname } = {}) {
  const explicit = Number(tenantId);
  if (Number.isFinite(explicit) && explicit > 0) {
    return String(explicit);
  }

  const fromPath = resolveTenantIdFromPathname(pathname);
  return fromPath ? String(fromPath) : null;
}

function buildBaseContextData({
  tenantId,
  pathname,
  widgetId,
  selectedScope,
  metadata = {},
}) {
  const resolvedTenantId = resolveCanonicalYasiiTenantId({ tenantId, pathname });

  return {
    tenantId: resolvedTenantId ?? "",
    userId: resolvePlatformDashboardUserId(),
    widgetId,
    selectedScope,
    metadata,
  };
}

export function buildPortalPageSurfaceValue({
  tenantId,
  pathname,
  pageId,
  pageTitle,
}) {
  const normalizedPageId = String(pageId ?? "").trim() || "unknown";

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
    contextData: buildBaseContextData({
      tenantId,
      pathname,
      widgetId: `portal-page-${normalizedPageId}`,
      selectedScope: `portal-page:${normalizedPageId}`,
      metadata: {
        pageId: normalizedPageId,
        pageTitle: String(pageTitle ?? "").trim(),
        surfaceType: "portal_page",
      },
    }),
    inputPlaceholder: "Спросите ЯСИИ о текущей странице...",
  };
}

export function buildPlanViewSurfaceValue({
  tenantId,
  pathname,
  objectTypeKey,
  objectTypeId,
  viewId = "plan",
  viewName = "План",
}) {
  const registryId = String(objectTypeId ?? objectTypeKey ?? "").trim() || "unknown";
  const registryName = String(objectTypeKey ?? "").trim() || "Объект";

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.REGISTRY,
    contextData: {
      ...buildBaseContextData({
        tenantId,
        pathname,
        widgetId: `registry-${registryId}-${viewId}`,
        selectedScope: `registry:${registryId}:${viewId}`,
        metadata: {
          surfaceType: "plan_view",
          viewType: "plan",
        },
      }),
      registryId,
      registryName,
      viewId,
      viewName,
      selectedCount: 0,
      activeFilters: "",
      activeSorts: "",
      searchQuery: "",
    },
    inputPlaceholder: "Спросите ЯСИИ о текущем плане...",
  };
}

export function buildQuickFormSurfaceValue({
  tenantId,
  pathname,
  objectTypeKey,
  objectTypeId,
}) {
  const objectType = String(objectTypeKey ?? "").trim() || "object";

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.OBJECT_CARD,
    contextData: {
      ...buildBaseContextData({
        tenantId,
        pathname,
        widgetId: `quick-form-${objectType}`,
        selectedScope: `quick-form:${objectType}:new`,
        metadata: {
          surfaceType: "quick_form",
          mode: "quick_form",
        },
      }),
      objectTypeId: String(objectTypeId ?? objectTypeKey ?? ""),
      objectTypeName: objectType,
      objectId: "new",
      objectTitle: "Новая запись",
      activeTab: "quick_form",
    },
    inputPlaceholder: "Спросите ЯСИИ о быстром создании...",
  };
}

export function buildWorkspaceSurfaceValue({
  tenantId,
  pathname,
  workspaceSlug,
  workspaceId,
  tabSlug,
  tabTitle,
}) {
  const normalizedSlug = String(workspaceSlug ?? "").trim() || "unknown";
  const normalizedTabSlug = String(tabSlug ?? "").trim() || "home";

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.GLOBAL,
    contextData: buildBaseContextData({
      tenantId,
      pathname,
      widgetId: `workspace-${normalizedSlug}`,
      selectedScope: `workspace:${normalizedSlug}:${normalizedTabSlug}`,
      metadata: {
        surfaceType: "workspace",
        workspaceId: String(workspaceId ?? ""),
        workspaceSlug: normalizedSlug,
        tabSlug: normalizedTabSlug,
        tabTitle: String(tabTitle ?? "").trim(),
      },
    }),
    inputPlaceholder: "Спросите ЯСИИ о текущем рабочем пространстве...",
  };
}
