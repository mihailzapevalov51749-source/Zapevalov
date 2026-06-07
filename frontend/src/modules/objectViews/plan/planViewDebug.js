/** Set true locally to trace Plan runtime in the console (dev only, never in production). */
export const SHOW_PLAN_DEBUG = false;

function isPlanDebugEnabled() {
  return import.meta.env.DEV && SHOW_PLAN_DEBUG;
}

/**
 * Dev-only Plan diagnostics. No window globals.
 *
 * @param {string} tag
 * @param {Record<string, unknown>} payload
 */
export function logPlanDebug(tag, payload) {
  if (!isPlanDebugEnabled()) {
    return;
  }

  console.log(`[${tag}]`, payload);
}

/**
 * @param {...unknown} args
 */
export function debugPlan(...args) {
  if (!isPlanDebugEnabled()) {
    return;
  }

  console.log("[plan]", ...args);
}
