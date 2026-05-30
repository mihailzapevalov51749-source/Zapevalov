import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";
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
    const { title, relationType } = resolveRelationMeta(
      catalogRelation,
      relatedRef.direction,
    );

    draftItems.push({
      relationKey,
      title,
      direction: relatedRef.direction,
      relationType,
      relationInstanceId: normalizeId(instance?.id),
      entityId: relatedRef.entityId,
      objectTypeKey: relatedRef.objectTypeKey,
      isSameObjectType:
        relatedRef.objectTypeKey === normalizeId(currentObjectTypeKey),
      objectTypeLabel: resolveObjectTypeLabel(catalog, relatedRef.objectTypeKey),
    });
  }

  const enrichedItems = await mapWithConcurrency(draftItems, async (item) => {
    let rawEntity = null;
    let title = "";
    let status = "";
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

        status = String(rawEntity?.status || "").trim();
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
      rawEntity,
      loadError,
      canOpen:
        Boolean(tenantId) &&
        Boolean(rawEntity) &&
        !loadError &&
        item.isSameObjectType,
    };
  });

  const groupsMap = new Map();

  for (const item of enrichedItems) {
    const groupKey = `${item.relationKey}__${item.direction}`;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        relationKey: item.relationKey,
        title: item.title,
        direction: item.direction,
        relationType: item.relationType,
        items: [],
      });
    }

    groupsMap.get(groupKey).items.push({
      relationInstanceId: item.relationInstanceId,
      entityId: item.entityId,
      objectTypeKey: item.objectTypeKey,
      objectTypeLabel: item.objectTypeLabel,
      title: item.title,
      status: item.status,
      rawEntity: item.rawEntity,
      canOpen: item.canOpen,
      loadError: item.loadError,
    });
  }

  return [...groupsMap.values()].sort((left, right) => {
    const titleCompare = left.title.localeCompare(right.title, "ru");

    if (titleCompare !== 0) {
      return titleCompare;
    }

    return left.direction.localeCompare(right.direction, "ru");
  });
}
