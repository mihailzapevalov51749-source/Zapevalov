import { platformApiClient } from "./authenticatedApiClient";

function requirePortalId(portalId) {
  const normalized = Number(portalId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Требуется portal_id для операции со страницей");
  }
  return normalized;
}

export async function getPageFull(pageId, options = {}) {
  const portalId = requirePortalId(options.portalId);
  const params = {};

  if (options.officeAccess === true) {
    params.office_access = true;
  }

  const res = await platformApiClient.get(
    `/pages/portal/${portalId}/${pageId}/full`,
    Object.keys(params).length ? { params } : undefined,
  );
  return res.data;
}

export async function createPage(portalId, data) {
  const normalizedPortalId = requirePortalId(portalId);
  const res = await platformApiClient.post(`/pages/portal/${normalizedPortalId}/`, data);
  return res.data;
}

export async function updatePage(portalId, pageId, data) {
  const normalizedPortalId = requirePortalId(portalId);
  const res = await platformApiClient.put(
    `/pages/portal/${normalizedPortalId}/${pageId}`,
    data,
  );
  return res.data;
}

export async function deletePage(portalId, pageId) {
  const normalizedPortalId = requirePortalId(portalId);
  const res = await platformApiClient.delete(
    `/pages/portal/${normalizedPortalId}/${pageId}`,
  );
  return res.data;
}
