import {
  buildSystemPlatformRoles,
  clonePlatformRole,
  createEmptyCustomRole,
} from "./platformRoleModel.js";

const STORAGE_KEY = "yasnopro_platform_roles_catalog_v1";
const STORAGE_EVENT = "platform-roles-catalog-updated";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStorage() {
  if (!hasBrowserStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.roles) ? parsed.roles : null;
  } catch {
    return null;
  }
}

function writeStorage(roles) {
  if (!hasBrowserStorage()) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      roles,
    }),
  );
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
}

export function loadPlatformRolesCatalog() {
  const stored = readStorage();
  if (stored?.length) {
    return stored.map(clonePlatformRole);
  }

  const systemRoles = buildSystemPlatformRoles();
  writeStorage(systemRoles);
  return systemRoles;
}

export function savePlatformRolesCatalog(roles) {
  writeStorage(roles.map(clonePlatformRole));
}

export function upsertPlatformRole(role) {
  const catalog = loadPlatformRolesCatalog();
  const index = catalog.findIndex((item) => item.key === role.key);
  const nextRole = {
    ...clonePlatformRole(role),
    updatedAt: new Date().toISOString(),
  };

  if (index === -1) {
    catalog.push(nextRole);
  } else {
    catalog[index] = nextRole;
  }

  savePlatformRolesCatalog(catalog);
  return nextRole;
}

export function addCustomPlatformRole(partial = {}) {
  const role = {
    ...createEmptyCustomRole(),
    ...partial,
  };
  upsertPlatformRole(role);
  return role;
}

export function getPlatformRoleByKey(roleKey) {
  return loadPlatformRolesCatalog().find((role) => role.key === roleKey) || null;
}

export function getPlatformRoleCatalogEntries() {
  return loadPlatformRolesCatalog().map((role) => ({
    key: role.key,
    label: role.label,
    description: role.description,
    tone: role.tone,
    legacyRoleNames: role.legacyRoleNames || [],
    status: role.status,
    type: role.type,
  }));
}

export function subscribePlatformRolesCatalog(listener) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleUpdate() {
    listener(loadPlatformRolesCatalog());
  }

  window.addEventListener(STORAGE_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(STORAGE_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}
