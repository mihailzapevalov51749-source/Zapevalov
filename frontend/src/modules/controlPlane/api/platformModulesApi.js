import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listPlatformModules() {
  const response = await platformApiClient.get("/platform/modules");
  return response.data;
}

export async function getPlatformModule(moduleKey) {
  const response = await platformApiClient.get(
    `/platform/modules/${encodeURIComponent(moduleKey)}`,
  );
  return response.data;
}

export async function listPlatformModuleManifests() {
  const response = await platformApiClient.get("/platform/module-manifests");
  return response.data;
}

export async function getPlatformModuleManifest(moduleKey) {
  const response = await platformApiClient.get(
    `/platform/modules/${encodeURIComponent(moduleKey)}/manifest`,
  );
  return response.data;
}

export async function getPlatformModuleSettingsSchema(moduleKey) {
  const response = await platformApiClient.get(
    `/platform/modules/${encodeURIComponent(moduleKey)}/settings-schema`,
  );
  return response.data;
}

export async function listPlatformModuleVersions() {
  const response = await platformApiClient.get("/platform/module-versions");
  return response.data;
}

export async function listModuleVersions(moduleKey) {
  const response = await platformApiClient.get(
    `/platform/modules/${encodeURIComponent(moduleKey)}/versions`,
  );
  return response.data;
}

export async function getLatestModuleVersion(moduleKey) {
  const response = await platformApiClient.get(
    `/platform/modules/${encodeURIComponent(moduleKey)}/latest-version`,
  );
  return response.data;
}

export async function listRuntimeConfigurationCache() {
  const response = await platformApiClient.get(
    "/platform/modules/runtime-configuration-cache",
  );
  return response.data;
}

export function getApiErrorMessage(error, fallback = "Ошибка запроса") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || String(item)).join("; ");
  }
  return error?.message || fallback;
}
