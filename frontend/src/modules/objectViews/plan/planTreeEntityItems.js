import { getRuntimeEntity } from "../../runtimeWriteGateway/api/runtimeEntitiesApi.js";
import {
  getHierarchyParentChildEntityIds,
  resolveHierarchyRelationEntitySides,
} from "../table/services/resolveHierarchyRelationEntitySides.js";

const DEFAULT_FETCH_CONCURRENCY = 8;

/**
 * @param {Array<Record<string, unknown>> | null | undefined} items
 * @returns {Map<string, Record<string, unknown>>}
 */
export function indexPlanEntityItems(items) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byId = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const id = String(item?.id ?? item?.entity_id ?? "").trim();
    if (id) {
      byId.set(id, item);
    }
  }

  return byId;
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} instances
 * @param {Record<string, unknown> | null | undefined} relationDefinition
 * @returns {Set<string>}
 */
export function collectHierarchyEntityIds(instances, relationDefinition) {
  /** @type {Set<string>} */
  const ids = new Set();
  const sides = resolveHierarchyRelationEntitySides(relationDefinition);

  for (const instance of Array.isArray(instances) ? instances : []) {
    const { parentId, childId } = getHierarchyParentChildEntityIds(instance, sides);

    if (parentId) {
      ids.add(parentId);
    }

    if (childId) {
      ids.add(childId);
    }
  }

  return ids;
}

/**
 * @param {Set<string>} hierarchyEntityIds
 * @param {Map<string, Record<string, unknown>>} indexedItems
 * @returns {string[]}
 */
export function findMissingPlanEntityIds(hierarchyEntityIds, indexedItems) {
  return [...hierarchyEntityIds].filter((id) => !indexedItems.has(id));
}

/**
 * @param {Array<Record<string, unknown>>} baseItems
 * @param {Array<Record<string, unknown>>} supplementaryItems
 * @returns {Array<Record<string, unknown>>}
 */
export function mergePlanEntityItems(baseItems, supplementaryItems) {
  const merged = indexPlanEntityItems(baseItems);

  for (const item of Array.isArray(supplementaryItems) ? supplementaryItems : []) {
    const id = String(item?.id ?? item?.entity_id ?? "").trim();

    if (id && !merged.has(id)) {
      merged.set(id, item);
    }
  }

  return [...merged.values()];
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T) => Promise<void>} worker
 */
async function mapWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), queue.length || 1) },
    async () => {
      while (queue.length) {
        const next = queue.shift();
        if (next !== undefined) {
          await worker(next);
        }
      }
    },
  );

  await Promise.all(workers);
}

/**
 * @param {{
 *   tenantId: number | string | null | undefined,
 *   objectTypeKey: string | null | undefined,
 *   entityIds?: string[],
 *   concurrency?: number,
 * }} params
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchPlanTreeEntitiesByIds({
  tenantId,
  objectTypeKey,
  entityIds = [],
  concurrency = DEFAULT_FETCH_CONCURRENCY,
}) {
  const normalizedTenantId = Number(tenantId);
  const normalizedObjectTypeKey = String(objectTypeKey ?? "").trim();
  const ids = [...new Set(entityIds.map((id) => String(id || "").trim()).filter(Boolean))];

  if (!normalizedTenantId || !normalizedObjectTypeKey || !ids.length) {
    return [];
  }

  /** @type {Array<Record<string, unknown>>} */
  const loaded = [];

  await mapWithConcurrency(ids, concurrency, async (entityId) => {
    try {
      const entity = await getRuntimeEntity(
        normalizedTenantId,
        normalizedObjectTypeKey,
        entityId,
      );

      if (entity && typeof entity === "object") {
        loaded.push(entity);
      }
    } catch {
      // Keep partial tree data; missing fetch should not break the plan view.
    }
  });

  return loaded;
}
