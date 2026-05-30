import { createPortal } from "react-dom";

import { LAYOUT_MODES } from "../../layout/layoutModes";
import { resolveWorkspaceLeftOffset } from "../../layout/shellGeometry";
import { Z_INDEX_TOKENS } from "../../layout/zIndexTokens";
import FileViewerWorkspace from "./FileViewerWorkspace";
import { normalizeFileViewerId } from "./fileViewerDiscussionUtils";

const SIDEBAR_SETTINGS_KEY = "yasnopro-sidebar-collapsed";

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_SETTINGS_KEY) === "true";
  } catch {
    return false;
  }
}

const WORKSPACE_TOP_OFFSET = 0;

const getOverlayStyle = ({
  workspaceLeftOffset,
  workspaceTopOffset = WORKSPACE_TOP_OFFSET,
}) => ({
  position: "fixed",
  left: workspaceLeftOffset,
  top: workspaceTopOffset,
  right: 0,
  bottom: 0,
  zIndex: Z_INDEX_TOKENS.overlays.fileViewer,
  background: "#FFFFFF",
  overflow: "hidden",
});

export default function FileViewerModal({
  isOpen,
  fileUrl,
  fileName,
  fileType,
  fileId,
  userId,
  userName,
  mode = "view",
  initialContext = null,
  workspaceLeftOffset,
  workspaceTopOffset = WORKSPACE_TOP_OFFSET,
  onClose,
}) {
  const effectiveWorkspaceLeftOffset =
    workspaceLeftOffset !== undefined
      ? workspaceLeftOffset
      : resolveWorkspaceLeftOffset({
          mode: LAYOUT_MODES.RUNTIME,
          collapsed: readSidebarCollapsed(),
          explicitWorkspaceLeftOffset: 240,
        });

  const discussionFileId =
    normalizeFileViewerId(initialContext?.file_id) ||
    normalizeFileViewerId(initialContext?.fileId) ||
    normalizeFileViewerId(fileId) ||
    null;

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      style={getOverlayStyle({
        workspaceLeftOffset: effectiveWorkspaceLeftOffset,
        workspaceTopOffset,
      })}
    >
      <FileViewerWorkspace
        key={discussionFileId || fileUrl || "file-viewer"}
        fileUrl={fileUrl}
        fileName={fileName}
        fileType={fileType}
        fileId={fileId}
        userId={userId}
        userName={userName}
        mode={mode}
        initialContext={initialContext}
        onClose={onClose}
        showClose
      />
    </div>,
    document.body,
  );
}
