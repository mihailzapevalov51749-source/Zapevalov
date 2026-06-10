import {
  buildDesignerBreadcrumbs,
  isDesignerPlatformRoute,
  resolveDesignerSectionByPath,
  resolveDesignerTabLabel,
  resolveObjectTypeIdFromDesignerPath,
} from "../../shared/shell/designer/designerNavigationResolver.js";
import { EMBEDDED_SURFACE_IDS } from "../embedded/embeddedSurfaceTypes.js";

const SECTION_ENTITY_TYPES = {
  objects: "objects_section",
  navigation: "navigation",
  pages: "pages",
  processes: "process",
  workspaces: "workspace",
  publishing: "publishing",
  relations: "relations",
  views: "views",
  administration: "administration",
  platform: "platform",
  "event-journal": "event_journal",
};

function resolveDesignerTabKey(pathname) {
  const match = String(pathname || "").match(/\/object-types\/[^/]+\/([^/?]+)/);
  const segment = String(match?.[1] ?? "").trim().toLowerCase();
  return segment && segment !== "data" ? segment : "";
}

function resolvePageIdFromPath(pathname) {
  const match = String(pathname || "").match(/\/page\/(\d+)/);
  return match?.[1] ? String(match[1]).trim() : "";
}

/**
 * Build designer surface contextData from route + shell state (no YASII logic).
 */
export function buildDesignerContextData({
  pathname,
  tenantId,
  userId,
  objectTypeName = "",
  navigationItems = [],
  activeObjectAdapterLabel = "",
  routeOwner = null,
}) {
  const normalizedPath = String(pathname || "").trim();

  if (!normalizedPath.startsWith("/designer/")) {
    return null;
  }

  if (isDesignerPlatformRoute(normalizedPath)) {
    return null;
  }

  if (/\/object-types\/[^/]+\/data\/?$/.test(normalizedPath)) {
    return null;
  }

  const resolvedTenantId = Number(tenantId) || 1;
  const section = resolveDesignerSectionByPath(normalizedPath, resolvedTenantId);
  const sectionKey = section?.key ?? "objects";
  const sectionLabel = section?.label ?? "Студия";
  const objectTypeId = resolveObjectTypeIdFromDesignerPath(normalizedPath);
  const tabKey = resolveDesignerTabKey(normalizedPath);
  const tabLabel = tabKey ? resolveDesignerTabLabel(tabKey) : "";
  const pageId = resolvePageIdFromPath(normalizedPath);

  const breadcrumbs = buildDesignerBreadcrumbs(normalizedPath, {
    tenantId: resolvedTenantId,
    objectTypeName,
    navigationItems,
    activeObjectAdapterLabel,
    routeOwner,
  });
  const activeCrumb = breadcrumbs.find((item) => item.active) || breadcrumbs[breadcrumbs.length - 1];
  const activeNodeName = String(activeCrumb?.label ?? "").trim();

  let designerEntityType = SECTION_ENTITY_TYPES[sectionKey] || sectionKey;
  let designerEntityId = sectionKey;
  let designerEntityName = sectionLabel;
  let selectedNodeId = sectionKey;
  let selectedNodeName = activeNodeName || sectionLabel;
  let designerSection = tabLabel || activeNodeName || sectionLabel;

  if (sectionKey === "objects") {
    if (objectTypeId) {
      designerEntityType = "object_type";
      designerEntityId = objectTypeId;
      designerEntityName =
        String(objectTypeName || "").trim() || activeNodeName || objectTypeId;
      selectedNodeId = tabKey ? `${objectTypeId}:${tabKey}` : objectTypeId;
      selectedNodeName = tabLabel || designerEntityName;
      designerSection = tabLabel || "Общие";
    } else {
      designerEntityType = "objects_catalog";
      designerEntityName = "Каталог объектов";
      designerSection = "Объекты";
    }
  } else if (sectionKey === "pages" && pageId) {
    designerEntityType = "page";
    designerEntityId = pageId;
    designerEntityName = activeNodeName || `Страница ${pageId}`;
    selectedNodeId = pageId;
    selectedNodeName = designerEntityName;
    designerSection = designerEntityName;
  } else if (sectionKey === "navigation") {
    designerEntityType = "navigation";
    designerEntityId = "navigation";
    designerEntityName = "Навигационная структура";
    selectedNodeId = "navigation";
    selectedNodeName = designerEntityName;
    designerSection = "Навигация";
  }

  const selectedScope = [
    "designer",
    sectionKey,
    designerEntityId,
    tabKey || pageId || "",
  ]
    .filter(Boolean)
    .join(":");

  const widgetId = `designer-${sectionKey}-${designerEntityId}`;

  return {
    tenantId: String(resolvedTenantId),
    userId: String(userId ?? "").trim(),
    designerArea: sectionLabel,
    designerEntityType,
    designerEntityId,
    designerEntityName,
    selectedNodeId,
    selectedNodeName,
    selectedScope,
    widgetId,
    metadata: {
      designerMode: "designer",
      designerPath: normalizedPath,
      designerSection,
      designerArea: sectionLabel,
      designerEntityType,
      designerEntityName,
      objectTypeId: objectTypeId || "",
      activeTab: tabKey || "",
      activeTabLabel: tabLabel || "",
    },
  };
}

export function buildDesignerYasiiSurfaceValue(input) {
  const contextData = buildDesignerContextData(input);
  if (!contextData) {
    return null;
  }

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.DESIGNER,
    contextData,
    inputPlaceholder: "Спросите ЯСИИ о текущем разделе конструктора...",
  };
}
