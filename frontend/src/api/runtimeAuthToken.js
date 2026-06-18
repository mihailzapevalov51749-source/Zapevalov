import { getToken } from "./authApi.js";
import {
  getBridgeToken,
  hasActiveBridgeSession,
} from "./bridgeSessionContext.js";

/**
 * Runtime API auth: bridge_token first when bridge session is active.
 * Kept separate from sessionBridgeApi to avoid pulling bridge exchange
 * into the platform HTTP client chunk (WI-RT-012).
 *
 * @returns {{ token: string | null, kind: "login" | "bridge" | null }}
 */
export function getRuntimeAuthToken() {
  if (hasActiveBridgeSession()) {
    const bridgeToken = getBridgeToken();
    if (bridgeToken) {
      return { token: bridgeToken, kind: "bridge" };
    }
  }

  const loginToken = getToken();
  if (loginToken) {
    return { token: loginToken, kind: "login" };
  }

  return { token: null, kind: null };
}
