import { useEffect, useMemo, useState } from "react";

import { LAYOUT_MODES } from "../../layout/layoutModes";
import { resolveWorkspaceLeftOffset } from "../../layout/shellGeometry";
import {
  CLOSE_FILE_VIEWER_EVENT,
  OPEN_FILE_VIEWER_EVENT,
  normalizeOpenFileViewerPayload,
} from "../openFileViewer";
import { FILE_VIEWER_PRESENTATION_WORKSPACE } from "../resolveFileViewerPresentation";
import FileViewerModal from "./FileViewerModal";

function readCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");

    if (!raw) {
      return { userId: "1", userName: "Пользователь" };
    }

    const user = JSON.parse(raw);

    return {
      userId: String(user?.id ?? user?.user_id ?? "1"),
      userName: String(
        user?.full_name ||
          user?.fullName ||
          user?.name ||
          user?.username ||
          "Пользователь",
      ),
    };
  } catch {
    return { userId: "1", userName: "Пользователь" };
  }
}

/**
 * Platform-level host: renders FileViewerWorkspace in the runtime work area
 * (sidebar-aware), driven by openFileViewer().
 */
export default function FileViewerOverlayHost({
  workspaceLeftOffset,
  workspaceTopOffset = 0,
}) {
  const [session, setSession] = useState(null);
  const defaultUser = useMemo(() => readCurrentUser(), []);

  const effectiveWorkspaceLeftOffset = useMemo(() => {
    if (workspaceLeftOffset !== undefined && workspaceLeftOffset !== null) {
      return workspaceLeftOffset;
    }

    let collapsed = false;

    try {
      collapsed = localStorage.getItem("yasnopro-sidebar-collapsed") === "true";
    } catch {
      collapsed = false;
    }

    return resolveWorkspaceLeftOffset({
      mode: LAYOUT_MODES.RUNTIME,
      collapsed,
      explicitWorkspaceLeftOffset: 240,
    });
  }, [workspaceLeftOffset]);

  useEffect(() => {
    function handleOpen(event) {
      const normalized = normalizeOpenFileViewerPayload(event.detail || {});

      if (normalized.presentation === FILE_VIEWER_PRESENTATION_WORKSPACE) {
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
  }, []);

  if (!session?.fileUrl && !session?.fileId) {
    return null;
  }

  return (
    <FileViewerModal
      isOpen
      fileUrl={session.fileUrl}
      fileName={session.fileName}
      fileType={session.fileType}
      fileId={session.fileId}
      initialContext={session.initialContext}
      userId={session.userId || defaultUser.userId}
      userName={session.userName || defaultUser.userName}
      mode={session.mode || "view"}
      workspaceLeftOffset={effectiveWorkspaceLeftOffset}
      workspaceTopOffset={workspaceTopOffset}
      onClose={() => {
        setSession(null);
        window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
      }}
    />
  );
}
