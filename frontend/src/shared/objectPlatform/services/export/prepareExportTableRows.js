import { listRelationInstancesByKey } from "../../../../api/runtimeRelationsApi.js";
import {
  hasHierarchySubtasksFeature,
  resolvePrimaryHierarchySubtaskRelationKey,
} from "../../../relation/hierarchyRelationProfile.js";
import { buildHierarchyEdgeMaps } from "../../../../modules/objectViews/table/services/buildHierarchyEdgeMaps.js";
import {
  buildExportColumnsWithHierarchy,
  orderFlatRowsForHierarchyExport,
} from "./orderExportHierarchyRows.js";

export {
  EXPORT_HIERARCHY_NUMBER_COLUMN_KEY,
  buildExportColumnsWithHierarchy,
  orderFlatRowsForHierarchyExport,
} from "./orderExportHierarchyRows.js";

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveExportHierarchyTreeEnabled(catalog, objectTypeKey) {
  const normalizedObjectTypeKey = String(objectTypeKey || "").trim();

  return (
    Boolean(normalizedObjectTypeKey) &&
    hasHierarchySubtasksFeature(catalog, normalizedObjectTypeKey) &&
    Boolean(resolvePrimaryHierarchySubtaskRelationKey(catalog, normalizedObjectTypeKey))
  );
}

function findCatalogRelation(catalog, relationKey) {
  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const normalizedKey = String(relationKey ?? "").trim();

  return (
    relations.find((item) => String(item?.key ?? "").trim() === normalizedKey) ||
    null
  );
}

/**
 * @param {{
 *   tenantId: number | null,
 *   objectTypeKey: string,
 *   catalog?: Record<string, unknown> | null,
 *   flatRows?: import("../../../viewEngine/contracts").ViewEngineRow[],
 * }} params
 */
export async function prepareExportTableRows({
  tenantId,
  objectTypeKey,
  catalog = null,
  flatRows = [],
}) {
  const normalizedTenantId = Number(tenantId);
  const normalizedObjectTypeKey = String(objectTypeKey || "").trim();
  const safeRows = Array.isArray(flatRows) ? flatRows : [];

  if (!normalizedTenantId || !normalizedObjectTypeKey || !safeRows.length) {
    return { rows: safeRows, treeEnabled: false };
  }

  const treeEnabled = resolveExportHierarchyTreeEnabled(
    catalog,
    normalizedObjectTypeKey,
  );

  if (!treeEnabled) {
    return { rows: safeRows, treeEnabled: false };
  }

  const hierarchyRelationKey = resolvePrimaryHierarchySubtaskRelationKey(
    catalog,
    normalizedObjectTypeKey,
  );

  if (!hierarchyRelationKey) {
    return { rows: safeRows, treeEnabled: false };
  }

  const relationDefinition = findCatalogRelation(catalog, hierarchyRelationKey);

  try {
    const instances = await listRelationInstancesByKey(
      normalizedTenantId,
      hierarchyRelationKey,
    );
    const { parentByChild, childrenByParent } = buildHierarchyEdgeMaps(
      instances,
      relationDefinition,
    );

    return {
      rows: orderFlatRowsForHierarchyExport({
        flatRows: safeRows,
        parentByChild,
        childrenByParent,
      }),
      treeEnabled: true,
    };
  } catch {
    return { rows: safeRows, treeEnabled: false };
  }
}
