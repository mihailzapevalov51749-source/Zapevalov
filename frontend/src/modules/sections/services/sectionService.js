import { platformApiClient } from "../../../api/authenticatedApiClient";

function requirePortalId(portalId) {
  const normalized = Number(portalId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Требуется portal_id для операции с разделом");
  }
  return normalized;
}

export async function updateSection(portalId, sectionId, data) {
  const normalizedPortalId = requirePortalId(portalId);
  const response = await platformApiClient.put(
    `/sections/portal/${normalizedPortalId}/${sectionId}`,
    data,
  );
  return response.data;
}

export async function deleteSection(portalId, sectionId) {
  const normalizedPortalId = requirePortalId(portalId);
  const response = await platformApiClient.delete(
    `/sections/portal/${normalizedPortalId}/${sectionId}`,
  );
  return response.data;
}

export async function moveSection(portalId, sectionId, targetOrderIndex) {
  const normalizedPortalId = requirePortalId(portalId);
  const response = await platformApiClient.post(
    `/sections/portal/${normalizedPortalId}/move`,
    [
      {
        id: Number(sectionId),
        sort_order: Number(targetOrderIndex),
      },
    ],
  );

  return response.data;
}
