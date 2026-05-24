import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createComment as createCommentRequest,
  deleteComment as deleteCommentRequest,
  fetchComments,
  toggleCommentReaction as toggleCommentReactionRequest,
  updateComment as updateCommentRequest,
  uploadCommentAttachment as uploadCommentAttachmentRequest,
} from "../api/commentsApi";

import normalizeComment from "../domain/normalizeComment";

function normalizeMentionIds({
  mentionedUserIds = [],
  mentioned_user_ids = [],
}) {
  if (
    Array.isArray(mentionedUserIds) &&
    mentionedUserIds.length > 0
  ) {
    return mentionedUserIds;
  }

  if (
    Array.isArray(mentioned_user_ids) &&
    mentioned_user_ids.length > 0
  ) {
    return mentioned_user_ids;
  }

  return [];
}

function normalizeAttachments({
  files = [],
  attachments = [],
}) {
  if (
    Array.isArray(attachments) &&
    attachments.length > 0
  ) {
    return attachments;
  }

  if (
    Array.isArray(files) &&
    files.length > 0
  ) {
    return files;
  }

  return [];
}

export default function useComments({
  entityType,
  entityId,
}) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] = useState(null);

  const loadComments = useCallback(async () => {
    if (!entityType || !entityId) {
      setComments([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchComments({
        entityType,
        entityId,
      });

      const normalizedComments =
        Array.isArray(response?.items)
          ? response.items
              .map(normalizeComment)
              .filter(Boolean)
          : [];

      setComments(normalizedComments);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Ошибка загрузки комментариев"
      );
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const createComment = useCallback(
    async ({
      body,
      file_id = null,

      parentCommentId = null,

      mentionedUserIds = [],
      mentioned_user_ids = [],
    }) => {
      const normalizedMentionIds =
        normalizeMentionIds({
          mentionedUserIds,
          mentioned_user_ids,
        });

      const createdComment =
        await createCommentRequest({
          entityType,
          entityId,

          file_id,

          body,

          parentCommentId,

          mentionedUserIds:
            normalizedMentionIds,
        });

      const normalizedComment =
        normalizeComment(createdComment);

      setComments((prev) => [
        ...prev,
        normalizedComment,
      ]);

      return normalizedComment;
    },
    [entityType, entityId]
  );

  const updateComment = useCallback(
    async ({
      commentId,

      body,

      file_id = null,

      files = [],
      attachments = [],

      mentionedUserIds = [],
      mentioned_user_ids = [],
    }) => {
      const normalizedMentionIds =
        normalizeMentionIds({
          mentionedUserIds,
          mentioned_user_ids,
        });

      const normalizedAttachments =
        normalizeAttachments({
          files,
          attachments,
        });

      const updatedComment =
        await updateCommentRequest({
          commentId,

          file_id,

          body,

          mentionedUserIds:
            normalizedMentionIds,

          attachments:
            normalizedAttachments,

          files: normalizedAttachments,
        });

      const normalizedComment =
        normalizeComment(updatedComment);

      setComments((prev) =>
        prev.map((comment) =>
          String(comment.id) ===
          String(commentId)
            ? normalizedComment
            : comment
        )
      );

      return normalizedComment;
    },
    []
  );

  const deleteComment = useCallback(
    async (commentId) => {
      await deleteCommentRequest(commentId);

      setComments((prev) =>
        prev.filter(
          (comment) =>
            String(comment.id) !==
            String(commentId)
        )
      );

      return true;
    },
    []
  );

  const toggleReaction = useCallback(
    async ({
      commentId,
      emojiKey,
    }) => {
      await toggleCommentReactionRequest({
        commentId,
        emojiKey,
      });

      await loadComments();
    },
    [loadComments]
  );

  const uploadAttachment = useCallback(
    async ({
      commentId,
      file,
    }) => {
      const updatedComment =
        await uploadCommentAttachmentRequest({
          commentId,
          file,
        });

      const normalizedComment =
        normalizeComment(updatedComment);

      setComments((prev) =>
        prev.map((comment) =>
          String(comment.id) ===
          String(commentId)
            ? normalizedComment
            : comment
        )
      );

      return normalizedComment;
    },
    []
  );

  const rootComments = useMemo(() => {
    return comments.filter(
      (comment) => !comment.parentCommentId
    );
  }, [comments]);

  const getReplies = useCallback(
    (commentId) => {
      return comments.filter(
        (comment) =>
          String(comment.parentCommentId) ===
          String(commentId)
      );
    },
    [comments]
  );

  return {
    comments,
    rootComments,

    isLoading,
    error,

    loadComments,

    createComment,
    updateComment,
    deleteComment,

    toggleReaction,
    uploadAttachment,

    getReplies,
  };
}