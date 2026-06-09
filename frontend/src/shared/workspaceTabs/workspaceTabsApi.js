import { platformApiClient } from "../../modules/designer/api/platformApiClient";

export async function listWorkspaceTabs() {
  const { data } = await platformApiClient.get("/workspace-tabs");
  return Array.isArray(data) ? data : [];
}

export async function createWorkspaceTab(payload) {
  const { data } = await platformApiClient.post("/workspace-tabs", payload);
  return data;
}

export async function updateWorkspaceTab(tabId, payload) {
  const { data } = await platformApiClient.patch(`/workspace-tabs/${tabId}`, payload);
  return data;
}

export async function deleteWorkspaceTab(tabId) {
  await platformApiClient.delete(`/workspace-tabs/${tabId}`);
}

export async function openWorkspaceTab(tabId) {
  const { data } = await platformApiClient.post(`/workspace-tabs/${tabId}/open`);
  return data;
}

export async function reorderWorkspaceTabs(items) {
  const { data } = await platformApiClient.post("/workspace-tabs/reorder", { items });
  return Array.isArray(data) ? data : [];
}
