import { getHierarchyParentChildEntityIds, resolveHierarchyRelationEntitySides } from "../table/services/resolveHierarchyRelationEntitySides.js";
import { reorderPlanTreeSiblingOrder } from "./planTreeRootOrderApi.js";
import { resolveEffectivePlanTreeParentId } from "./planTreeRootAnchor.js";

function resolveTimestamp(value) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function resolveHierarchyInstanceCreatedAt(instance) {
  return resolveTimestamp(instance?.created_at ?? instance?.createdAt);
}

function resolveEntityCreatedAt(entity) {
  return resolveTimestamp(entity?.created_at ?? entity?.createdAt);
}

/**
 * @param {string[]} childIds
 * @param {{
 *   instanceByChildId?: Map<string, Record<string, unknown>>,
 *   entitiesById?: Map<string, Record<string, unknown>>,
 *   resolveTitle?: (entity: Record<string, unknown> | null | undefined) => string,
 * }} context
 */
export function sortPlanHierarchySiblingIds(
  childIds,
  { instanceByChildId = new Map(), entitiesById = new Map(), resolveTitle } = {},
) {
  const normalizedIds = (Array.isArray(childIds) ? childIds : [])
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);

  const resolveNodeTitle = (entity) => {
    if (typeof resolveTitle === "function") {
      return String(resolveTitle(entity) || "").trim();
    }

    const values = entity?.values;
    if (values && typeof values === "object") {
      const fromValues = Object.values(values).find(
        (value) => typeof value === "string" && value.trim(),
      );
      if (fromValues) {
        return String(fromValues).trim();
      }
    }

    return String(entity?.title || entity?.name || "").trim();
  };

  return [...normalizedIds].sort((leftId, rightId) => {
    const leftInstanceTime = resolveHierarchyInstanceCreatedAt(instanceByChildId.get(leftId));
    const rightInstanceTime = resolveHierarchyInstanceCreatedAt(instanceByChildId.get(rightId));

    if (leftInstanceTime != null && rightInstanceTime != null && leftInstanceTime !== rightInstanceTime) {
      return leftInstanceTime - rightInstanceTime;
    }

    if (leftInstanceTime != null && rightInstanceTime == null) {
      return -1;
    }

    if (leftInstanceTime == null && rightInstanceTime != null) {
      return 1;
    }

    const leftEntityTime = resolveEntityCreatedAt(entitiesById.get(leftId));
    const rightEntityTime = resolveEntityCreatedAt(entitiesById.get(rightId));

    if (leftEntityTime != null && rightEntityTime != null && leftEntityTime !== rightEntityTime) {
      return leftEntityTime - rightEntityTime;
    }

    if (leftEntityTime != null && rightEntityTime == null) {
      return -1;
    }

    if (leftEntityTime == null && rightEntityTime != null) {
      return 1;
    }

    return resolveNodeTitle(entitiesById.get(leftId)).localeCompare(
      resolveNodeTitle(entitiesById.get(rightId)),
      "ru",
      { sensitivity: "base" },
    );
  });
}

/**
 * @param {Array<Record<string, unknown>>} instances
 * @param {Record<string, unknown> | null | undefined} relationDefinition
 * @param {string} parentEntityId
 */
export function collectHierarchySiblingIds(instances, relationDefinition, parentEntityId) {
  const normalizedParentId = String(parentEntityId ?? "").trim();

  if (!normalizedParentId) {
    return [];
  }

  const sides = resolveHierarchyRelationEntitySides(relationDefinition);
  /** @type {Map<string, Record<string, unknown>>} */
  const instanceByChildId = new Map();
  const childIds = [];

  for (const instance of Array.isArray(instances) ? instances : []) {
    const { parentId, childId } = getHierarchyParentChildEntityIds(instance, sides);

    if (parentId !== normalizedParentId || !childId) {
      continue;
    }

    childIds.push(childId);
    instanceByChildId.set(childId, instance);
  }

  return sortPlanHierarchySiblingIds(childIds, { instanceByChildId });
}

/**
 * @param {string[]} existingSiblingIds
 * @param {string} childEntityId
 */
export function buildAppendSiblingOrder(existingSiblingIds, childEntityId) {
  const normalizedChildId = String(childEntityId ?? "").trim();

  if (!normalizedChildId) {
    return [];
  }

  const existing = (Array.isArray(existingSiblingIds) ? existingSiblingIds : [])
    .map((id) => String(id ?? "").trim())
    .filter((id) => id && id !== normalizedChildId);

  return [...existing, normalizedChildId];
}

/**
 * Place a newly linked node at the end of its parent's sibling list.
 */
export async function appendPlanTreeSiblingOrder({
  tenantId,
  relationKey,
  relationDefinition,
  instances,
  parentEntityId = null,
  rootAnchorId = null,
  childEntityId,
}) {
  const normalizedChildId = String(childEntityId ?? "").trim();
  const effectiveParentId = resolveEffectivePlanTreeParentId(parentEntityId, rootAnchorId);

  if (!tenantId || !relationKey || !effectiveParentId || !normalizedChildId) {
    return;
  }

  const siblingIds = collectHierarchySiblingIds(
    instances,
    relationDefinition,
    effectiveParentId,
  );
  const orderedChildIds = buildAppendSiblingOrder(siblingIds, normalizedChildId);

  if (!orderedChildIds.length) {
    return;
  }

  await reorderPlanTreeSiblingOrder(tenantId, relationKey, {
    parentEntityId: effectiveParentId,
    orderedChildIds,
  });
}
