import axios from "axios";

import {
  getApiErrorMessage as getPlatformApiErrorMessage,
  platformApiClient,
} from "../../designer/api/platformApiClient";

function buildErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || String(item)).join("; ");
  }
  return fallback;
}

export function getApiErrorMessage(error, fallback) {
  if (axios.isAxiosError(error)) {
    return buildErrorMessage(error, fallback);
  }
  return fallback;
}

export async function fetchPlatformVersionRegistrySummary() {
  const response = await platformApiClient.get("/platform/version-registry/summary");
  return response.data;
}

export async function fetchCurrentPlatformVersions() {
  const response = await platformApiClient.get("/platform/version-registry/current");
  return response.data;
}

export async function fetchPlatformVersionHistory(tenantId = null) {
  const response = await platformApiClient.get("/platform/version-registry/history", {
    params: tenantId ? { tenant_id: tenantId } : undefined,
  });
  return response.data;
}

export { getPlatformApiErrorMessage };
