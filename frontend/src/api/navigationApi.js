import { apiClient } from "./apiClient";

export async function getNavigationTree(portalId) {
  const res = await apiClient.get(`/navigation/portal/${portalId}/tree`);
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