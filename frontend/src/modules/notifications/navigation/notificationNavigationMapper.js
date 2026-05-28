function normalizeId(value) {
  return String(value ?? "").trim();
}

function getContext(detail) {
  return detail?.context || {};
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
      context?.entityType
  );
}

function getEntityId(detail) {
  const context = getContext(detail);

  return normalizeId(
    detail?.entityId ||
      detail?.entity_id ||
      context?.entity_id ||
      context?.entityId
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

  return normalizeId(
    detail?.fileId ||
      detail?.file_id ||
      context?.file_id ||
      context?.fileId ||
      detail?.entityId ||
      detail?.entity_id ||
      context?.entity_id ||
      context?.entityId
  );
}

function getTableIdFromEntityType(entityType) {
  const normalized = normalizeId(entityType);

  if (!normalized.startsWith("universal_table:")) {
    return "";
  }

  return normalized.replace("universal_table:", "").trim();
}

function getTableId({ detail, entityType }) {
  const context = getContext(detail);
  const tableIdFromEntityType = getTableIdFromEntityType(entityType);

  if (tableIdFromEntityType) {
    return tableIdFromEntityType;
  }

  return normalizeId(
    detail?.tableId ||
      detail?.table_id ||
      context?.table_id ||
      context?.tableId
  );
}

function getRowId(detail) {
  const context = getContext(detail);

  return normalizeId(
    detail?.rowId ||
      detail?.row_id ||
      context?.row_id ||
      context?.rowId ||
      detail?.entityId ||
      detail?.entity_id ||
      context?.entity_id ||
      context?.entityId
  );
}

function getTargetTab(detail) {
  const context = getContext(detail);

  return normalizeId(detail?.tab || context?.tab || "");
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
    raw.runtime_entity_id || raw.runtimeEntityId
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
  const tableId = getTableId({ detail, entityType });
  const rowId = getRowId(detail);
  const fileId = getFileId(detail);
  const commentId = getCommentId(detail);
  const parentCommentId = getParentCommentId(detail);
  const messageId = getMessageId(detail);
  const chatId = getChatId(detail, entityId);
  const tab = getTargetTab(detail);
  const highlightId = getHighlightId(detail);
  const publishedRuntimeRef = getPublishedRuntimeRef(detail);

  return {
    source,
    entityType,
    entityId,
    tableId,
    rowId,
    fileId,
    commentId,
    parentCommentId,
    messageId,
    chatId,
    tab,
    highlightId,
    publishedRuntimeRef,
  };
}

export function buildPendingTarget({
  source,
  tableId,
  rowId,
  fileId,
  commentId,
  parentCommentId,
  messageId,
  chatId,
  tab,
  highlightId,
  entityType,
  entityId,
  publishedRuntimeRef,
  detail,
}) {
  if (publishedRuntimeRef) {
    return {
      type: "published_runtime_reference",
      entityType,
      entityId,
      publishedRuntimeRef,
      detail,
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

  switch (source) {
    case "card_comment":
      return {
        type: "card_comment",
        entityType,
        entityId,
        tableId,
        rowId,
        commentId,
        tab: "comments",
        highlightId,
        detail,
      };
    case "card_note":
      return {
        type: "card_note",
        entityType,
        entityId,
        tableId,
        rowId,
        commentId,
        tab: "notes",
        highlightId,
        detail,
      };
    case "card_attachment_file":
      return {
        type: "card_attachment_file",
        entityType,
        entityId,
        tableId,
        rowId,
        fileId,
        commentId,
        tab: "attachments",
        highlightId,
        detail,
      };
    case "comment_attachment_file":
      return {
        type: "comment_attachment_file",
        entityType,
        entityId,
        tableId,
        rowId,
        parentCommentId,
        fileId,
        commentId,
        tab: "comments",
        highlightId,
        detail,
      };
    case "library_file":
      return {
        type: "library_file",
        entityType,
        entityId,
        fileId,
        commentId,
        tab,
        highlightId,
        detail,
      };
    default:
      return {
        type:
          tab === "notes"
            ? "universal_table_row_note"
            : "universal_table_row_comment",
        entityType,
        entityId,
        tableId,
        rowId,
        commentId,
        tab,
        highlightId,
        detail,
      };
  }
}
