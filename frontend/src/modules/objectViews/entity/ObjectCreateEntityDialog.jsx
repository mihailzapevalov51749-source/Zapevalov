import FieldEditor from "../../../shared/fieldEditors/FieldEditor";

/**
 * Create runtime entity (object instance) — not a table row.
 */
export default function ObjectCreateEntityDialog({
  open = false,
  onClose,
  onSubmit,
  fields = [],
  formValues = {},
  onFieldChange,
  fieldErrors = {},
  submitting = false,
  submitError = "",
  objectTypeLabel = "",
}) {
  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    await onSubmit?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="object-create-entity-title"
      className="object-create-entity-dialog__overlay"
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
      onClick={onClose}
    >
      <form
        className="object-create-entity-dialog__panel"
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          maxWidth: 520,
          width: "100%",
          maxHeight: "min(90vh, 720px)",
          overflow: "auto",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
        }}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3
          id="object-create-entity-title"
          style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}
        >
          Новый объект
        </h3>

        {objectTypeLabel ? (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
            {objectTypeLabel}
          </p>
        ) : (
          <div style={{ marginBottom: 16 }} />
        )}

        {fields.length === 0 ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Нет полей для создания. Опубликуйте каталог с поддерживаемыми типами
            полей.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fields.map((field, index) => (
              <label key={field.key} style={{ display: "block" }}>
                <span
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  {field.label}
                  {field.isRequired ? (
                    <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>
                  ) : null}
                </span>

                <FieldEditor
                  fieldDef={field}
                  value={formValues[field.key]}
                  onChange={(nextValue) => onFieldChange?.(field.key, nextValue)}
                  readOnly={submitting}
                  autoFocus={index === 0}
                />

                {fieldErrors[field.key] ? (
                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 12,
                      color: "#dc2626",
                    }}
                  >
                    {fieldErrors[field.key]}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        )}

        {submitError ? (
          <div className="designer-error" style={{ marginTop: 12 }}>
            {submitError}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <button
            type="button"
            className="designer-btn designer-btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="designer-btn designer-btn--primary"
            disabled={submitting || fields.length === 0}
          >
            {submitting ? "Создание…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
