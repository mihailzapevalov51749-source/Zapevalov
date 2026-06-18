import { buildControlPlaneRoute } from "../../modules/controlPlane/config/controlPlanePaths.js";
import { resolveTenantIdFromPathname } from "../tenantContext/tenantContextResolver.js";
import { resolveTenantRuntimeEntryPath } from "../tenantContext/resolveTenantRuntimeEntryPath.js";
import {
  resolveOfficeToStudioPath,
  resolveStudioToOfficePathAsync,
} from "./appModeNavigation.js";
import {
  APP_MODES,
  MODE_SWITCHER_LABELS,
  buildSidebarModeSwitcherOptions,
  detectAppMode,
  resolveModeSwitcherAccess,
} from "./sidebarModeSwitcherCore.js";

export {
  APP_MODES,
  MODE_SWITCHER_LABELS,
  buildSidebarModeSwitcherOptions,
  detectAppMode,
  resolveModeSwitcherAccess,
};

/**
 * @param {"office" | "studio" | "platform"} targetKey
 * @param {{ pathname?: string, tenantIdFallback?: number }} context
 * @returns {Promise<string | null>}
 */
export async function resolveSidebarModeSwitchPath(
  targetKey,
  { pathname = "", tenantIdFallback = 1 } = {},
) {
  const normalizedPath = String(pathname || "").trim();
  const tenantFromPath = resolveTenantIdFromPathname(normalizedPath);
  const tenantId =
    tenantFromPath ??
    (Number(tenantIdFallback) > 0 ? Number(tenantIdFallback) : 1);

  switch (targetKey) {
    case APP_MODES.OFFICE:
      if (detectAppMode(normalizedPath) === APP_MODES.STUDIO) {
        return resolveStudioToOfficePathAsync(normalizedPath);
      }
      return resolveTenantRuntimeEntryPath(tenantId);

    case APP_MODES.STUDIO:
      return resolveOfficeToStudioPath(normalizedPath, tenantId);

    case APP_MODES.PLATFORM:
      return buildControlPlaneRoute();

    default:
      return null;
  }
}
