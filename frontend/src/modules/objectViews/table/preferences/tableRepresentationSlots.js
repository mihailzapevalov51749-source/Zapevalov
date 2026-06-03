import { canOccupyRepresentationSlot } from "./tableBaseState";

/**
 * Removes legacy pinned keys (default_table, system views) from bar prefs.
 */
export function sanitizePinnedViewKeys(pinnedKeys, slotViews) {
  const allowed = new Set(
    (slotViews || [])
      .map((item) => String(item?.contract?.key || item?.key || "").trim())
      .filter(Boolean),
  );

  return (Array.isArray(pinnedKeys) ? pinnedKeys : [])
    .map(String)
    .filter((key) => allowed.has(key));
}

export { canOccupyRepresentationSlot };
