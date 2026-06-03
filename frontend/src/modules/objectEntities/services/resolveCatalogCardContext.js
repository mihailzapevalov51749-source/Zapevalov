import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";

/**
 * Resolves card presentation hints from published catalog (default table view).
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @returns {{ titleFieldKey: string | null }}
 */
export function resolveCatalogCardContext(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  if (!objectType) {
    return { titleFieldKey: null };
  }

  const views = Array.isArray(objectType.views) ? objectType.views : [];
  const defaultView =
    views.find((view) => view?.is_default === true || view?.isDefault === true) ||
    views[0] ||
    null;

  const settings =
    defaultView?.settings_json && typeof defaultView.settings_json === "object"
      ? defaultView.settings_json
      : {};

  const objectViewProjection =
    settings.objectView?.projection && typeof settings.objectView.projection === "object"
      ? settings.objectView.projection
      : null;

  const legacyProjection =
    settings.projection && typeof settings.projection === "object"
      ? settings.projection
      : null;

  const titleFieldKey = String(
    objectViewProjection?.titleFieldKey ||
      objectViewProjection?.title_field_key ||
      legacyProjection?.title_field ||
      legacyProjection?.titleFieldKey ||
      "",
  ).trim();

  return {
    titleFieldKey: titleFieldKey || null,
  };
}
