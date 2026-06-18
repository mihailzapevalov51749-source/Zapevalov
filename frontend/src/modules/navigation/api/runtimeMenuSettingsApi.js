import { platformApiClient } from "../../designer/api/platformApiClient.js";

function tenantMenuSettingsBase(tenantId) {
  return `/runtime/menu-settings/tenants/${tenantId}`;
}

function userMenuPreferencesBase(tenantId) {
  return `/runtime/menu-preferences/tenants/${tenantId}`;
}

export async function fetchTenantRuntimeMenuSettings(tenantId) {
  const { data } = await platformApiClient.get(tenantMenuSettingsBase(tenantId));
  return data?.settings && typeof data.settings === "object" ? data.settings : {};
}

export async function putTenantRuntimeMenuSetting(tenantId, itemKey, payload) {
  const { data } = await platformApiClient.put(
    `${tenantMenuSettingsBase(tenantId)}/${encodeURIComponent(itemKey)}`,
    payload,
  );
  return data;
}

export async function putTenantRuntimeMenuSettingsBulk(tenantId, settings) {
  const { data } = await platformApiClient.put(tenantMenuSettingsBase(tenantId), {
    settings,
  });
  return data?.settings && typeof data.settings === "object" ? data.settings : {};
}

export async function fetchUserMenuPreferences(tenantId) {
  const { data } = await platformApiClient.get(userMenuPreferencesBase(tenantId));
  return data?.preferences && typeof data.preferences === "object" ? data.preferences : {};
}

export async function putUserMenuPreference(tenantId, itemKey, payload) {
  const { data } = await platformApiClient.put(
    `${userMenuPreferencesBase(tenantId)}/${encodeURIComponent(itemKey)}`,
    payload,
  );
  return data;
}

export async function putUserMenuPreferencesBulk(tenantId, preferences) {
  const { data } = await platformApiClient.put(userMenuPreferencesBase(tenantId), {
    preferences,
  });
  return data?.preferences && typeof data.preferences === "object" ? data.preferences : {};
}

export async function resetUserMenuPreferences(tenantId) {
  await platformApiClient.delete(userMenuPreferencesBase(tenantId));
}
