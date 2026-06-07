import { resolveEntityTitleFieldKey } from "../../objectEntities/services/resolveEntityDisplayTitle.js";

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveTitleFieldKey(catalog, objectTypeKey) {
  return resolveEntityTitleFieldKey({ catalog, objectTypeKey }) || "";
}
