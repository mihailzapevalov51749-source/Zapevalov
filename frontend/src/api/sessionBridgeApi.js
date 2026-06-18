import { API_BASE_URL } from "../config/apiConfig.js";
import { getMe, getToken, logout } from "./authApi.js";
import {
  BRIDGE_TOKEN_KEY,
  clearBridgeSessionStorage,
  getBridgeSessionContext,
  getBridgeToken,
  hasActiveBridgeSession,
  persistBridgeSessionContext,
  resolveBridgePortalId,
  resolveBridgeRedirectPath,
  setBridgeToken,
} from "./bridgeSessionContext.js";

export {
  BRIDGE_TOKEN_KEY,
  getBridgeToken,
  hasActiveBridgeSession,
  resolveBridgePortalId,
  setBridgeToken,
} from "./bridgeSessionContext.js";

export function clearBridgeSession() {
  clearBridgeSessionStorage();
}

export function normalizeBridgeSessionUser(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const portalId = Number(payload.portal_id);
  const isInfrastructureSuperadmin = Boolean(payload.is_infrastructure_superadmin);
  const effectiveRole = String(payload.effective_role || "").trim().toLowerCase();
  const roleName = isInfrastructureSuperadmin
    ? effectiveRole || "superadmin"
    : "";

  return {
    principal_type: String(payload.principal_type || "bridge"),
    platform_identity_id: String(payload.platform_identity_id || ""),
    platform_role: String(payload.platform_role || ""),
    portal_id: Number.isFinite(portalId) ? portalId : null,
    tenant_code: String(payload.tenant_code || ""),
    database_name: String(payload.database_name || ""),
    environment_key: payload.environment_key
      ? String(payload.environment_key)
      : null,
    ticket_id: payload.ticket_id ? String(payload.ticket_id) : undefined,
    is_bridge_session: true,
    is_infrastructure_superadmin: isInfrastructureSuperadmin,
    is_platform_owner: Boolean(payload.is_platform_owner),
    role: roleName || undefined,
    effective_role: effectiveRole || undefined,
    name:
      String(payload.display_name || payload.name || "").trim() ||
      (isInfrastructureSuperadmin ? "Platform Owner" : undefined),
    full_name:
      String(payload.display_name || payload.full_name || payload.name || "").trim() ||
      (isInfrastructureSuperadmin ? "Platform Owner" : undefined),
    email: payload.email ? String(payload.email) : undefined,
  };
}

async function parseBridgeApiError(response, fallbackMessage) {
  const errorText = await response.text();
  if (!errorText) {
    return fallbackMessage;
  }

  try {
    const payload = JSON.parse(errorText);
    const detail = payload?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
  } catch {
    // not JSON
  }

  return fallbackMessage;
}

function persistBridgeExchangeResult(data, redirectPath = null) {
  if (!data?.access_token) {
    throw new Error("Сервер не вернул Bridge Session JWT");
  }

  logout();
  setBridgeToken(data.access_token);
  persistBridgeSessionContext({
    ...data,
    redirect_path: redirectPath || data.redirect_path || null,
  });

  const bridgeUser = normalizeBridgeSessionUser(data);
  localStorage.setItem("currentUser", JSON.stringify(bridgeUser));
  return bridgeUser;
}

export async function exchangeBridgeTicket(bridgeTicket, options = {}) {
  const response = await fetch(`${API_BASE_URL}/auth/session-bridge/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      bridge_ticket: String(bridgeTicket || "").trim(),
    }),
  });

  if (!response.ok) {
    const message = await parseBridgeApiError(
      response,
      "Не удалось обменять bridge ticket",
    );
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const bridgeUser = persistBridgeExchangeResult(
    data,
    options.redirectPath || null,
  );

  return {
    ...data,
    bridgeUser,
  };
}

export async function getBridgeMe() {
  const token = getBridgeToken();
  if (!token) {
    throw new Error("Bridge token отсутствует");
  }

  const response = await fetch(`${API_BASE_URL}/auth/session-bridge/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearBridgeSession();
      localStorage.removeItem("currentUser");
    }
    const message = await parseBridgeApiError(
      response,
      "Bridge session недействительна",
    );
    throw new Error(message);
  }

  const payload = await response.json();
  const bridgeUser = normalizeBridgeSessionUser(payload);
  persistBridgeSessionContext({
    ...payload,
    redirect_path: getBridgeSessionContext()?.redirect_path || null,
  });
  localStorage.setItem("currentUser", JSON.stringify(bridgeUser));
  return bridgeUser;
}

/**
 * Resolve authenticated session.
 * Bridge session has priority when bridge_token is present.
 *
 * @returns {Promise<{ user: object | null, sessionType: "login" | "bridge" | null }>}
 */
export async function resolveAuthSession() {
  if (hasActiveBridgeSession()) {
    try {
      const user = await getBridgeMe();
      return { user, sessionType: "bridge" };
    } catch {
      clearBridgeSession();
      localStorage.removeItem("currentUser");
    }
  }

  if (getToken()) {
    try {
      const user = await getMe();
      localStorage.setItem("currentUser", JSON.stringify(user));
      return { user, sessionType: "login" };
    } catch {
      logout();
    }
  }

  localStorage.removeItem("currentUser");
  return { user: null, sessionType: null };
}

export function isBridgeSessionUser(user) {
  return Boolean(user?.is_bridge_session);
}

/**
 * Runtime API auth: bridge_token first when bridge session is active.
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

export { resolveBridgeRedirectPath };
