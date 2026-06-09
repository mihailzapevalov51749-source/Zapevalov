function isDev() {
  return Boolean(import.meta.env?.DEV);
}

/**
 * @param {Record<string, unknown>} payload
 */
export function logPlanTreeMoveDebug(payload) {
  if (!isDev()) {
    return;
  }

  console.debug("[plan-tree-move]", payload);
}

/**
 * @param {Record<string, unknown> | null | undefined} descriptor
 */
export function logPlanTreeHoverDebug(descriptor) {
  if (!isDev()) {
    return;
  }

  console.debug("[plan-tree-hover]", descriptor);
}

/**
 * @param {Record<string, unknown> | null | undefined} descriptor
 */
export function logPlanTreeDropDebug(descriptor) {
  if (!isDev()) {
    return;
  }

  console.debug("[plan-tree-drop]", descriptor);
}

/**
 * @param {{
 *   url?: string,
 *   method?: string,
 *   payload?: unknown,
 *   response?: unknown,
 *   error?: unknown,
 * }} details
 */
export function logPlanTreeApiError(details) {
  if (!isDev()) {
    return;
  }

  console.error("[plan-tree-api]", details);
}

/**
 * @param {unknown} error
 */
export function formatPlanMoveApiError(error) {
  const response = error && typeof error === "object" ? error.response : null;
  const data =
    response && typeof response === "object" ? response.data : null;
  const detail = data && typeof data === "object" ? data.detail : null;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }

        return "";
      })
      .filter(Boolean)
      .join("; ");
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Не удалось переместить запись";
}
