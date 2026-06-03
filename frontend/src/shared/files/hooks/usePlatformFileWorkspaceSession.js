import { useCallback, useEffect, useState } from "react";

import {
  CLOSE_FILE_VIEWER_EVENT,
  OPEN_FILE_VIEWER_EVENT,
  REOPEN_OBJECT_ENTITY_CARD_EVENT,
  closeFileViewer,
  normalizeOpenFileViewerPayload,
} from "../openFileViewer";
import {
  FILE_VIEWER_PRESENTATION_WORKSPACE,
  resolveFileViewerPresentation,
} from "../resolveFileViewerPresentation";

/**
 * Subscribes to openFileViewer() and keeps workspace-embedded file sessions.
 *
 * @param {{ enabled?: boolean }} [options]
 */
export default function usePlatformFileWorkspaceSession({ enabled = true } = {}) {
  const [session, setSession] = useState(null);

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleOpen(event) {
      const normalized = normalizeOpenFileViewerPayload(event.detail || {});

      if (resolveFileViewerPresentation(normalized) !== FILE_VIEWER_PRESENTATION_WORKSPACE) {
        return;
      }

      setSession(normalized);
    }

    function handleClose() {
      setSession(null);
    }

    window.addEventListener(OPEN_FILE_VIEWER_EVENT, handleOpen);
    window.addEventListener(CLOSE_FILE_VIEWER_EVENT, handleClose);

    return () => {
      window.removeEventListener(OPEN_FILE_VIEWER_EVENT, handleOpen);
      window.removeEventListener(CLOSE_FILE_VIEWER_EVENT, handleClose);
    };
  }, [enabled]);

  const closeWorkspaceFile = useCallback(() => {
    const returnContext = session?.returnContext;

    clearSession();

    if (
      returnContext &&
      String(returnContext.type || "") === "object_entity_card"
    ) {
      window.dispatchEvent(
        new CustomEvent(REOPEN_OBJECT_ENTITY_CARD_EVENT, {
          detail: returnContext,
        }),
      );
    }

    closeFileViewer();
  }, [session, clearSession]);

  return {
    session,
    clearSession,
    closeWorkspaceFile,
    isWorkspaceFileOpen: Boolean(session?.fileUrl || session?.fileId),
  };
}
