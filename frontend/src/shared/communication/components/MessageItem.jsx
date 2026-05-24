import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { uploadFile } from "../../files/api/filesApi";
import FileViewerModal from "../../files/components/FileViewerModal";

import EmojiIcon from "../../../modules/comments/components/EmojiIcon";
import MessageAvatar from "./MessageAvatar";
import MessageComposer from "./MessageComposer";
import MessageAttachments from "./MessageAttachments";
import MessageDeleteConfirm from "./MessageDeleteConfirm";
import MessageEditForm from "./MessageEditForm";
import MessageMentionEmojiPopover from "./MessageMentionEmojiPopover";

import { reactionEmojiKeys } from "../../../modules/comments/emoji/emojiRegistry";
import { emojiFileMap } from "../../../modules/comments/emoji/emojiFileMap";

import {
  MENTION_POPOVER_WIDTH,
  MENTION_POPOVER_HEIGHT,
  EMOJI_POPOVER_WIDTH,
  EMOJI_POPOVER_HEIGHT,
  loadSystemUsers,
  getCurrentUserId,
  getMessageAuthorId,
  getMessageAuthorName,
  getMessageAvatarUrl,
  getMessageAvatarSettings,
  getMessageBody,
  normalizeUser,
  formatDate,
  groupReactions,
  getRepliesLabel,
  getSystemText,
  isSameMessageId,
  hasHighlightedReply,
  isLongText,
  getAttachmentKey,
  emojiCodeToChar,
  getPopoverPosition,
} from "../domain/messageItemUtils";

import {
  wrapperStyle,
  highlightedWrapperStyle,
  rowStyle,
  contentStyle,
  headerStyle,
  headerLeftStyle,
  authorStyle,
  dateStyle,
  editedStyle,
  bodyStyle,
  collapsedBodyStyle,
  textToggleStyle,
  textToggleLineStyle,
  textToggleLabelStyle,
  moreButtonStyle,
  menuStyle,
  menuButtonStyle,
  menuDeleteButtonStyle,
  actionsStyle,
  actionsRightStyle,
  reactionsStyle,
  reactionBadgeStyle,
  reactionTriggerStyle,
  chevronStyle,
  reactionsPopoverWrapperStyle,
  reactionsOverlayStyle,
  reactionEmojiButtonStyle,
  replyButtonStyle,
  repliesDividerStyle,
  repliesDividerLineStyle,
  repliesDividerTextStyle,
  systemStyle,
  systemTitleStyle,
  systemBodyStyle,
  repliesWrapperStyle,
  replyComposerStyle,
} from "../styles/messageItemStyles";

function getFileId(file) {
  return (
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    file?.url ||
    file?.fileUrl ||
    file?.file_url ||
    null
  );
}

function getMessageAttachments(message) {
  if (Array.isArray(message?.attachments)) return message.attachments;
  if (Array.isArray(message?.files)) return message.files;
  return [];
}

function getMessageCreatedAt(message) {
  return message?.createdAt || message?.created_at || "";
}

function getMessageEditedAt(message) {
  return message?.editedAt || message?.edited_at || "";
}

function getMessageVersion(message) {
  return Number(message?.version || 0);
}

function getMessageMentions(message) {
  if (Array.isArray(message?.mentions)) return message.mentions;
  return [];
}

function getMentionedUserId(item) {
  return (
    item?.mentioned_user_id ||
    item?.mentionedUserId ||
    item?.user_id ||
    item?.userId ||
    null
  );
}

function getParentPayloadName(mode) {
  if (mode === "comment") return "parentComment";
  if (mode === "chat") return "parentMessage";
  return "parentMessage";
}

function getIdPayloadName(mode) {
  if (mode === "comment") return "commentId";
  if (mode === "chat") return "messageId";
  return "messageId";
}

function getHighlightIdPrefix(mode) {
  if (mode === "comment") return "comment";
  if (mode === "chat") return "chat-message";
  return "message";
}

function getAttachmentSource(mode) {
  if (mode === "comment") return "comment_attachment_file";
  if (mode === "chat") return "chat_attachment_file";
  return "message_attachment_file";
}

export default function MessageItem({
  mode = "message",
  message,
  comment,
  replies = [],
  onReply,
  onReaction,
  onEdit,
  onDelete,
  isReply = false,
  highlightedMessageId = null,
  highlightedCommentId = null,
  onOpenFile,
}) {
  const currentMessage = message || comment;

  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [reactionMenuPosition, setReactionMenuPosition] = useState(null);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isHighlightVisible, setIsHighlightVisible] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editAttachments, setEditAttachments] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [previewFile, setPreviewFile] = useState(null);

  const [users, setUsers] = useState([]);
  const [mentionedUserIds, setMentionedUserIds] = useState([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState(null);

  const reactionsRef = useRef(null);
  const overlayRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const editFileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const mentionButtonRef = useRef(null);

  const activeHighlightedId = highlightedMessageId || highlightedCommentId;

  const hasReplies = replies.length > 0;
  const isHighlighted = isSameMessageId(currentMessage?.id, activeHighlightedId);

  const shouldExpandForHighlight = hasHighlightedReply(
    replies,
    activeHighlightedId
  );

  const visibleReplies = useMemo(() => {
    if (!hasReplies) return [];
    return isRepliesExpanded ? replies : [];
  }, [hasReplies, isRepliesExpanded, replies]);

  const emojiItems = useMemo(() => {
    return Object.entries(emojiFileMap)
      .map(([code, icon]) => ({
        key: code,
        code,
        icon,
        symbol: emojiCodeToChar(code),
      }))
      .filter((emoji) => emoji.icon && emoji.symbol);
  }, []);

  const currentUserId = getCurrentUserId();
  const authorId = getMessageAuthorId(currentMessage);
  const isAuthor = Boolean(
    currentUserId && authorId && currentUserId === authorId
  );

  const activePopoverSize = isMentionOpen
    ? {
        width: MENTION_POPOVER_WIDTH,
        maxHeight: MENTION_POPOVER_HEIGHT,
      }
    : {
        width: EMOJI_POPOVER_WIDTH,
        maxHeight: EMOJI_POPOVER_HEIGHT,
      };

  const activePopoverMode = isMentionOpen ? "mention" : "emoji";

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await loadSystemUsers();
        setUsers(data.map(normalizeUser).filter((user) => user.id));
      } catch (error) {
        console.error("Ошибка загрузки пользователей", error);
        setUsers([]);
      }
    }

    loadUsers();
  }, []);

  useEffect(() => {
    if (!shouldExpandForHighlight) return;
    setIsRepliesExpanded(true);
  }, [shouldExpandForHighlight]);

  useEffect(() => {
    if (!isHighlighted) {
      setIsHighlightVisible(false);
      return;
    }

    setIsTextExpanded(true);
    setIsHighlightVisible(true);

    const timer = window.setTimeout(() => {
      setIsHighlightVisible(false);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [isHighlighted]);

  useEffect(() => {
    if (!isReactionMenuOpen) return;

    const handleClose = (event) => {
      if (reactionsRef.current?.contains(event.target)) return;
      if (overlayRef.current?.contains(event.target)) return;

      setIsReactionMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleClose, true);

    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [isReactionMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClose = (event) => {
      if (menuButtonRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;

      setIsMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleClose, true);

    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [isMenuOpen]);

  if (!currentMessage) return null;

  if (currentMessage.isSystem) {
    return (
      <div style={systemStyle} data-message-id={currentMessage.id}>
        <div style={systemTitleStyle}>
          Система • {formatDate(getMessageCreatedAt(currentMessage))}
        </div>

        <div style={systemBodyStyle}>{getSystemText(currentMessage)}</div>
      </div>
    );
  }

  const authorName = getMessageAuthorName(currentMessage);
  const body = getMessageBody(currentMessage);
  const attachments = getMessageAttachments(currentMessage);
  const reactionGroups = groupReactions(currentMessage.reactions);

  const shouldCollapseText = isLongText(body);
  const currentBodyStyle =
    shouldCollapseText && !isTextExpanded ? collapsedBodyStyle : bodyStyle;

  const isEdited = Boolean(
    getMessageEditedAt(currentMessage) || getMessageVersion(currentMessage) > 1
  );

  const closePopovers = () => {
    setIsEmojiOpen(false);
    setIsMentionOpen(false);
    setPopoverPosition(null);
  };

  const handleOpenFile = (file) => {
    if (onOpenFile) {
      onOpenFile(file);
      return;
    }

    const rawFileUrl = file?.fileUrl || file?.file_url || file?.url || "";

    const normalizedFileUrl = rawFileUrl.startsWith("http")
      ? rawFileUrl
      : `http://127.0.0.1:8010${rawFileUrl}`;

    const fileId =
      file?.stored_file_name ||
      file?.storedFileName ||
      file?.file_id ||
      file?.fileId ||
      file?.id ||
      null;

    console.log("MESSAGE ATTACHMENT OPEN:", {
      file,
      fileId,
      normalizedFileUrl,
    });

    if (!normalizedFileUrl || !fileId) {
      console.error("Не удалось открыть файл", {
        file,
        fileId,
        normalizedFileUrl,
      });

      return;
    }

    setPreviewFile({
      fileUrl: normalizedFileUrl,

      fileName: file?.fileName || file?.file_name || file?.name || "Файл",

      fileType: file?.fileType || file?.file_type || file?.type || "",

      raw: {
        ...file,

        id: fileId,
        fileId,
        file_id: fileId,

        fileUrl: normalizedFileUrl,
        file_url: normalizedFileUrl,
      },

      notificationContext: {
        source: getAttachmentSource(mode),

        entity_type: "file",
        entity_id: fileId,

        file_id: fileId,
        file_url: normalizedFileUrl,

        message_id: currentMessage?.id,
        comment_id: mode === "comment" ? currentMessage?.id : undefined,
        chat_message_id: mode === "chat" ? currentMessage?.id : undefined,

        parent_message_id:
          currentMessage?.parentMessageId ||
          currentMessage?.parent_message_id ||
          null,

        parent_comment_id:
          currentMessage?.parentCommentId ||
          currentMessage?.parent_comment_id ||
          null,

        highlight_id: `${getHighlightIdPrefix(mode)}-${currentMessage?.id}`,

        tab: "comments",
      },
    });
  };

  const handleClosePreviewFile = () => {
    setPreviewFile(null);
  };

  const handleReplySubmit = async ({ body: replyBody, files, mentioned_user_ids }) => {
    await onReply?.({
      [getParentPayloadName(mode)]: currentMessage,
      parentMessage: currentMessage,
      parentComment: currentMessage,
      body: replyBody,
      content: replyBody,
      files,
      mentioned_user_ids,
    });

    setIsReplyOpen(false);
    setIsRepliesExpanded(true);
  };

  const handleReactionSelect = (emojiKey) => {
    onReaction?.({
      [getIdPayloadName(mode)]: currentMessage.id,
      messageId: currentMessage.id,
      commentId: currentMessage.id,
      emojiKey,
    });

    setIsReactionMenuOpen(false);
  };

  const handleToggleReactionMenu = () => {
    const rect = reactionsRef.current?.getBoundingClientRect();

    if (!rect) return;

    const panelWidth = 220;
    const safeLeft = Math.min(
      Math.max(rect.left, 8),
      window.innerWidth - panelWidth - 8
    );

    setReactionMenuPosition({
      top: rect.bottom + 4,
      left: safeLeft,
    });

    setIsReactionMenuOpen((prev) => !prev);
  };

  const handleToggleMenu = () => {
    const rect = menuButtonRef.current?.getBoundingClientRect();

    if (!rect) return;

    const width = 150;
    const safeLeft = Math.min(
      Math.max(rect.right - width, 8),
      window.innerWidth - width - 8
    );

    setMenuPosition({
      top: rect.bottom + 4,
      left: safeLeft,
    });

    setIsMenuOpen((prev) => !prev);
  };

  const handleStartEdit = () => {
    setEditBody(String(body || ""));
    setEditAttachments(Array.isArray(attachments) ? [...attachments] : []);

    setMentionedUserIds(
      getMessageMentions(currentMessage)
        .map(getMentionedUserId)
        .filter(Boolean)
    );

    setIsEditing(true);
    setIsTextExpanded(true);
    setIsMenuOpen(false);
  };

  const handleCancelEdit = () => {
    setEditBody("");
    setEditAttachments([]);
    setMentionedUserIds([]);
    closePopovers();
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const nextBody = String(editBody || "").trim();

    if (!nextBody) return;

    await onEdit?.({
      [getIdPayloadName(mode)]: currentMessage.id,
      messageId: currentMessage.id,
      commentId: currentMessage.id,
      body: nextBody,
      content: nextBody,
      files: editAttachments,
      attachments: editAttachments,
      mentioned_user_ids: mentionedUserIds,
    });

    setIsEditing(false);
    setEditBody("");
    setEditAttachments([]);
    setMentionedUserIds([]);
    closePopovers();
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    await onDelete?.(currentMessage.id);
    setIsDeleteConfirmOpen(false);
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmOpen(false);
  };

  const handleToggleReplies = () => {
    setIsRepliesExpanded((prev) => !prev);
  };

  const handleEditFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    event.target.value = "";

    if (!selectedFiles.length) return;

    try {
      const uploadedFiles = [];

      for (const file of selectedFiles) {
        const uploaded = await uploadFile({ file });

        if (uploaded) {
          uploadedFiles.push(uploaded);
        }
      }

      if (!uploadedFiles.length) return;

      setEditAttachments((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error("Ошибка загрузки файла сообщения", error);
    }
  };

  const handleDeleteEditAttachment = (fileToDelete) => {
    const deleteKey = getAttachmentKey(fileToDelete, 0);

    setEditAttachments((prev) =>
      prev.filter((file, index) => getAttachmentKey(file, index) !== deleteKey)
    );
  };

  const handleMentionUser = (user) => {
    const normalizedUser = normalizeUser(user);

    if (!normalizedUser.id) return;

    const mentionText = `@${normalizedUser.label} `;

    setEditBody((prev) => `${String(prev || "")}${mentionText}`);

    setMentionedUserIds((prev) => {
      if (prev.includes(normalizedUser.id)) return prev;
      return [...prev, normalizedUser.id];
    });

    closePopovers();
  };

  const handleToggleMention = () => {
    const rect = mentionButtonRef.current?.getBoundingClientRect();

    setPopoverPosition(
      getPopoverPosition(
        rect,
        MENTION_POPOVER_WIDTH,
        MENTION_POPOVER_HEIGHT
      )
    );

    setIsMentionOpen((prev) => !prev);
    setIsEmojiOpen(false);
  };

  const handleToggleEmoji = () => {
    const rect = emojiButtonRef.current?.getBoundingClientRect();

    setPopoverPosition(
      getPopoverPosition(rect, EMOJI_POPOVER_WIDTH, EMOJI_POPOVER_HEIGHT)
    );

    setIsEmojiOpen((prev) => !prev);
    setIsMentionOpen(false);
  };

  const handleEmojiSelect = (emoji) => {
    if (!emoji?.symbol) return;

    setEditBody((prev) => `${String(prev || "")}${emoji.symbol}`);
    closePopovers();
  };

  return (
    <div
      id={`message-${currentMessage?.id}`}
      style={isHighlightVisible ? highlightedWrapperStyle : wrapperStyle}
      data-message-id={currentMessage.id}
      data-comment-id={mode === "comment" ? currentMessage.id : undefined}
    >
      <div style={rowStyle}>
        <MessageAvatar
          authorName={authorName}
          avatarUrl={getMessageAvatarUrl(currentMessage)}
          avatarSettings={getMessageAvatarSettings(currentMessage)}
          size={isReply ? 24 : 28}
        />

        <div style={contentStyle}>
          <div style={headerStyle}>
            <div style={headerLeftStyle}>
              <div style={authorStyle}>{authorName}</div>

              <div style={dateStyle}>
                {formatDate(getMessageCreatedAt(currentMessage))}
              </div>

              {isEdited && <div style={editedStyle}>изменено</div>}
            </div>

            {isAuthor && (
              <button
                ref={menuButtonRef}
                type="button"
                title="Действия"
                style={moreButtonStyle}
                onClick={handleToggleMenu}
              >
                ⋯
              </button>
            )}
          </div>

          {isEditing ? (
            <MessageEditForm
              value={editBody}
              attachments={editAttachments}
              fileInputRef={editFileInputRef}
              mentionButtonRef={mentionButtonRef}
              emojiButtonRef={emojiButtonRef}
              onChange={setEditBody}
              onFileSelect={handleEditFileSelect}
              onDeleteAttachment={handleDeleteEditAttachment}
              onToggleMention={handleToggleMention}
              onToggleEmoji={handleToggleEmoji}
              onCancel={handleCancelEdit}
              onSave={handleSaveEdit}
            />
          ) : (
            <>
              <div style={currentBodyStyle}>{body}</div>

              {shouldCollapseText && (
                <button
                  type="button"
                  style={textToggleStyle}
                  onClick={() => setIsTextExpanded((prev) => !prev)}
                >
                  <span style={textToggleLineStyle} />
                  <span style={textToggleLabelStyle}>
                    {isTextExpanded ? "Свернуть ↑" : "Развернуть ↓"}
                  </span>
                  <span style={textToggleLineStyle} />
                </button>
              )}
            </>
          )}

          {!isEditing && !!attachments.length && (
            <MessageAttachments
              attachments={attachments}
              onOpenFile={handleOpenFile}
            />
          )}

          {!isReply && !isEditing && (
            <div style={actionsStyle}>
              <div style={actionsRightStyle}>
                <div style={reactionsStyle}>
                  {Object.entries(reactionGroups).map(
                    ([emojiKey, reactions]) => (
                      <button
                        key={emojiKey}
                        type="button"
                        style={reactionBadgeStyle}
                        onClick={() => handleReactionSelect(emojiKey)}
                      >
                        <EmojiIcon emojiKey={emojiKey} size={12} />
                        <span>{reactions.length}</span>
                      </button>
                    )
                  )}

                  <div ref={reactionsRef} style={reactionsPopoverWrapperStyle}>
                    {isReactionMenuOpen &&
                      reactionMenuPosition &&
                      createPortal(
                        <div
                          ref={overlayRef}
                          style={{
                            ...reactionsOverlayStyle,
                            top: reactionMenuPosition.top,
                            left: reactionMenuPosition.left,
                          }}
                        >
                          {reactionEmojiKeys.map((emojiKey) => (
                            <button
                              key={emojiKey}
                              type="button"
                              style={reactionEmojiButtonStyle}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleReactionSelect(emojiKey);
                              }}
                            >
                              <EmojiIcon emojiKey={emojiKey} size={18} />
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}

                    <button
                      type="button"
                      style={reactionTriggerStyle}
                      onClick={handleToggleReactionMenu}
                    >
                      <EmojiIcon emojiKey="heart" size={18} />
                      <div style={chevronStyle}>˅</div>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  style={replyButtonStyle}
                  onClick={() => setIsReplyOpen((prev) => !prev)}
                >
                  {isReplyOpen ? "Отмена" : "Ответить"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <MessageMentionEmojiPopover
        isOpen={Boolean((isEmojiOpen || isMentionOpen) && popoverPosition)}
        mode={activePopoverMode}
        position={popoverPosition}
        size={activePopoverSize}
        users={users}
        emojiItems={emojiItems}
        onClose={closePopovers}
        onMentionUser={handleMentionUser}
        onEmojiSelect={handleEmojiSelect}
      />

      {isMenuOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              ...menuStyle,
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            <button type="button" style={menuButtonStyle} onClick={handleStartEdit}>
              Редактировать
            </button>

            <button type="button" style={menuDeleteButtonStyle} onClick={handleDelete}>
              Удалить
            </button>
          </div>,
          document.body
        )}

      <MessageDeleteConfirm
        isOpen={isDeleteConfirmOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <FileViewerModal
        isOpen={Boolean(previewFile)}
        fileUrl={previewFile?.fileUrl}
        fileName={previewFile?.fileName}
        fileType={previewFile?.fileType}
        fileId={getFileId(previewFile?.raw)}
        userId="1"
        userName="Михаил"
        mode="view"
        workspaceLeftOffset={240}
        workspaceTopOffset={0}
        initialContext={
          previewFile?.notificationContext || {
            entityType: "file",
            entityId: getFileId(previewFile?.raw),
            fileId: getFileId(previewFile?.raw),
            tab: "comments",
          }
        }
        onClose={handleClosePreviewFile}
      />

      {!isReply && hasReplies && (
        <div style={repliesDividerStyle} onClick={handleToggleReplies}>
          <div style={repliesDividerLineStyle} />

          <button
            type="button"
            style={repliesDividerTextStyle}
            onClick={(event) => {
              event.stopPropagation();
              handleToggleReplies();
            }}
          >
            {isRepliesExpanded ? "Скрыть ответы" : getRepliesLabel(replies.length)}
          </button>

          <div style={repliesDividerLineStyle} />
        </div>
      )}

      {isReplyOpen && (
        <div style={replyComposerStyle}>
          <MessageComposer
            autoFocus
            placeholder="Написать ответ..."
            onSubmit={handleReplySubmit}
          />
        </div>
      )}

      {!!visibleReplies.length && (
        <div style={repliesWrapperStyle}>
          {visibleReplies.map((reply) => (
            <MessageItem
              key={reply.id}
              mode={mode}
              message={reply}
              replies={[]}
              onReply={onReply}
              onReaction={onReaction}
              onEdit={onEdit}
              onDelete={onDelete}
              isReply
              highlightedMessageId={activeHighlightedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}