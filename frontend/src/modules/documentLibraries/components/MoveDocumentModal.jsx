import { useEffect, useMemo, useState } from "react";

export default function MoveDocumentModal({
  isOpen,
  document,
  folders = [],
  currentParentId = null,
  isMoving = false,
  onClose,
  onMove,
}) {
  const [targetParentId, setTargetParentId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTargetParentId("");
    }
  }, [isOpen, document?.id]);

  const availableFolders = useMemo(() => {
    if (!document) return [];

    return folders.filter((folder) => {
      if (!folder.is_folder) return false;
      if (folder.id === document.id) return false;

      return true;
    });
  }, [folders, document]);

  if (!isOpen || !document) return null;

  const normalizedTargetParentId =
    targetParentId === "" ? null : Number(targetParentId);

  const isSameFolder = normalizedTargetParentId === currentParentId;

  const handleMove = async () => {
    if (isSameFolder || isMoving) return;

    await onMove?.(document, normalizedTargetParentId);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 420,
          background: "#ffffff",
          borderRadius: 12,
          padding: 18,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Переместить
          </h3>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#6b7280",
              wordBreak: "break-word",
            }}
          >
            {document.title}
          </div>
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 13,
            color: "#374151",
          }}
        >
          Папка назначения

          <select
            value={targetParentId}
            onChange={(event) => setTargetParentId(event.target.value)}
            disabled={isMoving}
            style={{
              height: 38,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              padding: "0 10px",
              fontSize: 14,
              background: "#ffffff",
              color: "#111827",
              outline: "none",
            }}
          >
            <option value="">Корень библиотеки</option>

            {availableFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.title}
              </option>
            ))}
          </select>
        </label>

        {isSameFolder && (
          <div
            style={{
              fontSize: 12,
              color: "#92400e",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            Документ уже находится в выбранной папке.
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isMoving}
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              cursor: isMoving ? "not-allowed" : "pointer",
            }}
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleMove}
            disabled={isSameFolder || isMoving}
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              cursor: isSameFolder || isMoving ? "not-allowed" : "pointer",
              opacity: isSameFolder || isMoving ? 0.55 : 1,
            }}
          >
            {isMoving ? "Перемещение..." : "Переместить"}
          </button>
        </div>
      </div>
    </div>
  );
}