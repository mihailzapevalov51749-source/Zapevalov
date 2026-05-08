export default function MenuEditPanel({
  isEditMode,
  isSaving,
  onEnterEditMode,
  onExitEditMode,
  width = 260,
}) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        bottom: 0,
        width,
        height: 48,
        borderTop: "1px solid #e2e8f0",
        borderRight: "1px solid #e2e8f0",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        zIndex: 50,
      }}
    >
      {!isEditMode ? (
        <button
          type="button"
          onClick={onEnterEditMode}
          disabled={isSaving}
          style={{
            fontSize: 12,
            color: "#94a3b8",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Редактировать
        </button>
      ) : (
        <button
          type="button"
          onClick={onExitEditMode}
          disabled={isSaving}
          style={{
            fontSize: 12,
            color: "#64748b",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {isSaving ? "Сохранение..." : "Готово"}
        </button>
      )}
    </div>
  );
}