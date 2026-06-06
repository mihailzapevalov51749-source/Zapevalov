import { computeObjectTypePublishFlags } from "./objectTypePublishState.js";

/**
 * Business-facing publication status for Studio Preview context block.
 *
 * @param {{
 *   objectType?: object | null,
 *   catalogVersion?: string | number | null,
 *   hasMenuPlacement?: boolean,
 *   isDraftDirty?: boolean,
 * }} params
 */
export function resolveObjectTypePreviewStatusLabel({
  objectType = null,
  catalogVersion = null,
  hasMenuPlacement = false,
  isDraftDirty = false,
} = {}) {
  if (String(objectType?.status || "").toLowerCase() === "archived") {
    return "Скрыт";
  }

  const flags = computeObjectTypePublishFlags(objectType, {
    catalogVersion,
    hasMenuPlacement,
  });

  if (flags.hasPublishedBaseline && flags.needsContentSync) {
    return "Опубликовано + есть черновик";
  }

  if (flags.hasPublishedBaseline) {
    return "Опубликовано";
  }

  if (isDraftDirty) {
    return "Черновик";
  }

  return "Черновик";
}
