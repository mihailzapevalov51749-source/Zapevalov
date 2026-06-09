import { resolvePrimaryHierarchySubtaskRelationKey } from "./hierarchyRelationProfile.js";
import { resolvePlanTreeHierarchyRelationKey } from "./resolvePlanTreeHierarchyRelationKey.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * Hierarchy relation from published Plan view contract (single source for Plan + Table).
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolvePlanViewHierarchyRelationKey(catalog, objectTypeKey) {
  const currentKey = normalizeKey(objectTypeKey);

  if (!currentKey) {
    return "";
  }

  const objectTypes = Array.isArray(catalog?.object_types) ? catalog.object_types : [];
  const objectType = objectTypes.find(
    (item) => normalizeKey(item?.key) === currentKey,
  );
  const views = Array.isArray(objectType?.views) ? objectType.views : [];

  for (const view of views) {
    if (normalizeKey(view?.view_type).toLowerCase() !== "plan") {
      continue;
    }

    const settings = view?.settings_json;
    const objectView =
      settings && typeof settings === "object" ? settings.objectView : null;
    const presentation =
      objectView && typeof objectView === "object" ? objectView.presentation : null;
    const plan =
      presentation && typeof presentation === "object" ? presentation.plan : null;
    const relationKey = normalizeKey(plan?.hierarchyRelationKey);

    if (relationKey) {
      return relationKey;
    }
  }

  return "";
}

/**
 * Plan contract hierarchy relation when configured; otherwise primary hierarchy relation.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveConfiguredHierarchyRelationKey(catalog, objectTypeKey) {
  const fromPlan = resolvePlanViewHierarchyRelationKey(catalog, objectTypeKey);

  if (fromPlan) {
    return resolvePlanTreeHierarchyRelationKey(catalog, objectTypeKey, fromPlan);
  }

  return resolvePrimaryHierarchySubtaskRelationKey(catalog, objectTypeKey);
}
