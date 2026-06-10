import {
  getHierarchyParentChildEntityIds,
  resolveHierarchyRelationEntitySides,
} from "../table/services/resolveHierarchyRelationEntitySides.js";
import { isRuntimeSystemEntity } from "../../../shared/runtime/runtimeSystemRecords.js";
import { isPlanTreeRootAnchorTitle } from "./planTreeRootAnchor.js";

function resolveEntityTitle(entity, titleFieldKey) {
  if (!entity || typeof entity !== "object") {
    return "";
  }

  const values = entity.values && typeof entity.values === "object" ? entity.values : null;
  const titleKey = String(titleFieldKey || "title").trim();

  if (values && values[titleKey] != null) {
    return String(values[titleKey]).trim();
  }

  if (entity.title != null) {
    return String(entity.title).trim();
  }

  return "";
}

function isUserVisiblePlanEntity(entity, entityId, rootAnchorId, titleFieldKey) {
  const normalizedId = String(entityId ?? "").trim();
  const normalizedAnchorId = String(rootAnchorId ?? "").trim();

  if (!normalizedId) {
    return false;
  }

  if (normalizedAnchorId && normalizedId === normalizedAnchorId) {
    return false;
  }

  if (!entity || typeof entity !== "object") {
    return false;
  }

  if (isRuntimeSystemEntity(entity)) {
    return false;
  }

  if (isPlanTreeRootAnchorTitle(resolveEntityTitle(entity, titleFieldKey))) {
    return false;
  }

  return true;
}

/**
 * Removes self-parent, system-system and other non-user hierarchy edges before tree build.
 *
 * @param {Array<Record<string, unknown>> | null | undefined} instances
 * @param {{
 *   relationDefinition?: Record<string, unknown> | null,
 *   entitiesById?: Map<string, Record<string, unknown>>,
 *   rootAnchorId?: string | null,
 *   titleFieldKey?: string | null,
 * }} options
 */
export function sanitizePlanHierarchyInstances(
  instances,
  {
    relationDefinition = null,
    entitiesById = new Map(),
    rootAnchorId = null,
    titleFieldKey = null,
  } = {},
) {
  const sides = resolveHierarchyRelationEntitySides(relationDefinition);
  const normalizedAnchorId = String(rootAnchorId ?? "").trim();
  const seen = new Set();
  const sanitized = [];

  for (const instance of Array.isArray(instances) ? instances : []) {
    const { parentId, childId } = getHierarchyParentChildEntityIds(instance, sides);
    const normalizedParentId = String(parentId ?? "").trim();
    const normalizedChildId = String(childId ?? "").trim();

    if (!normalizedParentId || !normalizedChildId) {
      continue;
    }

    if (normalizedParentId === normalizedChildId) {
      if (import.meta.env?.DEV) {
        console.warn(
          "[PlanTree] Skipping self-parent hierarchy edge",
          normalizedParentId,
        );
      }
      continue;
    }

    const parentEntity = entitiesById.get(normalizedParentId) || null;
    const childEntity = entitiesById.get(normalizedChildId) || null;
    const childIsUser = isUserVisiblePlanEntity(
      childEntity,
      normalizedChildId,
      rootAnchorId,
      titleFieldKey,
    );
    const parentIsUser = isUserVisiblePlanEntity(
      parentEntity,
      normalizedParentId,
      rootAnchorId,
      titleFieldKey,
    );
    const parentIsAnchor =
      Boolean(normalizedAnchorId) && normalizedParentId === normalizedAnchorId;

    if (!childIsUser) {
      if (import.meta.env?.DEV) {
        console.warn(
          "[PlanTree] Skipping hierarchy edge with non-user child",
          normalizedParentId,
          "->",
          normalizedChildId,
        );
      }
      continue;
    }

    if (!parentIsUser && !parentIsAnchor) {
      if (import.meta.env?.DEV) {
        console.warn(
          "[PlanTree] Skipping hierarchy edge with non-user non-anchor parent",
          normalizedParentId,
          "->",
          normalizedChildId,
        );
      }
      continue;
    }

    const edgeKey = `${normalizedParentId}->${normalizedChildId}`;
    if (seen.has(edgeKey)) {
      if (import.meta.env?.DEV) {
        console.warn("[PlanTree] Skipping duplicate hierarchy edge", edgeKey);
      }
      continue;
    }

    seen.add(edgeKey);
    sanitized.push(instance);
  }

  return sanitized;
}
