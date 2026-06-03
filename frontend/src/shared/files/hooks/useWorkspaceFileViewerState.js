import { useCallback, useEffect, useState } from "react";

import {
  CLOSE_FILE_VIEWER_EVENT,
  OPEN_FILE_VIEWER_EVENT,
  normalizeOpenFileViewerPayload,
} from "../openFileViewer";
import {
  FILE_VIEWER_PRESENTATION_WORKSPACE,
  resolveFileViewerPresentation,
} from "../resolveFileViewerPresentation";

/**
 * Subscribes to workspace file viewer open/close (object attachment route).
 */
export default function useWorkspaceFileViewerState() {
  const [isWorkspaceFileOpen, setIsWorkspaceFileOpen] = useState(false);
  const [returnContext, setReturnContext] = useState(null);

  const clearState = useCallback(() => {
    setIsWorkspaceFileOpen(false);
    setReturnContext(null);
  }, []);

  useEffect(() => {
    function handleOpen(event) {
      const normalized = normalizeOpenFileViewerPayload(event.detail || {});

      if (resolveFileViewerPresentation(normalized) !== FILE_VIEWER_PRESENTATION_WORKSPACE) {
        return;
      }

      setReturnContext(normalized.returnContext || null);
      setIsWorkspaceFileOpen(true);
    }

    function handleClose() {
      clearState();
    }

    window.addEventListener(OPEN_FILE_VIEWER_EVENT, handleOpen);
    window.addEventListener(CLOSE_FILE_VIEWER_EVENT, handleClose);

    return () => {
      window.removeEventListener(OPEN_FILE_VIEWER_EVENT, handleOpen);
      window.removeEventListener(CLOSE_FILE_VIEWER_EVENT, handleClose);
    };
  }, [clearState]);

  return {
    isWorkspaceFileOpen,
    returnContext,
    clearState,
  };
}
