import { getRelationFieldState } from "../../../api/runtimeRelationFieldsApi";
import { createRelationTableValue } from "./relationTableValue";

function buildStateKey(entityId, fieldKey) {
  return `${String(entityId).trim()}:${String(fieldKey).trim()}`;
}

/**
 * @param {{
 *   tenantId?: number | null,
 *   entityIds?: string[],
 *   relationColumns?: Array<{ key: string }>,
 * }} params
 * @returns {Promise<Map<string, ReturnType<typeof createRelationTableValue>>>}
 */
export async function preloadRelationFieldStatesForPage({
  tenantId = null,
  entityIds = [],
  relationColumns = [],
}) {
  const normalizedTenantId = Number(tenantId);

  if (!normalizedTenantId || !relationColumns.length || !entityIds.length) {
    return new Map();
  }

  const targets = [];

  for (const entityId of entityIds) {
    const normalizedEntityId = String(entityId ?? "").trim();

    if (!normalizedEntityId) {
      continue;
    }

    for (const column of relationColumns) {
      const fieldKey = String(column?.key ?? "").trim();

      if (!fieldKey) {
        continue;
      }

      targets.push({
        entityId: normalizedEntityId,
        fieldKey,
        cardinality: column.cardinality || "one",
        peerObjectTypeKey: column.peerObjectTypeKey || null,
      });
    }
  }

  if (!targets.length) {
    return new Map();
  }

  const entries = await Promise.all(
    targets.map(async (target) => {
      const cacheKey = buildStateKey(target.entityId, target.fieldKey);

      try {
        const state = await getRelationFieldState(
          normalizedTenantId,
          target.entityId,
          target.fieldKey,
        );

        const items = (Array.isArray(state?.items) ? state.items : []).map((item) => ({
          entity_id: String(item?.entity_id ?? "").trim(),
          title: String(item?.title || item?.entity_id || "").trim() || "Запись",
          relation_instance_id: String(item?.relation_instance_id ?? "").trim() || undefined,
          object_type_key: target.peerObjectTypeKey,
        }));

        return [
          cacheKey,
          createRelationTableValue({
            items,
            cardinality: state?.cardinality || target.cardinality,
          }),
        ];
      } catch {
        return [
          cacheKey,
          createRelationTableValue({
            items: [],
            cardinality: target.cardinality,
            error: "Не удалось загрузить связь",
          }),
        ];
      }
    }),
  );

  return new Map(entries);
}
