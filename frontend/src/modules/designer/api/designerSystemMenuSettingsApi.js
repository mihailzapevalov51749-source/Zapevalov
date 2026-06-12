import { platformApiClient } from "./platformApiClient";

function tenantBase(tenantId) {
  return `/designer/tenants/${tenantId}/system-menu-settings`;
}

export async function fetchDesignerSystemMenuSettings(tenantId) {
  const { data } = await platformApiClient.get(tenantBase(tenantId));
  return data?.settings && typeof data.settings === "object" ? data.settings : {};
}

export async function putDesignerSystemMenuSetting(tenantId, itemKey, payload) {
  const { data } = await platformApiClient.put(
    `${tenantBase(tenantId)}/${encodeURIComponent(itemKey)}`,
    payload,
  );
  return data;
}

export async function putDesignerSystemMenuSettingsBulk(tenantId, settings) {
  const { data } = await platformApiClient.put(tenantBase(tenantId), {
    settings,
  });
  return data?.settings && typeof data.settings === "object" ? data.settings : {};
}
