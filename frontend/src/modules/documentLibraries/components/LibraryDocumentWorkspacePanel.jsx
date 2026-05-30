import FileViewer from "../../../shared/files/components/FileViewer";

import * as styles from "./libraryStyles";

export default function LibraryDocumentWorkspacePanel({
  fileName,
  fileUrl,
  fileType,
  onClose,
}) {
  if (!fileUrl) {
    return null;
  }

  return (
    <div style={styles.workspaceViewerPanel}>
      <div style={styles.workspaceViewerHeader}>
        <div style={styles.workspaceViewerTitle} title={fileName}>
          {fileName}
        </div>
        <button
          type="button"
          style={styles.workspaceViewerClose}
          onClick={onClose}
          aria-label="Закрыть документ"
        >
          ×
        </button>
      </div>

      <div style={styles.workspaceViewerBody}>
        <FileViewer
          fileUrl={fileUrl}
          fileName={fileName}
          fileType={fileType}
          userId="1"
          userName="Михаил"
          mode="view"
        />
      </div>
    </div>
  );
}
