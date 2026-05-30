import {
  getAttachmentFileId,
  getFileUrl,
} from "./attachmentFileIdentity";

/**
 * File viewer + notification context for card attachment open.
 * File comments use entity_type=file; owner binding carries runtime/legacy entity identity.
 */
export function buildAttachmentFileContext({
  file,
  source = "card_attachment_file",
  ownerIdentity = null,
  publishedRuntimeRef = null,
  commentId = null,
  highlightId = null,
}) {
  const fileId = getAttachmentFileId(file);
  const fileUrl = getFileUrl(file);

  const ownerEntityType = ownerIdentity?.entityType
    ? String(ownerIdentity.entityType)
    : null;
  const ownerEntityId = ownerIdentity?.entityId
    ? String(ownerIdentity.entityId)
    : null;

  return {
    source,

    entity_type: "file",
    entity_id: fileId,

    owner_entity_type: ownerEntityType,
    owner_entity_id: ownerEntityId,

    published_runtime_ref: publishedRuntimeRef || null,

    file_id: fileId,
    file_url: fileUrl,

    comment_id: commentId,
    highlight_id: highlightId,

    tab: "comments",
  };
}
