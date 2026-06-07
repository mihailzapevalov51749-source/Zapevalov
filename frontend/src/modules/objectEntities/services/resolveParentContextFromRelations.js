import {
  listHierarchyParentRelationKeys,
} from "./hierarchyParentRelation.js";
import {
  resolveEntityDisplayTitle,
  resolveEntityTitleFieldKey,
} from "./resolveEntityDisplayTitle.js";

function normalizeId(value) {
  return String(value ?? "").trim();
}

function findCatalogObjectType(catalog, objectTypeKey) {
  const key = normalizeId(objectTypeKey);

  if (!key || !catalog || typeof catalog !== "object") {
    return null;
  }

  const objectTypes = Array.isArray(catalog.object_types) ? catalog.object_types : [];

  return (
    objectTypes.find((item) => normalizeId(item?.key) === key) || null
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string} objectTypeKey
 */
export function resolveTitleFieldKeyForObjectType(catalog, objectTypeKey) {
  return resolveEntityTitleFieldKey({ catalog, objectTypeKey }) || "";
}

/**
 * Pick incoming hierarchy instance where current entity is child (target).
 *
 * @param {Array<Record<string, unknown>>} instances
 * @param {string} currentEntityId
 * @param {Set<string>} hierarchyRelationKeys
 */
export function findHierarchyParentInstance(
  instances,
  currentEntityId,
  hierarchyRelationKeys,
) {
  const currentId = normalizeId(currentEntityId);

  for (const instance of Array.isArray(instances) ? instances : []) {
    const relationKey = normalizeId(instance?.relation_key);

    if (!relationKey || !hierarchyRelationKeys.has(relationKey)) {
      continue;
    }

    const sourceId = normalizeId(instance?.source_entity_id);
    const targetId = normalizeId(instance?.target_entity_id);

    if (targetId === currentId && sourceId && sourceId !== currentId) {
      return {
        relationKey,
        parentEntityId: sourceId,
        parentObjectTypeKey: normalizeId(instance?.source_object_type_key),
        relationInstanceId: normalizeId(instance?.id),
      };
    }
  }

  return null;
}

/**
 * @param {{
 *   instances?: Array<Record<string, unknown>>,
 *   currentEntityId: string,
 *   catalog?: Record<string, unknown> | null,
 *   currentObjectTypeKey: string,
 *   fetchEntity: (entityId: string, objectTypeKey: string) => Promise<Record<string, unknown> | null>,
 * }} params
 * @returns {Promise<{ entityId: string, objectTypeKey: string, label: string, displayNumber: string | null, relationKey: string } | null>}
 */
export async function resolveParentContextFromRelations({
  instances = [],
  currentEntityId,
  catalog = null,
  currentObjectTypeKey,
  fetchEntity,
}) {
  const normalizedEntityId = normalizeId(currentEntityId);
  const normalizedObjectTypeKey = normalizeId(currentObjectTypeKey);

  if (!normalizedEntityId || !normalizedObjectTypeKey) {
    return null;
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const hierarchyKeys = listHierarchyParentRelationKeys(
    relations,
    normalizedObjectTypeKey,
  );

  if (!hierarchyKeys.size) {
    return null;
  }

  const parentRef = findHierarchyParentInstance(
    instances,
    normalizedEntityId,
    hierarchyKeys,
  );

  if (!parentRef?.parentEntityId || !parentRef?.parentObjectTypeKey) {
    return null;
  }

  const titleFieldKey = resolveTitleFieldKeyForObjectType(
    catalog,
    parentRef.parentObjectTypeKey,
  );

  let label = "";

  try {
    const parentEntity = await fetchEntity(
      parentRef.parentEntityId,
      parentRef.parentObjectTypeKey,
    );

    if (parentEntity) {
      label = resolveEntityDisplayTitle({
        entity: parentEntity,
        catalog,
        objectTypeKey: parentRef.parentObjectTypeKey,
        titleFieldKey,
      });
    }
  } catch {
    label = "";
  }

  if (!label) {
    return null;
  }

  return {
    entityId: parentRef.parentEntityId,
    objectTypeKey: parentRef.parentObjectTypeKey,
    label,
    displayNumber: parentRef.parentEntityId,
    relationKey: parentRef.relationKey,
  };
}

/**
 * @param {Array<Record<string, unknown>>} instances
 * @param {string} currentEntityId
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string} currentObjectTypeKey
 */
export function filterInstancesForParentSection(
  instances,
  currentEntityId,
  catalog,
  currentObjectTypeKey,
) {
  const hierarchyKeys = listHierarchyParentRelationKeys(
    Array.isArray(catalog?.relations) ? catalog.relations : [],
    currentObjectTypeKey,
  );

  const parentRef = findHierarchyParentInstance(
    instances,
    currentEntityId,
    hierarchyKeys,
  );

  if (!parentRef) {
    return { hierarchyKeys, parentRef: null, usedInstance: null };
  }

  const usedInstance =
    instances.find(
      (item) =>
        normalizeId(item?.relation_key) === parentRef.relationKey &&
        normalizeId(item?.target_entity_id) === normalizeId(currentEntityId) &&
        normalizeId(item?.source_entity_id) === parentRef.parentEntityId,
    ) || null;

  return { hierarchyKeys, parentRef, usedInstance };
}
