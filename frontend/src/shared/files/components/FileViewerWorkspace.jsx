import { useEffect, useState } from "react";

import FileViewer from "./FileViewer";
import { useResolvedProtectedFileUrl } from "../useResolvedProtectedFileUrl";
import CommentsPanel from "../../../modules/comments/components/CommentsPanel";
import { setEntityLocationRegistryEntry } from "../../../modules/navigation/entityLocationRegistry";
import { getFileDiscussionEntity } from "../services/fileDiscussionContext";
import FileViewerActionsToolbar from "./FileViewerActionsToolbar";
import {
  FILE_VIEWER_ACTIONS_RIGHT_BASE,
  FILE_VIEWER_COMMENTS_PANEL_WIDTH,
  hasInitialFileCommentContext,
  isSameFileViewerTarget,
  normalizeFileViewerContext,
  normalizeFileViewerId,
  resolveFileViewerDiscussionId,
} from "./fileViewerDiscussionUtils";

import "./fileViewerWorkspace.css";

export default function FileViewerWorkspace({
  fileUrl,
  fileName,
  fileType,
  fileId,
  documentRecord = null,
  userId,
  userName,
  mode = "view",
  initialContext = null,
  onClose,
  defaultCommentsOpen = false,
  actionsRightBase = FILE_VIEWER_ACTIONS_RIGHT_BASE,
  showClose = true,
}) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(
    defaultCommentsOpen || hasInitialFileCommentContext(initialContext),
  );
  const [notificationContext, setNotificationContext] = useState(initialContext);

  const discussionFileId = resolveFileViewerDiscussionId({
    fileId,
    initialContext,
    documentRecord,
    getFileDiscussionEntity,
  });

  useEffect(() => {
    const normalizedFileId = normalizeFileViewerId(discussionFileId);
    const normalizedFileUrl = normalizeFileViewerId(fileUrl);

    if (!normalizedFileId && !normalizedFileUrl) {
      return;
    }

    const location = {
      module: "fileViewer",
      fileId: normalizedFileId,
      fileUrl: normalizedFileUrl,
      fileName: fileName || "",
      pageId: window.location.pathname || "",
    };

    if (normalizedFileId) {
      setEntityLocationRegistryEntry(`files.${normalizedFileId}`, location);
    }

    if (normalizedFileUrl) {
      setEntityLocationRegistryEntry(`files.${normalizedFileUrl}`, location);
    }
  }, [discussionFileId, fileUrl, fileName]);

  useEffect(() => {
    if (hasInitialFileCommentContext(initialContext)) {
      setNotificationContext(initialContext);
      setIsCommentsOpen(true);
    }
  }, [discussionFileId, initialContext]);

  useEffect(() => {
    function handlePendingTarget(event) {
      const detail = event.detail || {};
      const context = normalizeFileViewerContext(detail);

      const isTarget = isSameFileViewerTarget({
        targetEntityType: context.entity_type,
        targetEntityId: context.entity_id,
        targetFileId: context.file_id,
        targetFileUrl: context.file_url,
        fileId: discussionFileId,
        fileUrl,
      });

      if (!isTarget) {
        return;
      }

      setNotificationContext(context);
      setIsCommentsOpen(true);
    }

    window.addEventListener(
      "yasnopro:notification:pending-target",
      handlePendingTarget,
    );

    return () => {
      window.removeEventListener(
        "yasnopro:notification:pending-target",
        handlePendingTarget,
      );
    };
  }, [discussionFileId, fileUrl]);

  const effectiveInitialContext = notificationContext || initialContext;
  const {
    resolvedUrl: resolvedFileUrl,
    loading: protectedFileLoading,
    error: protectedFileError,
  } = useResolvedProtectedFileUrl(fileUrl);

  return (
    <div
      className={`file-viewer-workspace${
        isCommentsOpen ? " file-viewer-workspace--comments-open" : ""
      }`}
    >
      <FileViewerActionsToolbar
        onClose={onClose}
        onToggleComments={() => setIsCommentsOpen((previous) => !previous)}
        isCommentsOpen={isCommentsOpen}
        showClose={showClose}
        actionsRightBase={actionsRightBase}
      />

      <div className="file-viewer-workspace__viewer">
        {protectedFileLoading ? (
          <div className="file-viewer-workspace__comments-unavailable">
            Загрузка файла…
          </div>
        ) : protectedFileError ? (
          <div className="file-viewer-workspace__comments-unavailable">
            {protectedFileError?.message || "Не удалось загрузить файл"}
          </div>
        ) : (
          <FileViewer
            fileUrl={resolvedFileUrl}
            fileName={fileName}
            fileType={fileType}
            userId={userId}
            userName={userName}
            mode={mode}
          />
        )}
      </div>

      {isCommentsOpen ? (
        <aside className="file-viewer-workspace__comments">
          {discussionFileId ? (
            <CommentsPanel
              entityType="file"
              entityId={discussionFileId}
              fileId={discussionFileId}
              initialContext={effectiveInitialContext}
            />
          ) : (
            <div className="file-viewer-workspace__comments-unavailable">
              Комментарии недоступны: не передан ID файла.
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}

export {
  FILE_VIEWER_ACTIONS_RIGHT_BASE,
  FILE_VIEWER_COMMENTS_PANEL_WIDTH,
};
