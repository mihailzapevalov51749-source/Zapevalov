import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";
import {
  isHierarchyRelationDefinition,
  isHierarchySubtaskParentRelationDefinition,
} from "../../../shared/relation/hierarchyRelationProfile.js";
import { resolveHierarchyChildUiLabels } from "../../../shared/relation/hierarchyRelationDisplayLabels.js";
import {
  readRelationEntityFieldLabel,
  resolveSubtaskDisplayFieldKeys,
} from "./resolveSubtasksFromRelations.js";
import { resolveEntityTitle } from "./resolveEntityTitle";

const DEFAULT_CONCURRENCY = 4;

function normalizeId(value) {
  return String(value ?? "").trim();
}

function buildCatalogRelationsMap(catalog) {
  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];

  return new Map(
    relations
      .map((relation) => {
        const key = normalizeId(relation?.key);

        if (!key) {
          return null;
        }

        return [key, relation];
      })
      .filter(Boolean),
  );
}

function resolveObjectTypeLabel(catalog, objectTypeKey) {
  const key = normalizeId(objectTypeKey);

  if (!key) {
    return "";
  }

  const objectType = findCatalogObjectType(catalog, key);

  return String(
    objectType?.name ||
      objectType?.title ||
      objectType?.label ||
      objectType?.display_name ||
      key,
  ).trim();
}

function resolveRelationMeta(catalogRelation, direction) {
  const name = String(catalogRelation?.name || catalogRelation?.key || "Связь");
  const reverseName = String(catalogRelation?.reverse_name || "").trim();

  if (direction === "incoming" && reverseName) {
    return {
      title: reverseName,
      relationType: String(catalogRelation?.relation_type || ""),
    };
  }

  return {
    title: name,
    relationType: String(catalogRelation?.relation_type || ""),
  };
}

function resolveRelatedEntityRef(instance, currentEntityId) {
  const currentId = normalizeId(currentEntityId);
  const sourceId = normalizeId(instance?.source_entity_id);
  const targetId = normalizeId(instance?.target_entity_id);

  if (sourceId === currentId) {
    return {
      entityId: targetId,
      objectTypeKey: normalizeId(instance?.target_object_type_key),
      direction: "outgoing",
    };
  }

  if (targetId === currentId) {
    return {
      entityId: sourceId,
      objectTypeKey: normalizeId(instance?.source_object_type_key),
      direction: "incoming",
    };
  }

  return null;
}

function shouldHideHierarchyInstanceInRelatedTab(
  catalogRelation,
  relatedRef,
  currentObjectTypeKey,
) {
  if (
    !catalogRelation ||
    !relatedRef ||
    !isHierarchyRelationDefinition(catalogRelation, currentObjectTypeKey)
  ) {
    return false;
  }

  const settings =
    catalogRelation.settings_json && typeof catalogRelation.settings_json === "object"
      ? catalogRelation.settings_json
      : {};

  const parentSide = normalizeId(settings.parent_entity_side || "source");
  const childSide = normalizeId(settings.child_entity_side || "target");

  if (parentSide === "source" && childSide === "target") {
    return relatedRef.direction === "incoming";
  }

  if (parentSide === "target" && childSide === "source") {
    return relatedRef.direction === "outgoing";
  }

  return false;
}

function isHierarchyChildrenPresentation(
  catalogRelation,
  relatedRef,
  currentObjectTypeKey,
) {
  return (
    isHierarchySubtaskParentRelationDefinition(catalogRelation, currentObjectTypeKey) &&
    relatedRef?.direction === "outgoing"
  );
}

async function mapWithConcurrency(items, mapper, concurrency = DEFAULT_CONCURRENCY) {
  if (!items.length) {
    return [];
  }

  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );

  await Promise.all(workers);

  return results;
}

/**
 * @param {{
 *   instances: Array<Record<string, unknown>>,
 *   currentEntityId: string,
 *   catalog: Record<string, unknown> | null,
 *   tenantId: number | null,
 *   currentObjectTypeKey: string | null,
 *   fetchEntity: (entityId: string, objectTypeKey: string) => Promise<Record<string, unknown> | null>,
 * }} params
 * @returns {Promise<{
 *   hierarchyChildGroups: Array<Record<string, unknown>>,
 *   regularGroups: Array<Record<string, unknown>>,
 * }>}
 */
export async function mapRelationInstancesToGroups({
  instances = [],
  currentEntityId,
  catalog = null,
  tenantId = null,
  currentObjectTypeKey = null,
  fetchEntity,
}) {
  const catalogByKey = buildCatalogRelationsMap(catalog);
  const normalizedObjectTypeKey = normalizeId(currentObjectTypeKey);
  const displayKeys = resolveSubtaskDisplayFieldKeys(catalog, normalizedObjectTypeKey);
  const draftItems = [];

  for (const instance of instances) {
    const relationKey = normalizeId(instance?.relation_key);

    if (!relationKey) {
      continue;
    }

    const relatedRef = resolveRelatedEntityRef(instance, currentEntityId);

    if (!relatedRef?.entityId || !relatedRef?.objectTypeKey) {
      continue;
    }

    const catalogRelation = catalogByKey.get(relationKey) || {
      key: relationKey,
      name: relationKey,
    };

    if (
      shouldHideHierarchyInstanceInRelatedTab(
        catalogRelation,
        relatedRef,
        normalizedObjectTypeKey,
      )
    ) {
      continue;
    }

    const { title, relationType } = resolveRelationMeta(
      catalogRelation,
      relatedRef.direction,
    );
    const presentation = isHierarchyChildrenPresentation(
      catalogRelation,
      relatedRef,
      normalizedObjectTypeKey,
    )
      ? "hierarchy-children"
      : "generic";

    draftItems.push({
      relationKey,
      title,
      direction: relatedRef.direction,
      relationType,
      relationInstanceId: normalizeId(instance?.id),
      entityId: relatedRef.entityId,
      objectTypeKey: relatedRef.objectTypeKey,
      isSameObjectType: relatedRef.objectTypeKey === normalizedObjectTypeKey,
      objectTypeLabel: resolveObjectTypeLabel(catalog, relatedRef.objectTypeKey),
      presentation,
      catalogRelation,
      uiLabels:
        presentation === "hierarchy-children"
          ? resolveHierarchyChildUiLabels(catalogRelation)
          : null,
    });
  }

  const enrichedItems = await mapWithConcurrency(draftItems, async (item) => {
    let rawEntity = null;
    let title = "";
    let status = "";
    let assignee = "";
    let dueDate = "";
    let loadError = null;

    try {
      rawEntity = await fetchEntity(item.entityId, item.objectTypeKey);

      if (rawEntity) {
        const objectType = findCatalogObjectType(catalog, item.objectTypeKey);
        const fields = Array.isArray(objectType?.fields) ? objectType.fields : [];
        const titleField = fields.find((field) => field?.is_title || field?.isTitle);
        const titleFieldKey = String(
          titleField?.key || titleField?.field_key || "",
        ).trim();

        const values =
          rawEntity?.values && typeof rawEntity.values === "object"
            ? rawEntity.values
            : {};

        title =
          resolveEntityTitle(values, titleFieldKey) ||
          String(item.objectTypeLabel || item.objectTypeKey || "Сущность");

        status =
          readRelationEntityFieldLabel(values, displayKeys.statusFieldKey) ||
          String(rawEntity?.status || "").trim();
        assignee = readRelationEntityFieldLabel(values, displayKeys.assigneeFieldKey);
        dueDate = readRelationEntityFieldLabel(values, displayKeys.dueFieldKey);
      } else {
        loadError = "not_found";
        title = "Сущность недоступна";
      }
    } catch {
      loadError = "load_failed";
      title = "Не удалось загрузить сущность";
    }

    return {
      ...item,
      title,
      status: status || "—",
      assignee: assignee || "—",
      dueDate: dueDate || "—",
      rawEntity,
      loadError,
      canOpen:
        Boolean(tenantId) &&
        Boolean(rawEntity) &&
        !loadError &&
        item.isSameObjectType,
    };
  });

  const hierarchyGroupsMap = new Map();
  const regularGroupsMap = new Map();

  for (const item of enrichedItems) {
    const targetMap =
      item.presentation === "hierarchy-children"
        ? hierarchyGroupsMap
        : regularGroupsMap;
    const groupKey = `${item.relationKey}__${item.direction}`;

    if (!targetMap.has(groupKey)) {
      targetMap.set(groupKey, {
        relationKey: item.relationKey,
        title:
          item.presentation === "hierarchy-children"
            ? item.uiLabels?.groupTitle || item.title
            : item.title,
        direction: item.direction,
        relationType: item.relationType,
        presentation: item.presentation,
        uiLabels: item.uiLabels,
        items: [],
      });
    }

    targetMap.get(groupKey).items.push({
      relationInstanceId: item.relationInstanceId,
      entityId: item.entityId,
      objectTypeKey: item.objectTypeKey,
      objectTypeLabel: item.objectTypeLabel,
      title: item.title,
      status: item.status,
      assignee: item.assignee,
      dueDate: item.dueDate,
      rawEntity: item.rawEntity,
      canOpen: item.canOpen,
      loadError: item.loadError,
    });
  }

  const sortGroups = (groups) =>
    [...groups].sort((left, right) => {
      const titleCompare = left.title.localeCompare(right.title, "ru");

      if (titleCompare !== 0) {
        return titleCompare;
      }

      return left.direction.localeCompare(right.direction, "ru");
    });

  return {
    hierarchyChildGroups: sortGroups([...hierarchyGroupsMap.values()]),
    regularGroups: sortGroups([...regularGroupsMap.values()]),
  };
}
