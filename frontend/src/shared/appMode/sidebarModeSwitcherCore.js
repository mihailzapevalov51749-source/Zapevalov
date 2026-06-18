import { canAccessControlPlane } from "../../modules/admin/access/adminAccess.js";
import { canAccessDesigner } from "../../modules/designer/constants/designerRoles.js";

const CONTROL_PLANE_BASE = "/control-plane";

function isControlPlanePath(pathname = "") {
  const normalized = String(pathname || "").replace(/\/+$/, "");
  return (
    normalized === CONTROL_PLANE_BASE
    || normalized.startsWith(`${CONTROL_PLANE_BASE}/`)
  );
}

export const APP_MODES = {
  OFFICE: "office",
  STUDIO: "studio",
  PLATFORM: "platform",
};

export const MODE_SWITCHER_LABELS = {
  [APP_MODES.OFFICE]: "Офис",
  [APP_MODES.STUDIO]: "Студия",
  [APP_MODES.PLATFORM]: "Платформа",
};

/**
 * @param {string} pathname
 * @returns {"office" | "studio" | "platform"}
 */
export function detectAppMode(pathname = "") {
  const normalized = String(pathname || "").trim();

  if (isControlPlanePath(normalized)) {
    return APP_MODES.PLATFORM;
  }

  if (normalized.startsWith("/designer")) {
    return APP_MODES.STUDIO;
  }

  return APP_MODES.OFFICE;
}

/**
 * @param {object | null | undefined} user
 * @returns {{ hasStudio: boolean, hasPlatform: boolean }}
 */
export function resolveModeSwitcherAccess(user) {
  return {
    hasStudio: canAccessDesigner(user),
    hasPlatform: canAccessControlPlane(user),
  };
}

/**
 * Build available mode transition targets (never includes current mode).
 *
 * @param {{ currentMode: string, access: { hasStudio?: boolean, hasPlatform?: boolean } }} params
 * @returns {Array<{ key: string, label: string }>}
 */
export function buildSidebarModeSwitcherOptions({ currentMode, access = {} }) {
  const hasStudio = Boolean(access.hasStudio);
  const hasPlatform = Boolean(access.hasPlatform);
  const options = [];

  if (currentMode === APP_MODES.OFFICE) {
    if (hasStudio) {
      options.push({
        key: APP_MODES.STUDIO,
        label: MODE_SWITCHER_LABELS[APP_MODES.STUDIO],
      });
    }
    if (hasPlatform) {
      options.push({
        key: APP_MODES.PLATFORM,
        label: MODE_SWITCHER_LABELS[APP_MODES.PLATFORM],
      });
    }
    return options;
  }

  if (currentMode === APP_MODES.STUDIO) {
    options.push({
      key: APP_MODES.OFFICE,
      label: MODE_SWITCHER_LABELS[APP_MODES.OFFICE],
    });
    if (hasPlatform) {
      options.push({
        key: APP_MODES.PLATFORM,
        label: MODE_SWITCHER_LABELS[APP_MODES.PLATFORM],
      });
    }
    return options;
  }

  if (currentMode === APP_MODES.PLATFORM) {
    options.push({
      key: APP_MODES.OFFICE,
      label: MODE_SWITCHER_LABELS[APP_MODES.OFFICE],
    });
    if (hasStudio) {
      options.push({
        key: APP_MODES.STUDIO,
        label: MODE_SWITCHER_LABELS[APP_MODES.STUDIO],
      });
    }
    return options;
  }

  return options;
}
