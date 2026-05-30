import { isRuntimeEntityCommunicationType } from "../../../shared/entityIdentity";

function normalizeId(value) {
  return String(value ?? "").trim();
}

function readContextField(target, ...keys) {
  const detailContext = target?.detail?.context || {};

  for (const key of keys) {
    const fromTarget = target?.[key];
    if (fromTarget != null && normalizeId(fromTarget) !== "") {
      return fromTarget;
    }

    const fromDetail = detailContext?.[key];
    if (fromDetail != null && normalizeId(fromDetail) !== "") {
      return fromDetail;
    }
  }

  return null;
}

export function resolveRuntimeEntityNotificationTab(target = {}) {
  const explicitTab = normalizeId(target?.tab || readContextField(target, "tab"));

  if (explicitTab) {
    return explicitTab;
  }

  const source = normalizeId(
    target?.source || readContextField(target, "source"),
  );
  const type = normalizeId(target?.type);

  if (source === "card_note" || type === "card_note") {
    return "notes";
  }

  if (source === "card_attachment_file" || type === "card_attachment_file") {
    return "attachments";
  }

  return "comments";
}

export function resolveRuntimeEntityIdFromNotificationTarget(target = {}) {
  const fromRef = normalizeId(
    target?.publishedRuntimeRef?.runtime_entity_id ||
      target?.published_runtime_ref?.runtime_entity_id,
  );

  if (fromRef) {
    return fromRef;
  }

  if (isRuntimeEntityCommunicationType(target?.entityType)) {
    return normalizeId(target?.entityId);
  }

  if (normalizeId(target?.type) === "runtime_entity_card") {
    return normalizeId(target?.entityId);
  }

  return "";
}

/**
 * Normalizes notification pending target → Object Entity Card initialContext.
 */
export function buildObjectEntityNotificationContext(target = {}) {
  if (!target) {
    return null;
  }

  const tab = resolveRuntimeEntityNotificationTab(target);
  const source = readContextField(target, "source");
  const commentId = readContextField(target, "commentId", "comment_id");
  const parentCommentId = readContextField(
    target,
    "parentCommentId",
    "parent_comment_id",
  );
  const noteId = readContextField(target, "noteId", "note_id");
  const fileId = readContextField(target, "fileId", "file_id");
  const highlightId =
    readContextField(target, "highlightId", "highlight_id") ||
    (commentId ? `comment-${commentId}` : null);

  const section =
    tab === "attachments"
      ? "attachments"
      : tab === "notes"
        ? "notes"
        : tab === "fields" || tab === "main"
          ? tab
          : null;

  return {
    type: target.type || "runtime_entity_card",
    tab,
    section,
    source,
    comment_id: commentId,
    parent_comment_id: parentCommentId,
    note_id: noteId,
    file_id: fileId,
    highlight_id: highlightId,
    published_runtime_ref:
      target.publishedRuntimeRef || target.published_runtime_ref || null,
  };
}
