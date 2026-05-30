import { platformApiClient } from "../../designer/api/platformApiClient";

const BASE_PATH = "/platform-dashboard";

function unwrapDashboardList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

export async function listPlatformComponents() {
  const { data } = await platformApiClient.get(`${BASE_PATH}/components`);
  return unwrapDashboardList(data);
}

export async function listPlatformStages() {
  const { data } = await platformApiClient.get(`${BASE_PATH}/stages`);
  return unwrapDashboardList(data);
}

export async function listPlatformTasks(params = {}) {
  const { data } = await platformApiClient.get(`${BASE_PATH}/tasks`, { params });
  return data;
}

export async function listPlatformActivities() {
  const { data } = await platformApiClient.get(`${BASE_PATH}/activities`);
  return data;
}

export async function getPlatformDashboardSummary() {
  const { data } = await platformApiClient.get(`${BASE_PATH}/summary`);
  return data;
}

export async function refreshPlatformDashboard() {
  const { data } = await platformApiClient.post(`${BASE_PATH}/refresh`);
  return data;
}
