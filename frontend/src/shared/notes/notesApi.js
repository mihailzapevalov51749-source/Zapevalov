const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken")
  );
}

async function requestJson(url, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
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