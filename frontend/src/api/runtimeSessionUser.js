import { getMe } from "./authApi.js";
import { getTenantMe } from "./tenantMeApi.js";
import {
  getBridgeMe,
  hasActiveBridgeSession,
  isBridgeSessionUser,
  normalizeBridgeSessionUser,
} from "./sessionBridgeApi.js";
import {
  getPlatformIdentityMe,
  mapPlatformIdentityProfileToRuntimeUser,
} from "./platformIdentityProfileApi.js";
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
    phone: user.phone || "",
    avatar_url: user.avatar_url || user.avatar || "",
  };
}

async function loadBridgeRuntimeSessionUser() {
  const bridgeContext = await getBridgeMe();
  const profile = await getPlatformIdentityMe();
  return mapRuntimeUserForHeader(
    mapPlatformIdentityProfileToRuntimeUser(profile, {
      ...bridgeContext,
      is_bridge_session: true,
    }),
  );
}

/**
 * Load runtime user for header/profile.
 * Bridge session: access context from /auth/session-bridge/me,
 * profile fields from /platform-identity/me (single SoT).
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
      return await loadBridgeRuntimeSessionUser();
    } catch {
      const stored = getStoredCurrentUser();
      if (isBridgeSessionUser(stored)) {
        const bridgeContext = normalizeBridgeSessionUser(stored) || stored;
        try {
          const profile = await getPlatformIdentityMe();
          return mapRuntimeUserForHeader(
            mapPlatformIdentityProfileToRuntimeUser(profile, {
              ...bridgeContext,
              is_bridge_session: true,
            }),
          );
        } catch {
          return mapRuntimeUserForHeader(bridgeContext);
        }
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
