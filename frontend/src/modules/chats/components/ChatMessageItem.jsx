import { useMemo, useState } from "react";

import EmojiIcon from "../../comments/components/EmojiIcon";
import MessageAvatar from "../../../shared/communication/components/MessageAvatar";
import MessageComposer from "../../../shared/communication/components/MessageComposer";
import ChatMessageAttachments from "./ChatMessageAttachments";

import {
  getCurrentUserId,
  getMessageAuthorId,
  getMessageAuthorName,
  getMessageAvatarUrl,
  getMessageAvatarSettings,
  getMessageBody,
  formatDate,
  groupReactions,
  getRepliesLabel,
  isSameMessageId,
} from "../../../shared/communication/domain/messageItemUtils";

import { reactionEmojiKeys } from "../../comments/emoji/emojiRegistry";

function getMessageCreatedAt(message) {
  return message?.createdAt || message?.created_at || "";
}

function getMessageAttachments(message) {
  if (Array.isArray(message?.attachments)) return message.attachments;
  if (Array.isArray(message?.files)) return message.files;
  return [];
}

export default function ChatMessageItem({
  message,
  replies = [],
  highlightedMessageId = null,
  onReply,
  onReaction,
  onEdit,
  onDelete,
  onOpenFile,
  isReply = false,
}) {
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);

  const currentUserId = getCurrentUserId();
  const authorId = getMessageAuthorId(message);

  const isOwn = Boolean(
    currentUserId &&
      authorId &&
      String(currentUserId) === String(authorId)
  );

  const isHighlighted = isSameMessageId(message?.id, highlightedMessageId);

  const authorName = getMessageAuthorName(message);
  const body = getMessageBody(message);
  const attachments = getMessageAttachments(message);
  const reactionGroups = groupReactions(message?.reactions);

  const visibleReplies = useMemo(() => {
    if (!isRepliesExpanded) return [];
    return replies;
  }, [isRepliesExpanded, replies]);

  const handleReplySubmit = async ({
    body: replyBody,
    files,
    attachments: replyAttachments,
    mentioned_user_ids,
    mentions,
  }) => {
    await onReply?.({
      parentMessage: message,
      body: replyBody,
      content: replyBody,
      files: files || replyAttachments || [],
      attachments: replyAttachments || files || [],
      mentions: mentions || [],
      mentioned_user_ids,
    });

    setIsReplyOpen(false);
    setIsRepliesExpanded(true);
  };

  const handleReactionSelect = (emojiKey) => {
    onReaction?.({
      messageId: message.id,
      emojiKey,
    });

    setIsReactionPickerOpen(false);
  };

  return (
    <div
      id={`message-${message?.id}`}
      style={{
        ...styles.wrapper,
        ...(isOwn ? styles.wrapperOwn : {}),
        ...(isHighlighted ? styles.highlighted : {}),
        ...(isReply ? styles.replyWrapper : {}),
      }}
      data-message-id={message?.id}
    >
      <div
        style={{
          ...styles.row,
          ...(isOwn ? styles.rowOwn : {}),
        }}
      >
        {!isOwn && (
          <MessageAvatar
            authorName={authorName}
            avatarUrl={getMessageAvatarUrl(message)}
            avatarSettings={getMessageAvatarSettings(message)}
            size={isReply ? 24 : 30}
          />
        )}

        <div
          style={{
            ...styles.messageBlock,
            ...(isOwn ? styles.messageBlockOwn : {}),
          }}
        >
          {!isOwn && !isReply && (
            <div style={styles.author}>{authorName}</div>
          )}

          <div
            style={{
              ...styles.bubble,
              ...(isOwn ? styles.bubbleOwn : styles.bubbleOther),
            }}
          >
            {!!body && <div style={styles.body}>{body}</div>}

            {!!attachments.length && (
              <div style={styles.attachments}>
                <ChatMessageAttachments
                  attachments={attachments}
                  onOpenFile={onOpenFile}
                />
              </div>
            )}

            <div style={styles.time}>
              {formatDate(getMessageCreatedAt(message))}
            </div>
          </div>

          {!isReply && (
            <div
              style={{
                ...styles.actions,
                ...(isOwn ? styles.actionsOwn : {}),
              }}
            >
              {Object.entries(reactionGroups).map(([emojiKey, reactions]) => (
                <button
                  key={emojiKey}
                  type="button"
                  style={styles.reactionBadge}
                  onClick={() => handleReactionSelect(emojiKey)}
                >
                  <EmojiIcon emojiKey={emojiKey} size={13} />
                  <span>{reactions.length}</span>
                </button>
              ))}

              <div style={styles.reactionWrapper}>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => setIsReactionPickerOpen((prev) => !prev)}
                >
                  Реакция
                </button>

                {isReactionPickerOpen && (
                  <div style={styles.reactionPicker}>
                    {reactionEmojiKeys.map((emojiKey) => (
                      <button
                        key={emojiKey}
                        type="button"
                        style={styles.reactionButton}
                        onClick={() => handleReactionSelect(emojiKey)}
                      >
                        <EmojiIcon emojiKey={emojiKey} size={18} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                style={styles.actionButton}
                onClick={() => setIsReplyOpen((prev) => !prev)}
              >
                {isReplyOpen ? "Отмена" : "Ответить"}
              </button>

              {isOwn && (
                <>
                  <button
                    type="button"
                    style={styles.actionButton}
                    onClick={() =>
                      onEdit?.({
                        messageId: message.id,
                        content: body,
                      })
                    }
                  >
                    Изменить
                  </button>

                  <button
                    type="button"
                    style={styles.deleteButton}
                    onClick={() => onDelete?.(message.id)}
                  >
                    Удалить
                  </button>
                </>
              )}
            </div>
          )}

          {!isReply && replies.length > 0 && (
            <button
              type="button"
              style={styles.repliesToggle}
              onClick={() => setIsRepliesExpanded((prev) => !prev)}
            >
              {isRepliesExpanded
                ? "Скрыть ответы"
                : getRepliesLabel(replies.length)}
            </button>
          )}

          {isReplyOpen && (
            <div style={styles.replyComposer}>
              <MessageComposer
                autoFocus
                placeholder="Написать ответ..."
                onSubmit={handleReplySubmit}
              />
            </div>
          )}

          {!!visibleReplies.length && (
            <div style={styles.replies}>
              {visibleReplies.map((reply) => (
                <ChatMessageItem
                  key={reply.id}
                  message={reply}
                  replies={[]}
                  highlightedMessageId={highlightedMessageId}
                  onReply={onReply}
                  onReaction={onReaction}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenFile={onOpenFile}
                  isReply
                />
              ))}
            </div>
          )}
        </div>

        {isOwn && (
          <MessageAvatar
            authorName={authorName}
            avatarUrl={getMessageAvatarUrl(message)}
            avatarSettings={getMessageAvatarSettings(message)}
            size={isReply ? 24 : 30}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    paddingBottom: 6,
    transition: "background 180ms ease",
  },

  wrapperOwn: {
    alignItems: "flex-end",
  },

  highlighted: {
    background: "#DBEAFE",
    borderRadius: 10,
  },

  replyWrapper: {
    marginTop: 6,
  },

  row: {
    maxWidth: "64%",
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },

  rowOwn: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  messageBlock: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },

  messageBlockOwn: {
    alignItems: "flex-end",
  },

  author: {
    paddingLeft: 2,
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
  },

  bubble: {
    minWidth: 0,
    maxWidth: "100%",
    padding: "10px 12px 8px",
    borderRadius: 12,
    boxSizing: "border-box",
    boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
  },

  bubbleOther: {
    background: "#FFFFFF",
    color: "#111827",
  },

  bubbleOwn: {
    background: "#E8F1FF",
    color: "#111827",
  },

  body: {
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  time: {
    marginTop: 4,
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
  },

  attachments: {
    marginTop: 8,
  },

  actions: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    minHeight: 24,
    gap: 10,
    flexWrap: "wrap",
    paddingLeft: 2,
  },

  actionsOwn: {
    justifyContent: "flex-end",
  },

  actionButton: {
    height: 24,
    display: "flex",
    alignItems: "center",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "0 4px",
    fontSize: 12,
    lineHeight: 1,
    color: "#6B7280",
  },

  deleteButton: {
    height: 24,
    display: "flex",
    alignItems: "center",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "0 4px",
    fontSize: 12,
    lineHeight: 1,
    color: "#e54b4b",
  },

  reactionBadge: {
    height: 22,
    padding: "0 6px",
    border: "1px solid #E5E7EB",
    borderRadius: 999,
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    fontSize: 11,
    color: "#374151",
  },

  reactionWrapper: {
    position: "relative",
  },

  reactionPicker: {
    position: "absolute",
    left: 0,
    bottom: 24,
    zIndex: 20,
    padding: 6,
    borderRadius: 10,
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    boxShadow: "0 12px 28px rgba(15,23,42,0.16)",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },

  reactionButton: {
    width: 28,
    height: 28,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  repliesToggle: {
    marginTop: 4,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "2px 4px",
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: 600,
  },

  replyComposer: {
    width: "100%",
    marginTop: 8,
  },

  replies: {
    width: "100%",
    marginTop: 8,
    paddingLeft: 24,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxSizing: "border-box",
  },
};