/**
 * Confirms view switch when session has unsaved query changes.
 */
export default function ObjectTableDirtyGuardModal({
  open = false,
  saving = false,
  onSave,
  onDiscard,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="object-view-dirty-guard-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4100,
        background: "rgba(15, 23, 42, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="object-view-dirty-guard-title"
          style={{ margin: "0 0 8px", fontSize: 16 }}
        >
          Есть несохранённые изменения
        </h3>
        <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
          Сохранить текущее представление перед переключением?
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            type="button"
            className="designer-btn"
            disabled={saving}
            onClick={onDiscard}
          >
            Не сохранять
          </button>
          <button
            type="button"
            className="designer-btn designer-btn--ghost"
            disabled={saving}
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
