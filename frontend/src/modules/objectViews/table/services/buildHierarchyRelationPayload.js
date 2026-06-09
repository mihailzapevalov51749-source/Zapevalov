import { resolveHierarchyRelationEntitySides } from "./resolveHierarchyRelationEntitySides.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

/**
 * @param {Record<string, unknown> | null | undefined} entity
 */
export function resolveEntityObjectTypeKey(entity) {
  if (!entity || typeof entity !== "object") {
    return "";
  }

  return normalizeKey(entity.object_type_key ?? entity.objectTypeKey);
}

/**
 * Maps parent/child entity ids to relation source/target using published object type keys.
 *
 * @param {Record<string, unknown> | null | undefined} relationDefinition
 * @param {string} parentId
 * @param {string} childId
 * @param {Map<string, { entity?: Record<string, unknown> }> | null | undefined} [nodesById]
 */
export function buildHierarchyRelationPayload(
  relationDefinition,
  parentId,
  childId,
  nodesById = null,
) {
  const normalizedParentId = normalizeKey(parentId);
  const normalizedChildId = normalizeKey(childId);
  const relationKey = normalizeKey(relationDefinition?.key) || "relation";
  const sourceObjectTypeKey = normalizeKey(relationDefinition?.source_object_type_key);
  const targetObjectTypeKey = normalizeKey(relationDefinition?.target_object_type_key);

  if (!normalizedParentId || !normalizedChildId) {
    throw new Error("buildHierarchyRelationPayload: parentId and childId are required");
  }

  const parentNode = nodesById?.get(normalizedParentId);
  const childNode = nodesById?.get(normalizedChildId);
  const parentObjectTypeKey = resolveEntityObjectTypeKey(parentNode?.entity);
  const childObjectTypeKey = resolveEntityObjectTypeKey(childNode?.entity);

  if (parentObjectTypeKey && childObjectTypeKey && sourceObjectTypeKey && targetObjectTypeKey) {
    if (parentObjectTypeKey === sourceObjectTypeKey && childObjectTypeKey === targetObjectTypeKey) {
      return {
        source_entity_id: normalizedParentId,
        target_entity_id: normalizedChildId,
      };
    }

    if (parentObjectTypeKey === targetObjectTypeKey && childObjectTypeKey === sourceObjectTypeKey) {
      return {
        source_entity_id: normalizedChildId,
        target_entity_id: normalizedParentId,
      };
    }

    throw new Error(
      `Связь «${relationKey}» допускает parent ${sourceObjectTypeKey} → child ${targetObjectTypeKey}, ` +
        `но перемещение ${parentObjectTypeKey} → ${childObjectTypeKey} недопустимо. ` +
        "Для Plan нужна self-relation на текущем типе объекта.",
    );
  }

  const sides = resolveHierarchyRelationEntitySides(relationDefinition);

  if (sides.parentSide === "source" && sides.childSide === "target") {
    return {
      source_entity_id: normalizedParentId,
      target_entity_id: normalizedChildId,
    };
  }

  return {
    source_entity_id: normalizedChildId,
    target_entity_id: normalizedParentId,
  };
}
