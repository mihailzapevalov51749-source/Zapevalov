/** @typedef {import('./planTreeApi.js').fetchPlanTree extends (...args: any) => Promise<infer R> ? R : never} PlanTreePayload */

/** @type {Map<string, PlanTreePayload>} */
const cache = new Map();

/**
 * @param {{
 *   tenantId?: number | string | null,
 *   objectTypeKey?: string | null,
 *   viewKey?: string | null,
 *   relationKey?: string | null,
 * }} scope
 */
export function buildPlanTreeCacheKey({
  tenantId,
  objectTypeKey,
  viewKey,
  relationKey,
}) {
  return [
    Number(tenantId) || 0,
    String(objectTypeKey ?? "").trim(),
    String(viewKey ?? "").trim(),
    String(relationKey ?? "").trim(),
  ].join(":");
}

/**
 * @param {string} cacheKey
 * @returns {PlanTreePayload | null}
 */
export function getCachedPlanTree(cacheKey) {
  const normalizedKey = String(cacheKey ?? "").trim();
  if (!normalizedKey) {
    return null;
  }

  return cache.get(normalizedKey) ?? null;
}

/**
 * @param {string} cacheKey
 * @param {PlanTreePayload} payload
 */
export function setCachedPlanTree(cacheKey, payload) {
  const normalizedKey = String(cacheKey ?? "").trim();
  if (!normalizedKey || !payload) {
    return;
  }

  cache.set(normalizedKey, payload);
}

/**
 * @param {{
 *   tenantId?: number | string | null,
 *   objectTypeKey?: string | null,
 *   viewKey?: string | null,
 *   relationKey?: string | null,
 * }} [scope]
 */
export function invalidatePlanTreeCache(scope = {}) {
  const tenantId = Number(scope.tenantId) || 0;
  const objectTypeKey = String(scope.objectTypeKey ?? "").trim();
  const viewKey = String(scope.viewKey ?? "").trim();
  const relationKey = String(scope.relationKey ?? "").trim();

  if (!tenantId && !objectTypeKey && !viewKey && !relationKey) {
    cache.clear();
    return;
  }

  for (const key of [...cache.keys()]) {
    const [keyTenant, keyObjectType, keyView, keyRelation] = key.split(":");

    if (tenantId && Number(keyTenant) !== tenantId) {
      continue;
    }

    if (objectTypeKey && keyObjectType !== objectTypeKey) {
      continue;
    }

    if (viewKey && keyView !== viewKey) {
      continue;
    }

    if (relationKey && keyRelation !== relationKey) {
      continue;
    }

    cache.delete(key);
  }
}
