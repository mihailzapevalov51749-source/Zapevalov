import { API_BASE_URL } from "../config/apiConfig.js";
import { getRuntimeAuthToken } from "./runtimeAuthToken.js";

export async function getPlatformIdentityMe() {
  const { token } = getRuntimeAuthToken();
  if (!token) {
    throw new Error("Требуется авторизация");
  }

  const response = await fetch(`${API_BASE_URL}/platform-identity/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = "Не удалось загрузить профиль Platform Identity";
    if (errorText) {
      try {
        const payload = JSON.parse(errorText);
        if (typeof payload?.detail === "string" && payload.detail.trim()) {
          message = payload.detail.trim();
        }
      } catch {
        // not JSON
      }
    }
    throw new Error(message);
  }

  return response.json();
}

export function mapPlatformIdentityProfileToRuntimeUser(profile, bridgeContext = null) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const displayName = String(profile.full_name || "").trim();

  return {
    ...(bridgeContext && typeof bridgeContext === "object" ? bridgeContext : {}),
    profile_source: profile.profile_source || "platform_identity_store",
    platform_identity_id: String(profile.platform_identity_id || ""),
    id: profile.legacy_user_id ?? bridgeContext?.id ?? null,
    full_name: displayName,
    name: displayName,
    email: String(profile.email || "").trim(),
    phone: String(profile.phone || "").trim(),
    avatar_url: String(profile.avatar_url || "").trim(),
    avatar_settings: profile.avatar_settings || null,
    is_active: profile.is_active !== false,
    status: profile.status || "active",
    is_bridge_session: Boolean(bridgeContext?.is_bridge_session),
    is_infrastructure_superadmin: Boolean(
      bridgeContext?.is_infrastructure_superadmin,
    ),
    is_platform_owner: Boolean(bridgeContext?.is_platform_owner),
    role: bridgeContext?.role,
    effective_role: bridgeContext?.effective_role,
    portal_id: bridgeContext?.portal_id ?? null,
    tenant_code: bridgeContext?.tenant_code || "",
  };
}
