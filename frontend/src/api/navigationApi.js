import { apiClient } from "./apiClient";

export async function getNavigationTree(portalId, options = {}) {
  const params = {};
  if (options?.scope) {
    params.scope = options.scope;
  }
  if (options?.mode) {
    params.mode = options.mode;
  }
  if (options?.context) {
    params.context = options.context;
  }

  const hasParams = Object.keys(params).length > 0;
  const res = await apiClient.get(`/navigation/portal/${portalId}/tree`, hasParams ? { params } : undefined);
  return res.data;
}

export async function getNavigationList(portalId) {
  const res = await apiClient.get(`/navigation/portal/${portalId}`);
  return res.data;
}

export async function createNavigationItem(data) {
  const res = await apiClient.post("/navigation/", data);
  return res.data;
}

export async function updateNavigationItem(itemId, data) {
  const res = await apiClient.put(`/navigation/${itemId}`, data);
  return res.data;
}

export async function deleteNavigationItem(itemId) {
  const res = await apiClient.delete(`/navigation/${itemId}`);
  return res.data;
}

export async function moveNavigationItems(items) {
  const res = await apiClient.post("/navigation/move", items);
  return res.data;
}