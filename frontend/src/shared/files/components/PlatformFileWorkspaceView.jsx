import { useMemo } from "react";

import FileViewerWorkspace from "./FileViewerWorkspace";

import "../../../modules/documentLibraries/components/documentWorkspaceView.css";

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
 * Embedded file viewer shell — same layout contract as DocumentWorkspaceView.
 */
export default function PlatformFileWorkspaceView({
  fileUrl,
  fileName,
  fileType,
  fileId,
  initialContext = null,
  userId = null,
  userName = null,
  mode = "view",
  onClose,
}) {
  const defaultUser = useMemo(() => readCurrentUser(), []);

  const rootClassName =
    "document-workspace-view document-workspace-view--full-bleed";

  if (!fileUrl && !fileId) {
    return (
      <div className={rootClassName}>
        <div className="document-workspace-view__body">
          <div className="document-workspace-view__state is-error">
            Не удалось открыть файл для просмотра
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <div className="document-workspace-view__body">
        <FileViewerWorkspace
          fileUrl={fileUrl}
          fileName={fileName}
          fileType={fileType}
          fileId={fileId}
          initialContext={initialContext}
          userId={userId || defaultUser.userId}
          userName={userName || defaultUser.userName}
          mode={mode}
          onClose={onClose}
          showClose={typeof onClose === "function"}
        />
      </div>
    </div>
  );
}
