import {
  formatPlatformDateTime,
  formatPlatformLastLogin,
  resolveUserAvatarSettings,
} from "../platformUsers/platformUserUtils.js";

export function formatGlobalStatusLabel(globalStatus, isActive) {
  if (globalStatus === "blocked" || isActive === false) {
    return "Заблокирован";
  }
  return "Активен";
}

export function formatGlobalStatusCompactLabel(globalStatus, isActive) {
  return `● ${formatGlobalStatusLabel(globalStatus, isActive)}`;
}

export function resolveGlobalUserDisplayName(user = {}) {
  const fullName = String(user.full_name || user.fullName || "").trim();
  if (fullName) {
    return fullName;
  }
  return String(user.display_name || user.displayName || user.email || "").trim() || "—";
}

export function normalizeGlobalUser(user = {}) {
  return {
    id: user.id,
    email: user.email || "",
    full_name: user.full_name || "",
    display_name: resolveGlobalUserDisplayName(user),
    avatar_url: user.avatar_url || user.avatarUrl || "",
    avatar_settings: resolveUserAvatarSettings(user),
    is_active: user.is_active !== false,
    global_status: user.global_status || (user.is_active === false ? "blocked" : "active"),
    created_at: user.created_at || null,
    last_login_at: user.last_login_at || null,
    companies_count: Number(user.companies_count) || 0,
    companies: Array.isArray(user.companies) ? user.companies : [],
  };
}

export function matchesGlobalUserSearch(user, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    user.display_name,
    user.full_name,
    user.email,
    formatGlobalStatusLabel(user.global_status, user.is_active),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export { formatPlatformDateTime, formatPlatformLastLogin };
