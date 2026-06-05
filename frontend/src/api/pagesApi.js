import { apiClient } from "./apiClient";

export async function getPageFull(pageId, options = {}) {
  const params = {};
  if (options.officeAccess === true) {
    params.office_access = true;
  }
  const res = await apiClient.get(
    `/pages/${pageId}/full`,
    Object.keys(params).length ? { params } : undefined,
  );
  return res.data;
}

export async function createPage(data) {
  const res = await apiClient.post("/pages/", data);
  return res.data;
}

export async function updatePage(pageId, data) {
  const res = await apiClient.put(`/pages/${pageId}`, data);
  return res.data;
}

export async function deletePage(pageId) {
  const res = await apiClient.delete(`/pages/${pageId}`);
  return res.data;
}