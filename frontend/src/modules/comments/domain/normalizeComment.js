function normalizeAuthor(author, snapshot, fallbackId = null) {
  const source = author || snapshot || {};

  return {
    id:
      source.id ||
      source.user_id ||
      source.userId ||
      fallbackId ||
      null,

    fullName:
      source.full_name ||
      source.fullName ||
      source.name ||
      "Пользователь",

    email: source.email || "",

    avatarUrl: source.avatar_url || source.avatarUrl || "",

    avatarSettings:
      source.avatar_settings ||
      source.avatarSettings ||
      {
        x: 0,
        y: 0,
        scale: 1,
      },
  };
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments.map((attachment) => ({
    id: attachment.id,
    fileUrl: attachment.file_url || attachment.fileUrl || "",
    fileName: attachment.file_name || attachment.fileName || "Файл",
    fileType: attachment.file_type || attachment.fileType || "",
    fileSize: attachment.file_size || attachment.fileSize || null,
    createdAt: attachment.created_at || attachment.createdAt || null,
  }));
}

function normalizeReactions(reactions) {
  if (!Array.isArray(reactions)) return [];

  return reactions.map((reaction) => ({
    id: reaction.id,
    userId: reaction.user_id || reaction.userId || null,
    emojiKey: reaction.emoji_key || reaction.emojiKey || "",
    createdAt: reaction.created_at || reaction.createdAt || null,
  }));
}

function normalizeMentions(mentions) {
  if (!Array.isArray(mentions)) return [];

  return mentions.map((mention) => ({
    id: mention.id,
    mentionedUserId:
      mention.mentioned_user_id ||
      mention.mentionedUserId ||
      null,
    isRead: mention.is_read || mention.isRead || false,
    notificationStatus:
      mention.notification_status ||
      mention.notificationStatus ||
      "pending",
    createdAt: mention.created_at || mention.createdAt || null,
  }));
}

export default function normalizeComment(comment) {
  if (!comment) return null;

  const authorUserId =
    comment.author_user_id ||
    comment.authorUserId ||
    null;

  return {
    id: comment.id,

    entityType: comment.entity_type || comment.entityType || "",
    entityId: comment.entity_id || comment.entityId || "",

    parentCommentId:
      comment.parent_comment_id || comment.parentCommentId || null,

    rootCommentId:
      comment.root_comment_id || comment.rootCommentId || null,

    kind: comment.kind || "user",
    isSystem: comment.kind === "system",

    systemEventKey:
      comment.system_event_key || comment.systemEventKey || null,

    systemPayload:
      comment.system_payload || comment.systemPayload || {},

    body: comment.body || "",
    bodyFormat: comment.body_format || comment.bodyFormat || "plain",

    authorUserId,

    author: normalizeAuthor(
      comment.author,
      comment.author_snapshot || comment.authorSnapshot,
      authorUserId
    ),

    isPinned: comment.is_pinned || comment.isPinned || false,

    editedAt: comment.edited_at || comment.editedAt || null,
    createdAt: comment.created_at || comment.createdAt || null,
    updatedAt: comment.updated_at || comment.updatedAt || null,
    deletedAt: comment.deleted_at || comment.deletedAt || null,

    version: comment.version || 1,

    attachments: normalizeAttachments(comment.attachments),
    reactions: normalizeReactions(comment.reactions),
    mentions: normalizeMentions(comment.mentions),
  };
}