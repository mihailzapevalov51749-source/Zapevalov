import { platformApiClient } from "./authenticatedApiClient";

function requirePortalId(portalId) {
  const normalized = Number(portalId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Требуется portal_id для операции с разделом");
  }
  return normalized;
}

export async function createSection(portalId, pageId) {
  const normalizedPortalId = requirePortalId(portalId);
  const response = await platformApiClient.post(`/sections/portal/${normalizedPortalId}/`, {
    page_id: pageId,
    title: "Новый раздел",
    description: "",
    order_index: 0,
  });

  return response.data;
}
