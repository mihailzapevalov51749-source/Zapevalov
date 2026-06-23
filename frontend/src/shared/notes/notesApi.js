import { API_BASE_URL } from "../../config/apiConfig.js";
import { buildRuntimeAuthHeaders } from "../../api/runtimeFetch.js";

async function requestJson(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: buildRuntimeAuthHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
  });

  if (!response.ok) {
    let message = "Ошибка запроса к заметкам";

    try {
      const data = await response.json();
      message = data?.detail || data?.message || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getNote({
  entityType,
  entityId,
}) {
  return requestJson(
    `/notes?entity_type=${encodeURIComponent(
      entityType
    )}&entity_id=${encodeURIComponent(entityId)}`
  );
}

export async function upsertNote({
  entityType,
  entityId,
  content,
  format = "html",
}) {
  return requestJson("/notes", {
    method: "POST",
    body: JSON.stringify({
      entity_type: entityType,
      entity_id: String(entityId),
      content,
      format,
    }),
  });
}

export async function publishNote({
  entityType,
  entityId,
  tableId = null,
  publishedRuntimeRef = null,
  content,
  format = "html",
  mentionedUserIds = [],
  mentionKeys = [],
}) {
  return requestJson("/notes/publish", {
    method: "POST",
    body: JSON.stringify({
      entity_type: entityType,
      entity_id: String(entityId),

      table_id: tableId
        ? String(tableId)
        : null,
      published_runtime_ref:
        publishedRuntimeRef && typeof publishedRuntimeRef === "object"
          ? {
              object_type_key:
                typeof publishedRuntimeRef.object_type_key === "string"
                  ? publishedRuntimeRef.object_type_key
                  : null,
              runtime_entity_id:
                typeof publishedRuntimeRef.runtime_entity_id === "string"
                  ? publishedRuntimeRef.runtime_entity_id
                  : null,
              view_key:
                typeof publishedRuntimeRef.view_key === "string"
                  ? publishedRuntimeRef.view_key
                  : null,
              catalog_version:
                typeof publishedRuntimeRef.catalog_version === "string"
                  ? publishedRuntimeRef.catalog_version
                  : null,
              runtime_route:
                typeof publishedRuntimeRef.runtime_route === "string"
                  ? publishedRuntimeRef.runtime_route
                  : null,
            }
          : null,

      content,
      format,

      mentioned_user_ids: mentionedUserIds,
      mention_keys: mentionKeys,
    }),
  });
}

export async function deleteNote({
  entityType,
  entityId,
}) {
  return requestJson(
    `/notes?entity_type=${encodeURIComponent(
      entityType
    )}&entity_id=${encodeURIComponent(entityId)}`,
    {
      method: "DELETE",
    }
  );
}