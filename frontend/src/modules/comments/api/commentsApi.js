const API_BASE_URL = "http://127.0.0.1:8010";

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken")
  );
}

function normalizeFileId(file_id, fileId) {
  const value =
    file_id !== null &&
    file_id !== undefined &&
    file_id !== ""
      ? file_id
      : fileId;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value);
}

function normalizeErrorMessage(data, fallback = "Ошибка запроса") {
  if (!data?.detail) return fallback;

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item?.msg || JSON.stringify(item))
      .join("; ");
  }

  if (typeof data.detail === "object") {
    return data.detail?.msg || JSON.stringify(data.detail);
  }

  return fallback;
}

async function request(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = "Ошибка запроса";

    try {
      const data = await response.json();

      message = normalizeErrorMessage(data, message);
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  return response.json();
}

function normalizeAttachment(file) {
  if (!file) return null;

  return {
    id: file.id || file.fileId || file.file_id || null,

    file_url:
      file.file_url ||
      file.fileUrl ||
      file.url ||
      "",

    file_name:
      file.file_name ||
      file.fileName ||
      file.name ||
      file.originalName ||
      file.original_name ||
      "Файл",

    file_type:
      file.file_type ||
      file.fileType ||
      file.type ||
      "",

    file_size:
      file.file_size ||
      file.fileSize ||
      file.size ||
      null,
  };
}

function normalizeAttachments(value = []) {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeAttachment)
    .filter(Boolean)
    .filter((file) => file.file_url || file.id);
}

export async function fetchComments({
  entityType,
  entityId,
}) {
  if (!entityType || !entityId) {
    return {
      items: [],
      total: 0,
    };
  }

  const query = new URLSearchParams({
    entity_type: entityType,
    entity_id: String(entityId),
  });

  return request(`/comments?${query.toString()}`);
}

export async function createComment({
  entityType,
  entityId,
  file_id = null,
  fileId = null,
  body,
  parentCommentId = null,
  mentionedUserIds = [],
}) {
  return request("/comments", {
    method: "POST",

    body: JSON.stringify({
      entity_type: entityType,
      entity_id: String(entityId),

      file_id: normalizeFileId(file_id, fileId),

      body,

      body_format: "plain",

      parent_comment_id: parentCommentId,

      mentioned_user_ids: mentionedUserIds,
    }),
  });
}

export async function updateComment({
  commentId,
  file_id = null,
  fileId = null,
  body,
  mentionedUserIds = [],
  attachments = [],
  files = [],
}) {
  const normalizedAttachments = normalizeAttachments(
    attachments.length ? attachments : files
  );

  return request(`/comments/${commentId}`, {
    method: "PATCH",

    body: JSON.stringify({
      file_id: normalizeFileId(file_id, fileId),

      body,

      body_format: "plain",

      mentioned_user_ids: mentionedUserIds,

      attachments: normalizedAttachments,
      files: normalizedAttachments,
    }),
  });
}

export async function deleteComment(commentId) {
  return request(`/comments/${commentId}`, {
    method: "DELETE",
  });
}

export async function toggleCommentReaction({
  commentId,
  emojiKey,
}) {
  return request(`/comments/${commentId}/reactions`, {
    method: "POST",

    body: JSON.stringify({
      emoji_key: emojiKey,
    }),
  });
}

export async function uploadCommentAttachment({
  commentId,
  file,
}) {
  const normalizedFile = normalizeAttachment(file);

  return request(`/comments/${commentId}/attachments`, {
    method: "POST",

    body: JSON.stringify({
      file_url: normalizedFile.file_url,

      file_name: normalizedFile.file_name,

      file_type: normalizedFile.file_type,

      file_size: normalizedFile.file_size,
    }),
  });
}