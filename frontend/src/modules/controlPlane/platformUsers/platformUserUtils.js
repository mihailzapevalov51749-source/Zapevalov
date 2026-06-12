import {
  normalizeAvatarSettings,
} from "../../../shared/avatar/avatarUtils.js";
import {
  COMPANY_ACCESS_MODES,
  loadPlatformRoleCatalog,
  resolveDefaultCompanyAccessMode,
  resolveDefaultPlatformPermissions,
} from "./platformUserConstants.js";

const DEFAULT_AVATAR_SETTINGS = { x: 0, y: 0, scale: 1 };

export function resolveUserAvatarUrl(user = {}) {
  if (!user || typeof user !== "object") {
    return "";
  }

  return (
    user.avatar_url
    || user.avatarUrl
    || user.photo_url
    || user.photoUrl
    || user.image_url
    || user.imageUrl
    || user.avatar?.url
    || user.avatar?.absolute_url
    || ""
  );
}

export function resolveUserAvatarSettings(user = {}) {
  if (!user || typeof user !== "object") {
    return DEFAULT_AVATAR_SETTINGS;
  }

  return normalizeAvatarSettings(
    user.avatar_settings
    ?? user.avatarSettings
    ?? user.avatar?.settings
    ?? user.avatar?.avatar_settings,
  );
}

export function mergePlatformUserWithSessionProfile(platformUser, sessionUser) {
  if (!platformUser || !sessionUser) {
    return platformUser;
  }

  if (String(platformUser.id) !== String(sessionUser.id)) {
    return platformUser;
  }

  return {
    ...platformUser,
    ...sessionUser,
    avatar_url: resolveUserAvatarUrl(sessionUser) || resolveUserAvatarUrl(platformUser),
    avatar_settings: resolveUserAvatarSettings(sessionUser),
  };
}

export const emptyPlatformUserForm = {
  id: null,
  isNew: false,
  full_name: "",
  email: "",
  phone: "",
  role_id: null,
  role: "",
  platformRoleKey: "support",
  is_active: true,
  last_login_at: null,
  created_at: null,
  avatar_url: "",
  avatar_settings: DEFAULT_AVATAR_SETTINGS,
  password: "",
  password_repeat: "",
  platformPermissions: resolveDefaultPlatformPermissions("support"),
  companyAccessMode: COMPANY_ACCESS_MODES.NONE,
  companyAccessIds: [],
};

export function resolvePlatformRoleKeyFromLegacy(roleName) {
  const normalized = String(roleName || "").trim().toLowerCase();
  const match = loadPlatformRoleCatalog().find((role) =>
    role.legacyRoleNames.some((legacyName) => legacyName === normalized),
  );
  return match?.key || "support";
}

export function resolvePlatformRoleLabel(roleKey) {
  return (
    loadPlatformRoleCatalog().find((role) => role.key === roleKey)?.label || roleKey
  );
}

export function resolveLegacyRoleNameForPlatformKey(roleKey, roles = []) {
  const catalogItem = loadPlatformRoleCatalog().find((role) => role.key === roleKey);
  if (!catalogItem) {
    return "user";
  }

  for (const legacyName of catalogItem.legacyRoleNames) {
    const apiRole = roles.find(
      (role) => String(role.name || "").toLowerCase() === legacyName,
    );
    if (apiRole) {
      return apiRole.name;
    }
  }

  return catalogItem.legacyRoleNames[0];
}

export function resolveRoleIdForPlatformKey(roleKey, roles = []) {
  const legacyName = resolveLegacyRoleNameForPlatformKey(roleKey, roles);
  const apiRole = roles.find(
    (role) => String(role.name || "").toLowerCase() === String(legacyName).toLowerCase(),
  );
  return apiRole?.id ?? roles[0]?.id ?? null;
}

export function isHiddenPlatformUser(user = {}) {
  if (user.tenant_id != null || user.tenantId != null) {
    return true;
  }
  return Boolean(user.is_hidden_user ?? user.isHiddenUser);
}

export function normalizePlatformUser(user = {}, roles = [], options = {}) {
  if (isHiddenPlatformUser(user)) {
    return null;
  }

  const systemOwnerUserId = options.systemOwnerUserId ?? null;
  const isSystemPlatformOwner =
    systemOwnerUserId != null && String(user.id) === String(systemOwnerUserId);

  const roleName =
    user.role_name ||
    user.roleName ||
    (typeof user.role === "string" ? user.role : user.role?.name) ||
    "user";
  const platformRoleKey = isSystemPlatformOwner
    ? "platform_owner"
    : resolvePlatformRoleKeyFromLegacy(roleName);

  return {
    ...emptyPlatformUserForm,
    ...user,
    isNew: false,
    isSystemPlatformOwner,
    password: "",
    password_repeat: "",
    role_id: user.role_id ?? user.roleId ?? user.role?.id ?? resolveRoleIdForPlatformKey(platformRoleKey, roles),
    role: roleName,
    platformRoleKey,
    avatar_url: resolveUserAvatarUrl(user),
    avatar_settings: resolveUserAvatarSettings(user),
    is_active:
      user.is_active === undefined || user.is_active === null
        ? true
        : Boolean(user.is_active),
    last_login_at: user.last_login_at || null,
    created_at: user.created_at || null,
    platformPermissions: resolveDefaultPlatformPermissions(platformRoleKey),
    companyAccessMode: resolveDefaultCompanyAccessMode(platformRoleKey),
    companyAccessIds: [],
  };
}

export function createEmptyPlatformUser(roles = []) {
  const platformRoleKey = "support";
  return {
    ...emptyPlatformUserForm,
    isNew: true,
    is_active: true,
    platformRoleKey,
    role_id: resolveRoleIdForPlatformKey(platformRoleKey, roles),
    role: resolveLegacyRoleNameForPlatformKey(platformRoleKey, roles),
    platformPermissions: resolveDefaultPlatformPermissions(platformRoleKey),
    companyAccessMode: resolveDefaultCompanyAccessMode(platformRoleKey),
  };
}

export function resolvePlatformOwner(users = []) {
  const visibleUsers = (users || []).filter((user) => !isHiddenPlatformUser(user));
  if (visibleUsers.length === 0) {
    return null;
  }

  const owner =
    visibleUsers.find((user) => user.platformRoleKey === "platform_owner")
    ?? visibleUsers.find((user) => String(user.role || "").toLowerCase() === "superadmin")
    ?? visibleUsers[0];

  return owner || null;
}

export {
  formatPlatformDateTime,
  formatPlatformLastLogin,
} from "../../../shared/platformSettings/platformDateTimeFormat.js";

export function matchesPlatformUserSearch(user, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    user.full_name,
    user.email,
    user.phone,
    resolvePlatformRoleLabel(user.platformRoleKey),
    user.role,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}
