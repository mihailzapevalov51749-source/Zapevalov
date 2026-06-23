import { normalizeCurrentUser } from "../../../api/authApi.js";
import { loadRuntimeSessionUser } from "../../../api/runtimeSessionUser.js";
import {
  getBridgeMe,
  hasActiveBridgeSession,
  isBridgeSessionUser,
  normalizeBridgeSessionUser,
} from "../../../api/sessionBridgeApi.js";
import { getStoredCurrentUser } from "../../designer/constants/designerRoles.js";

async function resolveBridgeAdminSessionUser() {
  try {
    return normalizeCurrentUser(await getBridgeMe());
  } catch {
    const stored = getStoredCurrentUser();
    if (isBridgeSessionUser(stored)) {
      return normalizeCurrentUser(normalizeBridgeSessionUser(stored) || stored);
    }
    return null;
  }
}

/**
 * Resolve current user for tenant administration gates.
 * Bridge session must never fall back to login-only /users/me.
 */
export async function loadTenantAdminSessionUser(outletUser = null) {
  if (hasActiveBridgeSession()) {
    const bridgeUser = await resolveBridgeAdminSessionUser();
    if (bridgeUser) {
      return bridgeUser;
    }

    return normalizeCurrentUser(outletUser ?? null);
  }

  const runtimeUser = await loadRuntimeSessionUser();
  if (runtimeUser) {
    return normalizeCurrentUser(runtimeUser);
  }

  return normalizeCurrentUser(outletUser ?? null);
}
