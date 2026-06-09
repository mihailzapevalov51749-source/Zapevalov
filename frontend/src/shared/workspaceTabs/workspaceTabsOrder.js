function toTimestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Stable display order for workspace tabs.
 * Uses sort_order, then created_at. Does not use last_opened_at or active state.
 */
export function sortWorkspaceTabs(items) {
  return [...(items || [])].sort((left, right) => {
    const sortDelta = Number(left?.sort_order ?? 100) - Number(right?.sort_order ?? 100);
    if (sortDelta !== 0) {
      return sortDelta;
    }

    const createdDelta =
      toTimestamp(left?.created_at) - toTimestamp(right?.created_at);
    if (createdDelta !== 0) {
      return createdDelta;
    }

    return String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

export function resolveNextWorkspaceTabSortOrder(items) {
  const maxSortOrder = (items || []).reduce((max, tab) => {
    return Math.max(max, Number(tab?.sort_order ?? 0));
  }, 0);

  return maxSortOrder + 1;
}
