export default function DocumentActionsMenu({
  document,
  isFolder,
  onOpenFolder,
  onRename,
  onDelete,
  onMove,
  getFileUrl,
  styles,
}) {
  const { menu, menuItem, menuButton } = styles;

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
          <a
            href={getFileUrl(document)}
            target="_blank"
            rel="noreferrer"
            style={menuItem}
          >
            Открыть
          </a>

          <a href={getFileUrl(document)} download style={menuItem}>
            Скачать
          </a>
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