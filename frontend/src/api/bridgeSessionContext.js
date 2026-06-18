export const BRIDGE_TOKEN_KEY = "bridge_token";
export const BRIDGE_CONTEXT_KEY = "bridge_session_context";

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getBridgeToken() {
  return localStorage.getItem(BRIDGE_TOKEN_KEY);
}

export function setBridgeToken(token) {
  if (token) {
    localStorage.setItem(BRIDGE_TOKEN_KEY, String(token));
    return;
  }
  localStorage.removeItem(BRIDGE_TOKEN_KEY);
}

export function getBridgeSessionContext() {
  const context = readJson(BRIDGE_CONTEXT_KEY);
  if (!context || typeof context !== "object") {
    return null;
  }
  return context;
}

export function persistBridgeSessionContext(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const portalId = Number(payload.portal_id);
  const context = {
    portal_id: Number.isFinite(portalId) && portalId > 0 ? portalId : null,
    database_name: String(payload.database_name || ""),
    tenant_code: String(payload.tenant_code || ""),
    environment_key: payload.environment_key
      ? String(payload.environment_key)
      : null,
    redirect_path: payload.redirect_path
      ? String(payload.redirect_path)
      : null,
    established_at: Date.now(),
  };

  localStorage.setItem(BRIDGE_CONTEXT_KEY, JSON.stringify(context));
  return context;
}

export function clearBridgeSessionStorage() {
  localStorage.removeItem(BRIDGE_TOKEN_KEY);
  localStorage.removeItem(BRIDGE_CONTEXT_KEY);
}

export function hasActiveBridgeSession() {
  return Boolean(getBridgeToken());
}

export function resolveBridgePortalId(fallback = null) {
  const contextPortalId = Number(getBridgeSessionContext()?.portal_id);
  if (Number.isFinite(contextPortalId) && contextPortalId > 0) {
    return contextPortalId;
  }

  const user = readJson("currentUser");
  if (user?.is_bridge_session) {
    const userPortalId = Number(user.portal_id);
    if (Number.isFinite(userPortalId) && userPortalId > 0) {
      return userPortalId;
    }
  }

  const parsedFallback = Number(fallback);
  if (Number.isFinite(parsedFallback) && parsedFallback > 0) {
    return parsedFallback;
  }

  return null;
}

export function resolveBridgeRedirectPath({
  redirectParam,
  exchangePayload,
  bridgeUser,
} = {}) {
  const candidates = [
    String(redirectParam || "").trim(),
    String(exchangePayload?.redirect_path || "").trim(),
    String(getBridgeSessionContext()?.redirect_path || "").trim(),
  ];

  const portalId = Number(
    exchangePayload?.portal_id ?? bridgeUser?.portal_id ?? resolveBridgePortalId(),
  );

  for (const candidate of candidates) {
    if (!candidate.startsWith("/")) {
      continue;
    }
    if (candidate === "/") {
      continue;
    }
    if (
      Number.isFinite(portalId) &&
      portalId > 0 &&
      candidate.startsWith("/portal/") &&
      !candidate.startsWith(`/portal/${portalId}/`)
    ) {
      continue;
    }
    return candidate;
  }

  if (Number.isFinite(portalId) && portalId > 0) {
    return `/portal/${portalId}`;
  }

  return null;
}
