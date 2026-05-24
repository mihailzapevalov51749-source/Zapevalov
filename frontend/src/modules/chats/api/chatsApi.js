const API_BASE_URL = "http://127.0.0.1:8010";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(text || `Ошибка запроса: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function normalizeUploadedFile(uploadedFile = {}) {
  const fileName =
    uploadedFile.file_name ||
    uploadedFile.fileName ||
    uploadedFile.name ||
    uploadedFile.original_name ||
    uploadedFile.originalName ||
    "Файл";

  const fileUrl =
    uploadedFile.file_url ||
    uploadedFile.fileUrl ||
    uploadedFile.url ||
    uploadedFile.path ||
    uploadedFile.file_path ||
    "";

  const fileSize =
    uploadedFile.file_size ||
    uploadedFile.fileSize ||
    uploadedFile.size ||
    null;

  const fileType =
    uploadedFile.file_type ||
    uploadedFile.fileType ||
    uploadedFile.mime_type ||
    uploadedFile.mimeType ||
    uploadedFile.type ||
    "";

  return {
    id: uploadedFile.id || uploadedFile.file_id || uploadedFile.fileId || null,
    file_id: uploadedFile.file_id || uploadedFile.fileId || uploadedFile.id || null,
    file_name: fileName,
    fileName,
    file_url: fileUrl,
    fileUrl,
    file_size: fileSize,
    fileSize,
    file_type: fileType,
    fileType,
  };
}

async function uploadChatFile(file) {
  const token = getToken();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(text || "Ошибка загрузки файла");
  }

  const uploadedFile = await response.json();

  return normalizeUploadedFile(uploadedFile);
}

async function normalizeMessagePayload(payload = {}) {
  const rawFiles = Array.isArray(payload.files) ? payload.files : [];
  const rawAttachments = Array.isArray(payload.attachments)
    ? payload.attachments
    : [];

  const localFiles = [...rawFiles, ...rawAttachments].filter(
    (item) => item instanceof File
  );

  const readyAttachments = [...rawFiles, ...rawAttachments]
    .filter((item) => !(item instanceof File))
    .map(normalizeUploadedFile);

  const uploadedAttachments = [];

  for (const file of localFiles) {
    const uploadedFile = await uploadChatFile(file);
    uploadedAttachments.push(uploadedFile);
  }

  return {
    content: payload.content || payload.body || " ",
    parent_message_id:
      payload.parent_message_id || payload.parentMessageId || null,
    attachments: [...readyAttachments, ...uploadedAttachments],
    mentions: payload.mentions || [],
    mentioned_user_ids:
      payload.mentioned_user_ids || payload.mentionedUserIds || [],
  };
}

export function getChats(params = {}) {
  return request(`/chats${buildQuery(params)}`);
}

export function searchChats(query) {
  return getChats({
    search: query,
  });
}

export function getUsers() {
  return request("/users/");
}

export function searchUsers(query) {
  return request(
    `/users/${buildQuery({
      search: query,
    })}`
  );
}

export function createChat(payload) {
  return request("/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function deleteChat(chatId) {
  return request(`/chats/${chatId}`, {
    method: "DELETE",
  });
}

export function getOrCreateDirectChat(userId) {
  return request("/chats/direct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
    }),
  });
}

export function getChat(chatId) {
  return request(`/chats/${chatId}`);
}

export function updateChat(chatId, payload) {
  return request(`/chats/${chatId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getChatMessages(chatId, params = {}) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  return request(
    `/chats/${chatId}/messages${buildQuery({
      limit,
      offset,
    })}`
  );
}

export async function createChatMessage(chatId, payload) {
  const normalizedPayload = await normalizeMessagePayload(payload);

  return request(`/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  });
}

export async function updateChatMessage(messageId, payload) {
  const normalizedPayload = await normalizeMessagePayload(payload);

  return request(`/chats/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizedPayload),
  });
}

export function deleteChatMessage(messageId) {
  return request(`/chats/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function addChatReaction(messageId, emoji) {
  return request(`/chats/messages/${messageId}/reactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emoji }),
  });
}

export function removeChatReaction(messageId, emoji) {
  return request(`/chats/messages/${messageId}/reactions/${emoji}`, {
    method: "DELETE",
  });
}

export function getChatParticipants(chatId) {
  return request(`/chats/${chatId}/participants`);
}

export function addChatParticipant(chatId, payload) {
  return request(`/chats/${chatId}/participants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function updateChatParticipant(chatId, userId, payload) {
  return request(`/chats/${chatId}/participants/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function removeChatParticipant(chatId, userId) {
  return request(`/chats/${chatId}/participants/${userId}`, {
    method: "DELETE",
  });
}

export function updateChatReadState(chatId, lastReadMessageId) {
  return request(`/chats/${chatId}/read-state`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      last_read_message_id: lastReadMessageId,
    }),
  });
}