export default function ObjectTableBulkActionsBar({
  selectedCount = 0,
  onClearSelection,
  onDelete,
  deleting = false,
}) {
  if (!Number(selectedCount)) {
    return null;
  }

  const handleDeleteClick = () => {
    if (deleting || typeof onDelete !== "function") {
      return;
    }

    onDelete();
  };

  return (
    <div className="view-engine-hosted-table__bulk-actions" role="status" aria-live="polite">
      <span className="view-engine-hosted-table__bulk-actions-count">
        Выбрано: <strong>{selectedCount}</strong>
      </span>

      <button
        type="button"
        className="designer-btn designer-btn--ghost"
        onClick={onClearSelection}
        disabled={deleting}
      >
        Снять выделение
      </button>

      <button
        type="button"
        className="designer-btn view-engine-hosted-table__bulk-actions-delete"
        disabled={deleting || typeof onDelete !== "function"}
        onClick={handleDeleteClick}
      >
        {deleting ? "Удаление…" : "Удалить"}
      </button>
    </div>
  );
}
