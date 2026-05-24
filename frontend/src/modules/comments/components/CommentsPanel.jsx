import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { uploadFile } from "../../../shared/files/api/filesApi";

import useComments from "../hooks/useComments";

import CommentComposer from "./CommentComposer";
import CommentItem from "./CommentItem";

const panelStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#FFFFFF",
};

const headerStyle = {
  width: "100%",
  minHeight: 44,
  borderBottom: "1px solid #F1F5F9",
  padding: "12px 12px 6px 10px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  background: "#FFFFFF",
  flexShrink: 0,
};

const titleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 15,
  fontWeight: 700,
  color: "#0F172A",
  whiteSpace: "nowrap",
};

const countStyle = {
  color: "#94A3B8",
  fontSize: 13,
  fontWeight: 600,
};

const filterStyle = {
  height: 30,
  minWidth: 120,
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  background: "#FFFFFF",
  padding: "0 28px 0 10px",
  fontSize: 12,
  fontWeight: 500,
  color: "#475569",
  outline: "none",
  cursor: "pointer",
};

const bodyStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "4px 6px 2px",
  boxSizing: "border-box",
};

const composerWrapperStyle = {
  width: "100%",
  padding: "2px 8px 4px",
  boxSizing: "border-box",
  background: "#FFFFFF",
};

const emptyStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#94A3B8",
  fontSize: 13,
  padding: 24,
};

const loadingStyle = {
  padding: 12,
  fontSize: 13,
  color: "#64748B",
};

const errorStyle = {
  padding: 12,
  fontSize: 13,
  color: "#DC2626",
};

const highlightStyleId =
  "comments-panel-highlight-style";

function ensureHighlightStyle() {
  if (document.getElementById(highlightStyleId)) {
    return;
  }

  const style = document.createElement("style");

  style.id = highlightStyleId;

  style.innerHTML = `
    .comment-highlight-animation {
      animation: commentHighlightPulse 2.6s ease;
      border-radius: 12px;
    }

    @keyframes commentHighlightPulse {
      0% {
        background: rgba(59, 109, 245, 0.18);
        box-shadow: 0 0 0 2px rgba(59, 109, 245, 0.22);
      }

      55% {
        background: rgba(59, 109, 245, 0.10);
        box-shadow: 0 0 0 2px rgba(59, 109, 245, 0.12);
      }

      100% {
        background: transparent;
        box-shadow: none;
      }
    }
  `;

  document.head.appendChild(style);
}

async function uploadAndAttachFiles({
  files = [],
  comment,
  uploadAttachment,
}) {
  if (!comment?.id || !files.length) {
    return;
  }

  for (const file of files) {
    const uploadedFile = await uploadFile({
      file,
    });

    await uploadAttachment({
      commentId: comment.id,
      file: uploadedFile,
    });
  }
}

function hasAttachments(comment) {
  return (
    Array.isArray(comment?.attachments) &&
    comment.attachments.length > 0
  );
}

function normalizeMentionIds(payload) {
  const snake = Array.isArray(
    payload?.mentioned_user_ids
  )
    ? payload.mentioned_user_ids
    : [];

  const camel = Array.isArray(
    payload?.mentionedUserIds
  )
    ? payload.mentionedUserIds
    : [];

  return snake.length > 0 ? snake : camel;
}

function getCommentIdFromContext(context) {
  return (
    context?.comment_id ||
    context?.commentId ||
    context?.highlight_id?.replace?.(
      "comment-",
      ""
    ) ||
    null
  );
}

function resolveFileId({
  entityType,
  fileId,
  initialContext,
}) {
  if (entityType !== "file") {
    return null;
  }

  return (
    initialContext?.file_id ||
    initialContext?.fileId ||
    fileId ||
    null
  );
}

export default function CommentsPanel({
  entityType,
  entityId,
  fileId = null,
  initialContext = null,
}) {
  const {
    rootComments,
    isLoading,
    error,

    createComment,
    updateComment,
    deleteComment,

    toggleReaction,
    uploadAttachment,

    getReplies,
  } = useComments({
    entityType,
    entityId,
  });

  const bodyRef = useRef(null);
  const scrollModeRef = useRef(null);
  const savedScrollTopRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const deepNavigationDoneRef = useRef(false);

  const [filter, setFilter] = useState("all");

  const [
    highlightedCommentId,
    setHighlightedCommentId,
  ] = useState(null);

  const resolvedFileId = resolveFileId({
    entityType,
    fileId,
    initialContext,
  });

  const saveScrollPosition = () => {
    const container = bodyRef.current;

    if (!container) return;

    savedScrollTopRef.current =
      container.scrollTop;
  };

  const restoreScrollPosition = () => {
    requestAnimationFrame(() => {
      const container = bodyRef.current;

      if (!container) return;

      container.scrollTop =
        savedScrollTopRef.current;
    });
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const container = bodyRef.current;

      if (!container) return;

      container.scrollTop =
        container.scrollHeight;
    });
  };

  const scrollToComment = (commentId) => {
    if (!commentId) return;

    requestAnimationFrame(() => {
      ensureHighlightStyle();

      const container = bodyRef.current;

      if (!container) return;

      const element =
        container.querySelector(
          `[data-comment-id="${commentId}"]`
        );

      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightedCommentId(
        String(commentId)
      );

      element.classList.remove(
        "comment-highlight-animation"
      );

      requestAnimationFrame(() => {
        element.classList.add(
          "comment-highlight-animation"
        );
      });

      window.setTimeout(() => {
        element.classList.remove(
          "comment-highlight-animation"
        );
      }, 2600);
    });
  };

  useEffect(() => {
    isFirstLoadRef.current = true;
    scrollModeRef.current = null;
    savedScrollTopRef.current = 0;
    deepNavigationDoneRef.current = false;

    setHighlightedCommentId(null);
  }, [entityType, entityId]);

  useEffect(() => {
    if (!initialContext) return;
    if (isLoading) return;
    if (deepNavigationDoneRef.current) return;

    const commentId =
      getCommentIdFromContext(initialContext);

    if (!commentId) return;

    setFilter("all");
    setHighlightedCommentId(String(commentId));

    deepNavigationDoneRef.current = true;

    window.setTimeout(() => {
      scrollToComment(commentId);
    }, 300);
  }, [initialContext, isLoading, rootComments]);

  useLayoutEffect(() => {
    const container = bodyRef.current;

    if (!container) return;
    if (isLoading) return;

    if (
      initialContext &&
      !deepNavigationDoneRef.current
    ) {
      return;
    }

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;

      if (!initialContext) {
        scrollToBottom();
      }

      return;
    }

    if (scrollModeRef.current === "bottom") {
      scrollToBottom();
      scrollModeRef.current = null;
      return;
    }

    if (scrollModeRef.current === "restore") {
      container.scrollTop =
        savedScrollTopRef.current;

      scrollModeRef.current = null;
    }
  }, [rootComments, isLoading, initialContext]);

  const filteredComments = useMemo(() => {
    switch (filter) {
      case "system":
        return rootComments.filter(
          (comment) => comment.isSystem
        );

      case "user":
        return rootComments.filter(
          (comment) => !comment.isSystem
        );

      case "attachments":
        return rootComments.filter((comment) => {
          if (hasAttachments(comment)) {
            return true;
          }

          const replies =
            getReplies?.(comment.id) || [];

          return replies.some((reply) =>
            hasAttachments(reply)
          );
        });

      default:
        return rootComments;
    }
  }, [filter, rootComments, getReplies]);

  const handleSubmit = async (payload = {}) => {
    const { body, files = [] } = payload;

    const mentionedUserIds =
      normalizeMentionIds(payload);

    scrollModeRef.current = "bottom";

    const comment = await createComment({
      body: body || " ",
      file_id: resolvedFileId,
      mentioned_user_ids: mentionedUserIds,
    });

    await uploadAndAttachFiles({
      files,
      comment,
      uploadAttachment,
    });

    scrollToBottom();
  };

  const handleReply = async (payload = {}) => {
    const {
      parentComment,
      body,
      files = [],
    } = payload;

    if (!parentComment?.id) return;

    const mentionedUserIds =
      normalizeMentionIds(payload);

    saveScrollPosition();

    scrollModeRef.current = "restore";

    const comment = await createComment({
      body: body || " ",
      file_id: resolvedFileId,
      parentCommentId: parentComment.id,
      mentioned_user_ids: mentionedUserIds,
    });

    await uploadAndAttachFiles({
      files,
      comment,
      uploadAttachment,
    });

    restoreScrollPosition();
  };

  const handleEdit = async (payload = {}) => {
    saveScrollPosition();

    scrollModeRef.current = "restore";

    const mentionedUserIds =
      normalizeMentionIds(payload);

    const result = await updateComment?.({
      commentId: payload.commentId,
      body: payload.body,
      file_id: resolvedFileId,
      files: payload.files || [],
      attachments:
        payload.attachments || payload.files || [],
      mentioned_user_ids: mentionedUserIds,
    });

    restoreScrollPosition();

    return result;
  };

  const handleDelete = async (commentId) => {
    saveScrollPosition();

    scrollModeRef.current = "restore";

    const result =
      await deleteComment?.(commentId);

    restoreScrollPosition();

    return result;
  };

  const handleReaction = async (payload) => {
    saveScrollPosition();

    scrollModeRef.current = "restore";

    await toggleReaction?.(payload);

    restoreScrollPosition();
  };

  const handleFilterChange = (event) => {
    saveScrollPosition();

    scrollModeRef.current = "restore";

    setFilter(event.target.value);
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <span>Комментарии</span>

          <span style={countStyle}>
            {rootComments.length}
          </span>
        </div>

        <select
          value={filter}
          style={filterStyle}
          onChange={handleFilterChange}
        >
          <option value="all">Все</option>

          <option value="user">
            Пользовательские
          </option>

          <option value="system">
            Системные
          </option>

          <option value="attachments">
            С вложениями
          </option>
        </select>
      </div>

      <div ref={bodyRef} style={bodyStyle}>
        {isLoading && (
          <div style={loadingStyle}>
            Загрузка комментариев...
          </div>
        )}

        {!!error && (
          <div style={errorStyle}>{error}</div>
        )}

        {!isLoading &&
          !error &&
          !filteredComments.length && (
            <div style={emptyStyle}>
              Пока нет рабочей истории по объекту
            </div>
          )}

        {!isLoading &&
          !error &&
          filteredComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              onReply={handleReply}
              onReaction={handleReaction}
              onEdit={handleEdit}
              onDelete={handleDelete}
              highlightedCommentId={
                highlightedCommentId
              }
            />
          ))}
      </div>

      <div style={composerWrapperStyle}>
        <CommentComposer
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}