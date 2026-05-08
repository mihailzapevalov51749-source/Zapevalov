export default function DeleteFolderModal({
  folder,
  isDeleting,
  onDeleteWithChildren,
  onDeleteOnlyFolder,
  onClose,
  styles,
}) {
  const {
    modalOverlay,
    modalCard,
    modalTitle,
    modalText,
    modalActions,
    dangerButton,
    secondaryButton,
    ghostButton,
  } = styles;

  if (!folder) return null;

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={modalTitle}>Удаление папки</h3>

        <div style={modalText}>
          Папка <strong>{folder.title}</strong> может содержать документы и
          вложенные папки. Выберите действие.
        </div>

        <div style={modalActions}>
          <button
            type="button"
            onClick={onDeleteWithChildren}
            disabled={isDeleting}
            style={{
              ...dangerButton,
              opacity: isDeleting ? 0.55 : 1,
            }}
          >
            Удалить вместе с содержимым
          </button>

          <button
            type="button"
            onClick={onDeleteOnlyFolder}
            disabled={isDeleting}
            style={{
              ...secondaryButton,
              opacity: isDeleting ? 0.55 : 1,
            }}
          >
            Удалить только папку
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              ...ghostButton,
              opacity: isDeleting ? 0.55 : 1,
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}