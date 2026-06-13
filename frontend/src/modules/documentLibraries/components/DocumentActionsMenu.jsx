import {
  buildWorkspacePreviewPayload,
  downloadLibraryDocument,
} from "../services/documentLibrariesService";

export default function DocumentActionsMenu({
  document,
  isFolder,
  tenantId,
  onOpenFolder,
  onRename,
  onDelete,
  onMove,
  onPreviewFile,
  styles,
}) {
  const { menu, menuItem, menuButton } = styles;

  const handleOpenFile = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const payload = await buildWorkspacePreviewPayload(document, tenantId);
      if (!payload) {
        return;
      }

      onPreviewFile?.(payload);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownload = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await downloadLibraryDocument(document, tenantId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={menu}>
      {isFolder ? (
        <button
          type="button"
          style={menuButton}
          onClick={() => onOpenFolder(document)}
        >
          Открыть
        </button>
      ) : (
        <>
          <button type="button" style={menuItem} onClick={handleOpenFile}>
            Открыть
          </button>

          <button type="button" style={menuItem} onClick={handleDownload}>
            Скачать
          </button>
        </>
      )}

      <button
        type="button"
        style={menuButton}
        onClick={() => onRename(document)}
      >
        Переименовать
      </button>

      <button
        type="button"
        style={menuButton}
        onClick={() => onMove(document)}
      >
        Переместить
      </button>

      <button
        type="button"
        style={{
          ...menuButton,
          color: "#dc2626",
        }}
        onClick={() => onDelete(document)}
      >
        Удалить
      </button>
    </div>
  );
}
