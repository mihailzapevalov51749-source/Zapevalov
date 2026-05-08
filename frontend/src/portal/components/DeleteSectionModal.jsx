export default function DeleteSectionModal({
  isOpen,
  section,
  blocksCount = 0,
  isDeleting = false,
  onClose,
  onDeleteEmpty,
  onDeleteWithBlocks,
  onConfirmDeleteEmpty,
  onConfirmDeleteWithBlocks,
}) {
  if (!isOpen || !section) return null;

  const hasBlocks = blocksCount > 0;

  const handleDeleteEmpty = onDeleteEmpty || onConfirmDeleteEmpty;
  const handleDeleteWithBlocks =
    onDeleteWithBlocks || onConfirmDeleteWithBlocks;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 440,
          background: "#ffffff",
          borderRadius: 14,
          padding: 22,
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
          boxSizing: "border-box",
        }}
      >
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: 18,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Удаление раздела
        </h3>

        <p
          style={{
            margin: "0 0 18px",
            fontSize: 14,
            lineHeight: 1.5,
            color: "#475569",
          }}
        >
          {hasBlocks
            ? `В разделе "${section.title || "Раздел"}" есть блоки: ${blocksCount}. Удалить раздел вместе с блоками?`
            : `Удалить раздел "${section.title || "Раздел"}"?`}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
              cursor: isDeleting ? "default" : "pointer",
            }}
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={hasBlocks ? handleDeleteWithBlocks : handleDeleteEmpty}
            disabled={isDeleting}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 8,
              border: "1px solid #dc2626",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              cursor: isDeleting ? "default" : "pointer",
            }}
          >
            {isDeleting
              ? "Удаление..."
              : hasBlocks
              ? "Удалить с блоками"
              : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}