function normalizeId(value) {
  return String(value ?? "").trim();
}

function getContext(detail) {
  return detail?.context || {};
}

export function normalizeNotificationContext(detail = {}) {
  const rawRef =
    detail?.published_runtime_ref ||
    detail?.publishedRuntimeRef ||
    detail?.context?.published_runtime_ref ||
    detail?.context?.publishedRuntimeRef ||
    detail?.detail?.context?.published_runtime_ref ||
    detail?.detail?.context?.publishedRuntimeRef ||
    null;

  return {
    ...(detail?.detail?.context || {}),
    ...(detail?.context || {}),

    type: detail?.type || null,

    source:
      detail?.source ||
      detail?.context?.source ||
      detail?.detail?.context?.source ||
      null,

    entity_type:
      detail?.entityType ||
      detail?.entity_type ||
      detail?.context?.entity_type ||
      detail?.context?.entityType ||
      null,

    entity_id:
      detail?.entityId ||
      detail?.entity_id ||
      detail?.context?.entity_id ||
      detail?.context?.entityId ||
      null,

    file_id:
      detail?.fileId ||
      detail?.file_id ||
      detail?.context?.file_id ||
      detail?.context?.fileId ||
      detail?.detail?.context?.file_id ||
      detail?.detail?.context?.fileId ||
      null,

    file_url:
      detail?.fileUrl ||
      detail?.file_url ||
      detail?.context?.file_url ||
      detail?.context?.fileUrl ||
      detail?.detail?.context?.file_url ||
      detail?.detail?.context?.fileUrl ||
      null,

    file_name:
      detail?.fileName ||
      detail?.file_name ||
      detail?.context?.file_name ||
      detail?.context?.fileName ||
      detail?.detail?.context?.file_name ||
      detail?.detail?.context?.fileName ||
      null,

    comment_id:
      detail?.commentId ||
      detail?.comment_id ||
      detail?.context?.comment_id ||
      detail?.context?.commentId ||
      null,

    parent_comment_id:
      detail?.parentCommentId ||
      detail?.parent_comment_id ||
      detail?.context?.parent_comment_id ||
      detail?.context?.parentCommentId ||
      null,

    tab: detail?.tab || detail?.context?.tab || null,

    highlight_id:
      detail?.highlightId ||
      detail?.highlight_id ||
      detail?.context?.highlight_id ||
      detail?.context?.highlightId ||
      null,

    note_id:
      detail?.noteId ||
      detail?.note_id ||
      detail?.context?.note_id ||
      detail?.context?.noteId ||
      null,

    published_runtime_ref:
      rawRef && typeof rawRef === "object"
        ? {
            object_type_key:
              rawRef?.object_type_key || rawRef?.objectTypeKey || null,
            runtime_entity_id:
              rawRef?.runtime_entity_id || rawRef?.runtimeEntityId || null,
            view_key: rawRef?.view_key || rawRef?.viewKey || null,
            catalog_version:
              rawRef?.catalog_version || rawRef?.catalogVersion || null,
            runtime_route:
              rawRef?.runtime_route || rawRef?.runtimeRoute || null,
          }
        : null,
  };
}

function getSource(detail) {
  const context = getContext(detail);
  return normalizeId(context?.source || detail?.source || "");
}

function getEntityType(detail) {
  const context = getContext(detail);
  return normalizeId(
    detail?.entityType ||
      detail?.entity_type ||
      context?.entity_type ||
      context?.entityType,
  );
}

function getEntityId(detail) {
  const context = getContext(detail);
  return normalizeId(
    detail?.entityId ||
      detail?.entity_id ||
      context?.entity_id ||
      context?.entityId,
  );
}

function getCommentId(detail) {
  const context = getContext(detail);
  return (
    detail?.commentId ||
    detail?.comment_id ||
    context?.comment_id ||
    context?.commentId ||
    null
  );
}

function getParentCommentId(detail) {
  const context = getContext(detail);
  return (
    detail?.parentCommentId ||
    detail?.parent_comment_id ||
    context?.parent_comment_id ||
    context?.parentCommentId ||
    null
  );
}

function getMessageId(detail) {
  const context = getContext(detail);
  return (
    detail?.messageId ||
    detail?.message_id ||
    context?.message_id ||
    context?.messageId ||
    null
  );
}

function getChatId(detail, entityId) {
  const context = getContext(detail);
  return (
    detail?.chatId ||
    detail?.chat_id ||
    context?.chat_id ||
    context?.chatId ||
    entityId ||
    null
  );
}

function getFileId(detail) {
  const context = getContext(detail);
  const entityType = getEntityType(detail);
  const explicitFileId = normalizeId(
    detail?.fileId ||
      detail?.file_id ||
      context?.file_id ||
      context?.fileId,
  );

  if (explicitFileId) {
    return explicitFileId;
  }

  if (entityType === "file") {
    return normalizeId(
      detail?.entityId ||
        detail?.entity_id ||
        context?.entity_id ||
        context?.entityId,
    );
  }

  return "";
}

function isRuntimeEntityCommunicationType(entityType) {
  return normalizeId(entityType) === "runtime_entity";
}

function getTargetTab(detail) {
  const context = getContext(detail);
  return normalizeId(detail?.tab || context?.tab || "");
}

function getNoteId(detail) {
  const context = getContext(detail);
  return (
    detail?.noteId ||
    detail?.note_id ||
    context?.note_id ||
    context?.noteId ||
    null
  );
}

function getHighlightId(detail) {
  const context = getContext(detail);
  return (
    detail?.highlightId ||
    detail?.highlight_id ||
    context?.highlight_id ||
    context?.highlightId ||
    null
  );
}

export function getPublishedRuntimeRef(detail) {
  const context = getContext(detail);
  const raw =
    context?.published_runtime_ref ||
    context?.publishedRuntimeRef ||
    detail?.published_runtime_ref ||
    detail?.publishedRuntimeRef ||
    null;

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const objectTypeKey = normalizeId(raw.object_type_key || raw.objectTypeKey);
  const runtimeEntityId = normalizeId(
    raw.runtime_entity_id || raw.runtimeEntityId,
  );
  const viewKey = normalizeId(raw.view_key || raw.viewKey);
  const catalogVersion = normalizeId(raw.catalog_version || raw.catalogVersion);
  const runtimeRoute = normalizeId(raw.runtime_route || raw.runtimeRoute);

  if (!objectTypeKey || !runtimeEntityId) {
    return null;
  }

  return {
    object_type_key: objectTypeKey,
    runtime_entity_id: runtimeEntityId,
    view_key: viewKey || null,
    catalog_version: catalogVersion || null,
    runtime_route: runtimeRoute || null,
  };
}

export function mapNotificationNavigateDetail(detail = {}) {
  const source = getSource(detail);
  const entityType = getEntityType(detail);
  const entityId = getEntityId(detail);
  const fileId = getFileId(detail);
  const commentId = getCommentId(detail);
  const parentCommentId = getParentCommentId(detail);
  const messageId = getMessageId(detail);
  const chatId = getChatId(detail, entityId);
  const tab = getTargetTab(detail);
  const highlightId = getHighlightId(detail);
  const noteId = getNoteId(detail);
  const publishedRuntimeRef = getPublishedRuntimeRef(detail);

  return {
    source,
    entityType,
    entityId,
    fileId,
    commentId,
    parentCommentId,
    messageId,
    chatId,
    tab,
    highlightId,
    noteId,
    publishedRuntimeRef,
  };
}

function resolvePendingTargetTab({ source, tab }) {
  const normalizedTab = normalizeId(tab);

  if (normalizedTab) {
    return normalizedTab;
  }

  if (source === "card_note") {
    return "notes";
  }

  if (source === "card_attachment_file") {
    return "attachments";
  }

  return "comments";
}

function buildRuntimeTargetFields({
  source,
  entityType,
  entityId,
  commentId,
  parentCommentId,
  noteId,
  fileId,
  tab,
  highlightId,
  publishedRuntimeRef,
  detail,
}) {
  const resolvedTab = resolvePendingTargetTab({ source, tab });

  return {
    source,
    entityType,
    entityId,
    publishedRuntimeRef,
    objectTypeKey: publishedRuntimeRef?.object_type_key || null,
    commentId,
    parentCommentId,
    noteId,
    fileId,
    tab: resolvedTab,
    highlightId,
    detail,
  };
}

export function buildPendingTarget({
  source,
  fileId,
  commentId,
  parentCommentId,
  messageId,
  chatId,
  tab,
  highlightId,
  noteId,
  entityType,
  entityId,
  publishedRuntimeRef,
  detail,
}) {
  if (publishedRuntimeRef) {
    return {
      type: "published_runtime_reference",
      ...buildRuntimeTargetFields({
        source,
        entityType,
        entityId,
        commentId,
        parentCommentId,
        noteId,
        fileId,
        tab,
        highlightId,
        publishedRuntimeRef,
        detail,
      }),
    };
  }

  if (isRuntimeEntityCommunicationType(entityType) && entityId) {
    return {
      type: "runtime_entity_card",
      ...buildRuntimeTargetFields({
        source,
        entityType,
        entityId,
        commentId,
        parentCommentId,
        noteId,
        fileId,
        tab,
        highlightId,
        publishedRuntimeRef: null,
        detail,
      }),
    };
  }

  if (entityType === "chat") {
    return {
      type: "chat_message",
      entityType,
      entityId,
      chatId,
      messageId,
      tab: "chat",
      highlightId,
      detail,
    };
  }

  const normalizedSource = normalizeId(source);

  if (normalizedSource === "library_file" && fileId) {
    return {
      type: "library_file",
      entityType,
      entityId,
      fileId,
      commentId,
      tab: resolvePendingTargetTab({ source, tab }),
      highlightId,
      detail,
    };
  }

  if (
    (normalizedSource === "uploaded_file" || entityType === "file") &&
    fileId
  ) {
    return {
      type: "uploaded_file",
      entityType: "file",
      entityId: entityId || fileId,
      fileId,
      commentId,
      parentCommentId,
      tab: resolvePendingTargetTab({ source, tab }),
      highlightId,
      detail,
    };
  }

  return {
    type: "notification_unavailable",
    entityType,
    entityId,
    fileId,
    commentId,
    tab,
    highlightId,
    detail,
    message:
      "Не удалось открыть объект. Уведомление создано по устаревшему формату.",
  };
}

export function buildBlockedTarget(type, message, detail = {}) {
  return {
    type,
    message,
    detail,
  };
}
