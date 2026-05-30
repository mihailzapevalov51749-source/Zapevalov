export const FILE_VIEWER_COMMENTS_PANEL_WIDTH = 380;

export const FILE_VIEWER_ACTIONS_RIGHT_BASE = 158;

export function normalizeFileViewerId(value) {
  return String(value ?? "").trim();
}

export function hasInitialFileCommentContext(initialContext) {
  return Boolean(
    initialContext?.commentId ||
      initialContext?.comment_id ||
      initialContext?.highlight_id ||
      initialContext?.highlightId,
  );
}

export function normalizeFileViewerContext(detail = {}) {
  return {
    ...(detail?.detail?.context || {}),
    ...(detail?.context || {}),

    type:
      detail?.type ||
      detail?.context?.type ||
      detail?.detail?.context?.type ||
      null,

    source:
      detail?.source ||
      detail?.context?.source ||
      detail?.detail?.context?.source ||
      null,

    tab:
      detail?.tab ||
      detail?.context?.tab ||
      detail?.detail?.context?.tab ||
      null,

    entity_type:
      detail?.entityType ||
      detail?.entity_type ||
      detail?.context?.entity_type ||
      detail?.context?.entityType ||
      detail?.detail?.context?.entity_type ||
      detail?.detail?.context?.entityType ||
      null,

    entity_id:
      detail?.entityId ||
      detail?.entity_id ||
      detail?.context?.entity_id ||
      detail?.context?.entityId ||
      detail?.detail?.context?.entity_id ||
      detail?.detail?.context?.entityId ||
      null,

    table_id:
      detail?.tableId ||
      detail?.table_id ||
      detail?.context?.table_id ||
      detail?.context?.tableId ||
      detail?.detail?.context?.table_id ||
      detail?.detail?.context?.tableId ||
      null,

    row_id:
      detail?.rowId ||
      detail?.row_id ||
      detail?.context?.row_id ||
      detail?.context?.rowId ||
      detail?.detail?.context?.row_id ||
      detail?.detail?.context?.rowId ||
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

    comment_id:
      detail?.commentId ||
      detail?.comment_id ||
      detail?.context?.comment_id ||
      detail?.context?.commentId ||
      detail?.detail?.context?.comment_id ||
      detail?.detail?.context?.commentId ||
      null,

    parent_comment_id:
      detail?.parentCommentId ||
      detail?.parent_comment_id ||
      detail?.context?.parent_comment_id ||
      detail?.context?.parentCommentId ||
      detail?.detail?.context?.parent_comment_id ||
      detail?.detail?.context?.parentCommentId ||
      null,

    highlight_id:
      detail?.highlightId ||
      detail?.highlight_id ||
      detail?.context?.highlight_id ||
      detail?.context?.highlightId ||
      detail?.detail?.context?.highlight_id ||
      detail?.detail?.context?.highlightId ||
      null,
  };
}

export function isSameFileViewerTarget({
  targetEntityType,
  targetEntityId,
  targetFileId,
  targetFileUrl,
  fileId,
  fileUrl,
}) {
  const currentFileId = normalizeFileViewerId(fileId);
  const currentFileUrl = normalizeFileViewerId(fileUrl);

  const normalizedTargetEntityType = normalizeFileViewerId(targetEntityType);
  const normalizedTargetFileId = normalizeFileViewerId(targetFileId);
  const normalizedTargetFileUrl = normalizeFileViewerId(targetFileUrl);

  if (normalizedTargetEntityType === "file") {
    return Boolean(
      (currentFileId && currentFileId === normalizedTargetFileId) ||
        (currentFileUrl && currentFileUrl === normalizedTargetFileUrl),
    );
  }

  return Boolean(
    (currentFileId && currentFileId === normalizedTargetFileId) ||
      (currentFileUrl && currentFileUrl === normalizedTargetFileUrl),
  );
}

export function resolveFileViewerDiscussionId({
  fileId,
  initialContext,
  documentRecord,
  getFileDiscussionEntity,
}) {
  const fromContext =
    normalizeFileViewerId(initialContext?.file_id) ||
    normalizeFileViewerId(initialContext?.fileId);

  if (fromContext) {
    return fromContext;
  }

  const normalizedFileId = normalizeFileViewerId(fileId);
  if (normalizedFileId) {
    return normalizedFileId;
  }

  if (typeof getFileDiscussionEntity === "function" && documentRecord) {
    return normalizeFileViewerId(getFileDiscussionEntity(documentRecord)?.id);
  }

  return null;
}
