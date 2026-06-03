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

/** Object changed in Designer after last catalog publish. */
export function hasUnpublishedObjectTypeChanges(objectType) {
  const updatedAt = parseObjectTypeTimestamp(objectType?.updated_at);
  const lastPublishedAt = parseObjectTypeTimestamp(objectType?.last_published_at);

  if (updatedAt == null || lastPublishedAt == null) {
    return false;
  }

  return updatedAt > lastPublishedAt;
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
  const hasMenuPlacement = Boolean(context.hasMenuPlacement);
  const hasPublishedBaseline = hasMenuPlacement && hasCatalog;
  const needsContentSync =
    hasPublishedBaseline && hasUnpublishedObjectTypeChanges(objectType);
  const needsMenuPlacement = !hasMenuPlacement;

  let publishAction = "none";

  if (needsMenuPlacement) {
    publishAction = "wizard";
  } else if (needsContentSync) {
    publishAction = "update-catalog";
  }

  return {
    hasCatalog,
    hasMenuPlacement,
    hasPublishedBaseline,
    needsPublish: needsMenuPlacement || needsContentSync,
    needsContentSync,
    needsMenuPlacement,
    publishAction,
  };
}
