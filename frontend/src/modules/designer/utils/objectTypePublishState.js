/**
 * Publish vs menu-placement signals for Object Type workspace.
 * Uses backend timestamps on DesignerObjectType (no new revision API).
 */

export function parseObjectTypeTimestamp(value) {
  if (!value) {
    return null;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function readObjectTypeTimestamp(objectType, snakeKey, camelKey) {
  if (!objectType || typeof objectType !== "object") {
    return null;
  }

  return (
    parseObjectTypeTimestamp(objectType[snakeKey]) ??
    parseObjectTypeTimestamp(objectType[camelKey])
  );
}

/** Object changed in Designer after last catalog publish. */
export function hasUnpublishedObjectTypeChanges(objectType) {
  const updatedAt = readObjectTypeTimestamp(objectType, "updated_at", "updatedAt");
  const lastPublishedAt = readObjectTypeTimestamp(
    objectType,
    "last_published_at",
    "lastPublishedAt",
  );

  if (updatedAt == null || lastPublishedAt == null) {
    return false;
  }

  return updatedAt > lastPublishedAt;
}

export function findObjectTypeNavigationItem(items, objectTypeId) {
  if (!objectTypeId || !Array.isArray(items)) {
    return null;
  }

  const targetId = String(objectTypeId);

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    if (item.type === "object_type" && String(item.object_type_id) === targetId) {
      return item;
    }

    const nested = findObjectTypeNavigationItem(item.children, objectTypeId);
    if (nested) {
      return nested;
    }
  }

  return null;
}

export function treeHasObjectTypeMenuPlacement(items, objectTypeId) {
  if (!objectTypeId || !Array.isArray(items)) {
    return false;
  }

  const targetId = String(objectTypeId);

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    if (item.type === "object_type" && String(item.object_type_id) === targetId) {
      return true;
    }

    if (treeHasObjectTypeMenuPlacement(item.children, objectTypeId)) {
      return true;
    }
  }

  return false;
}

/**
 * @param {object | null} objectType
 * @param {{ catalogVersion?: string | number | null, hasMenuPlacement?: boolean }} context
 */
export function computeObjectTypePublishFlags(objectType, context = {}) {
  const hasCatalog = context.catalogVersion != null && context.catalogVersion !== "";
  const lastPublishedAt = readObjectTypeTimestamp(
    objectType,
    "last_published_at",
    "lastPublishedAt",
  );
  const hasMenuPlacement = Boolean(context.hasMenuPlacement);
  const hasPublishedBaseline = hasCatalog && lastPublishedAt != null;
  const needsContentSync =
    hasPublishedBaseline && hasUnpublishedObjectTypeChanges(objectType);
  const needsInitialPublish = Boolean(objectType) && !hasPublishedBaseline;
  const needsMenuPlacement = hasPublishedBaseline && !hasMenuPlacement;

  let publishAction = "none";

  if (needsInitialPublish) {
    publishAction = "publish-catalog";
  } else if (needsContentSync) {
    publishAction = "update-catalog";
  }

  return {
    hasCatalog,
    hasMenuPlacement,
    hasPublishedBaseline,
    needsPublish: needsInitialPublish || needsContentSync,
    needsContentSync,
    needsInitialPublish,
    needsMenuPlacement,
    publishAction,
  };
}
