import {
  listHierarchySubtaskRelationKeys,
} from "../../../shared/relation/hierarchyRelationProfile.js";
import { resolveEntityTitle } from "./resolveEntityTitle.js";

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
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveSubtaskDisplayFieldKeys(catalog, objectTypeKey) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = Array.isArray(objectType?.fields) ? objectType.fields : [];

  const titleField = fields.find((field) => field?.is_title || field?.isTitle);
  const statusField = fields.find((field) => {
    const fieldKey = normalizeId(field?.key).toLowerCase();

    return fieldKey === "status" || fieldKey.endsWith("_status");
  });

  const assigneeField = fields.find((field) => {
    const fieldKey = normalizeId(field?.key).toLowerCase();
    const label = String(field?.label || field?.name || "").toLowerCase();

    return (
      fieldKey.includes("assignee") ||
      fieldKey.includes("executor") ||
      fieldKey.includes("responsible") ||
      fieldKey.includes("ispoln") ||
      label.includes("исполнит")
    );
  });

  const dueField = fields.find((field) => {
    const fieldKey = normalizeId(field?.key).toLowerCase();
    const label = String(field?.label || field?.name || "").toLowerCase();

    return (
      fieldKey.includes("due") ||
      fieldKey.includes("deadline") ||
      fieldKey.includes("srok") ||
      label.includes("срок")
    );
  });

  return {
    titleFieldKey: normalizeId(titleField?.key || titleField?.field_key),
    statusFieldKey: normalizeId(statusField?.key || statusField?.field_key),
    assigneeFieldKey: normalizeId(assigneeField?.key || assigneeField?.field_key),
    dueFieldKey: normalizeId(dueField?.key || dueField?.field_key),
  };
}

export function readRelationEntityFieldLabel(values, fieldKey) {
  const key = normalizeId(fieldKey);

  if (!key || !values || typeof values !== "object") {
    return "";
  }

  const raw = values[key];

  if (raw == null || raw === "") {
    return "";
  }

  if (typeof raw === "object") {
    return String(
      raw.label || raw.name || raw.title || raw.display_name || "",
    ).trim();
  }

  return String(raw);
}

/**
 * Outgoing hierarchy instances: current entity = parent (source).
 *
 * @param {Array<Record<string, unknown>>} instances
 * @param {string} currentEntityId
 * @param {Set<string>} hierarchyRelationKeys
 */
export function findHierarchySubtaskInstances(
  instances,
  currentEntityId,
  hierarchyRelationKeys,
) {
  const currentId = normalizeId(currentEntityId);
  const items = [];

  for (const instance of Array.isArray(instances) ? instances : []) {
    const relationKey = normalizeId(instance?.relation_key);

    if (!relationKey || !hierarchyRelationKeys.has(relationKey)) {
      continue;
    }

    const sourceId = normalizeId(instance?.source_entity_id);
    const targetId = normalizeId(instance?.target_entity_id);

    if (sourceId === currentId && targetId && targetId !== currentId) {
      items.push({
        relationKey,
        relationInstanceId: normalizeId(instance?.id),
        entityId: targetId,
        objectTypeKey: normalizeId(instance?.target_object_type_key),
      });
    }
  }

  return items;
}


/**
 * @param {{
 *   instances?: Array<Record<string, unknown>>,
 *   currentEntityId: string,
 *   catalog?: Record<string, unknown> | null,
 *   currentObjectTypeKey: string,
 *   fetchEntity: (entityId: string, objectTypeKey: string) => Promise<Record<string, unknown> | null>,
 * }} params
 */
export async function resolveSubtasksFromRelations({
  instances = [],
  currentEntityId,
  catalog = null,
  currentObjectTypeKey,
  fetchEntity,
}) {
  const normalizedEntityId = normalizeId(currentEntityId);
  const normalizedObjectTypeKey = normalizeId(currentObjectTypeKey);

  if (!normalizedEntityId || !normalizedObjectTypeKey) {
    return [];
  }

  const hierarchyKeys = listHierarchySubtaskRelationKeys(
    Array.isArray(catalog?.relations) ? catalog.relations : [],
    normalizedObjectTypeKey,
  );

  if (!hierarchyKeys.size) {
    return [];
  }

  const refs = findHierarchySubtaskInstances(
    instances,
    normalizedEntityId,
    hierarchyKeys,
  );

  const displayKeys = resolveSubtaskDisplayFieldKeys(
    catalog,
    normalizedObjectTypeKey,
  );

  const subtasks = [];

  for (const ref of refs) {
    if (!ref.entityId || !ref.objectTypeKey) {
      continue;
    }

    let title = "";
    let status = "";
    let assignee = "";

    try {
      const childEntity = await fetchEntity(ref.entityId, ref.objectTypeKey);

      if (childEntity) {
        const values =
          childEntity?.values && typeof childEntity.values === "object"
            ? childEntity.values
            : {};

        title = resolveEntityTitle(values, displayKeys.titleFieldKey);
        status =
          readRelationEntityFieldLabel(values, displayKeys.statusFieldKey) ||
          String(childEntity?.status || "").trim();
        assignee = readRelationEntityFieldLabel(values, displayKeys.assigneeFieldKey);
      }
    } catch {
      title = "";
    }

    if (!title) {
      continue;
    }

    subtasks.push({
      relationKey: ref.relationKey,
      relationInstanceId: ref.relationInstanceId,
      entityId: ref.entityId,
      objectTypeKey: ref.objectTypeKey,
      title,
      status: status || "—",
      assignee: assignee || "—",
    });
  }

  return subtasks.sort((left, right) =>
    left.title.localeCompare(right.title, "ru"),
  );
}
