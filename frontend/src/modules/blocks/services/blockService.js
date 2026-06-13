import { platformApiClient } from "../../../api/authenticatedApiClient";

function requirePortalId(portalId) {
  const normalized = Number(portalId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Требуется portal_id для операции с блоком");
  }
  return normalized;
}

export async function updateBlock(portalId, blockId, data) {
  const normalizedPortalId = requirePortalId(portalId);
  const response = await platformApiClient.put(
    `/blocks/portal/${normalizedPortalId}/${blockId}`,
    data,
  );
  return response.data;
}

export async function deleteBlock(portalId, blockId) {
  const normalizedPortalId = requirePortalId(portalId);
  const response = await platformApiClient.delete(
    `/blocks/portal/${normalizedPortalId}/${blockId}`,
  );
  return response.data;
}

export async function moveBlock(portalId, blockId, targetSectionId, targetOrderIndex) {
  const normalizedPortalId = requirePortalId(portalId);
  const response = await platformApiClient.post(
    `/blocks/portal/${normalizedPortalId}/move`,
    [
      {
        id: Number(blockId),
        section_id: Number(targetSectionId),
        sort_order: Number(targetOrderIndex),
      },
    ],
  );

  return response.data;
}
