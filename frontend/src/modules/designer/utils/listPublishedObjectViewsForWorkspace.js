import * as runtimeCatalogApi from "../api/runtimeCatalogApi";

/**
 * Returns active views from published catalog for workspace tab binding.
 */
export async function listPublishedObjectViewsForWorkspace(tenantId, objectType) {
  if (!objectType) {
    return [];
  }

  const objectTypeKey = String(objectType.key || "").trim();
  const objectTypeId = String(objectType.id || "").trim();
  const lastPublishedAt = objectType.last_published_at || objectType.lastPublishedAt;

  if (!lastPublishedAt) {
    return [];
  }

  try {
    const catalog = await runtimeCatalogApi.getPublishedCatalog(tenantId);
    const items = Array.isArray(catalog?.object_types) ? catalog.object_types : [];
    const publishedType =
      items.find((item) => String(item?.key || "") === objectTypeKey) ||
      items.find((item) => String(item?.id || "") === objectTypeId) ||
      null;

    if (!publishedType) {
      return [];
    }

    const views = Array.isArray(publishedType.views) ? publishedType.views : [];
    return views
      .filter((view) => view && view.is_active !== false)
      .map((view) => ({
        id: String(view.id),
        key: String(view.key || ""),
        name: String(view.name || view.key || "Вкладка"),
      }))
      .filter((view) => view.key);
  } catch {
    return [];
  }
}
