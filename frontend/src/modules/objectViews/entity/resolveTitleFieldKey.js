import { legacyProjectionToFieldKeys } from "../services/normalizeObjectViewDefinition.js";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter.js";

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveTitleFieldKey(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  if (!objectType) {
    return "";
  }

  const views = Array.isArray(objectType.views) ? objectType.views : [];
  const defaultView =
    views.find((view) => view?.is_default) || views[0] || null;

  if (!defaultView || typeof defaultView !== "object") {
    return "";
  }

  const settings =
    defaultView.settings_json && typeof defaultView.settings_json === "object"
      ? defaultView.settings_json
      : {};

  let projection = settings.projection;

  if (!projection || typeof projection !== "object") {
    const objectView = settings.objectView;
    projection =
      objectView?.projection && typeof objectView.projection === "object"
        ? objectView.projection
        : objectView && typeof objectView === "object"
          ? objectView
          : null;
  }

  const legacy = legacyProjectionToFieldKeys(projection);

  return String(legacy.titleFieldKey || "").trim();
}
