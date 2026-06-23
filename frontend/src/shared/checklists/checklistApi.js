import { API_BASE_URL } from "../../config/apiConfig.js";
import { buildRuntimeAuthHeaders } from "../../api/runtimeFetch.js";

function getAuthHeaders() {
  return buildRuntimeAuthHeaders({
    "Content-Type": "application/json",
  });
}

async function parseResponse(response) {
  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const data = await response.json();

      errorMessage =
        data?.detail ||
        data?.message ||
        errorMessage;
    } catch {
      //
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getChecklist({
  entityType,
  entityId,
}) {
  const query = new URLSearchParams({
    entity_type: entityType,
    entity_id: entityId,
  });

  const response = await fetch(
    `${API_BASE_URL}/checklists/?${query}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return parseResponse(response);
}

export async function createChecklistItem({
  entityType,
  entityId,
  title,
  position,
}) {
  const response = await fetch(
    `${API_BASE_URL}/checklists/items`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        entity: {
          type: entityType,
          id: String(entityId),
        },
        title,
        position,
      }),
    }
  );

  return parseResponse(response);
}

export async function updateChecklistItem(
  itemId,
  payload
) {
  const response = await fetch(
    `${API_BASE_URL}/checklists/items/${itemId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseResponse(response);
}

export async function deleteChecklistItem(
  itemId
) {
  const response = await fetch(
    `${API_BASE_URL}/checklists/items/${itemId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return parseResponse(response);
}

export async function reorderChecklistItems(
  orderedIds
) {
  const response = await fetch(
    `${API_BASE_URL}/checklists/reorder`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ordered_ids: orderedIds,
      }),
    }
  );

  return parseResponse(response);
}