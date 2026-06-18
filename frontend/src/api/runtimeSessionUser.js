import { getMe } from "./authApi.js";
import { getTenantMe } from "./tenantMeApi.js";
import {
  getBridgeMe,
  hasActiveBridgeSession,
  isBridgeSessionUser,
  normalizeBridgeSessionUser,
} from "./sessionBridgeApi.js";
import { getStoredCurrentUser } from "../modules/designer/constants/designerRoles.js";

function resolveRuntimeDisplayName(user) {
  return (
    user?.full_name ||
    user?.display_name ||
    user?.name ||
    ""
  );
}

/**
 * Map login/tenant/bridge user into header/profile shape.
 *
 * @param {object | null | undefined} user
 * @returns {object | null}
 */
export function mapRuntimeUserForHeader(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const displayName = resolveRuntimeDisplayName(user);

  return {
    ...user,
    full_name: displayName,
    name: displayName,
    email: user.email || "",
  };
}

/**
 * Load runtime user for header/profile.
 * Bridge session bypasses tenant/login /users/me endpoints.
 *
 * @param {{ tenantId?: number | null }} [options]
 * @returns {Promise<object | null>}
 */
export async function loadRuntimeSessionUser({ tenantId = null } = {}) {
  const normalizedTenantId = Number(tenantId);
  const hasTenantContext =
    Number.isFinite(normalizedTenantId) && normalizedTenantId > 0;

  if (hasActiveBridgeSession()) {
    try {
      const bridgeUser = await getBridgeMe();
      return mapRuntimeUserForHeader(bridgeUser);
    } catch {
      const stored = getStoredCurrentUser();
      if (isBridgeSessionUser(stored)) {
        return mapRuntimeUserForHeader(
          normalizeBridgeSessionUser(stored) || stored,
        );
      }
    }
  }

  try {
    const data = hasTenantContext
      ? await getTenantMe(normalizedTenantId)
      : await getMe();
    return mapRuntimeUserForHeader(data);
  } catch {
    const stored = getStoredCurrentUser();
    return stored ? mapRuntimeUserForHeader(stored) : null;
  }
}
