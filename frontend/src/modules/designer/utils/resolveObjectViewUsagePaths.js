import { resolveObjectTypeMenuPlacementPaths } from "./resolveObjectTypeMenuPlacementPaths.js";

/**
 * Office-only published menu placement paths for an object view tab.
 *
 * @param {string | number} tenantId
 * @param {string | number} objectTypeId
 */
export async function resolveObjectViewUsagePaths(tenantId, objectTypeId) {
  const menuPaths = await resolveObjectTypeMenuPlacementPaths(tenantId, objectTypeId);

  return Array.from(
    new Set(
      menuPaths.filter((path) => String(path || "").startsWith("Офис → ")),
    ),
  );
}
