/**
 * Bridge between runtime entity writers (Quick Create, Action Executor, import)
 * and active Object Table query reload handlers.
 */

/** @type {((detail: { tenantId?: number | null, objectTypeKey?: string | null, entityId?: string | null }) => void | Promise<void>) | null} */
let reloadListener = null;

/**
 * @param {(detail: { tenantId?: number | null, objectTypeKey?: string | null, entityId?: string | null }) => void | Promise<void>} listener
 */
export function subscribeRuntimeEntityDataReload(listener) {
  reloadListener = listener;

  return () => {
    if (reloadListener === listener) {
      reloadListener = null;
    }
  };
}

/**
 * @param {{ tenantId?: number | null, objectTypeKey?: string | null, entityId?: string | null }} [detail]
 */
export function requestRuntimeEntityDataReload(detail = {}) {
  reloadListener?.(detail);
}
