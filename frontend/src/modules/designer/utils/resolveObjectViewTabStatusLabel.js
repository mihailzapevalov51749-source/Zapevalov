import { parseObjectTypeTimestamp } from "./objectTypePublishState.js";

function readViewTimestamp(view, snakeKey, camelKey) {
  if (!view || typeof view !== "object") {
    return null;
  }

  return (
    parseObjectTypeTimestamp(view[snakeKey]) ??
    parseObjectTypeTimestamp(view[camelKey])
  );
}

/**
 * Compact publication status for a single object view tab in Studio Preview.
 *
 * @param {{
 *   view?: object | null,
 *   objectType?: object | null,
 *   catalogVersion?: string | number | null,
 *   hasMenuPlacement?: boolean,
 * }} params
 */
export function resolveObjectViewTabStatusLabel({
  view = null,
  objectType = null,
  catalogVersion = null,
  hasMenuPlacement = false,
} = {}) {
  if (!view) {
    return "";
  }

  if (view.is_active === false) {
    return "Скрыто";
  }

  if (String(objectType?.status || "").toLowerCase() === "archived") {
    return "Скрыто";
  }

  const hasCatalog = catalogVersion != null && catalogVersion !== "";
  const hasPublishedBaseline =
    Boolean(hasMenuPlacement) && hasCatalog && readViewTimestamp(objectType, "last_published_at", "lastPublishedAt") != null;

  if (!hasPublishedBaseline) {
    return "Черновик";
  }

  const lastPublishedAt = readViewTimestamp(
    objectType,
    "last_published_at",
    "lastPublishedAt",
  );
  const viewUpdatedAt = readViewTimestamp(view, "updated_at", "updatedAt");

  if (
    viewUpdatedAt != null &&
    lastPublishedAt != null &&
    viewUpdatedAt > lastPublishedAt
  ) {
    return "Опубликовано + черновик";
  }

  return "Опубликовано";
}
