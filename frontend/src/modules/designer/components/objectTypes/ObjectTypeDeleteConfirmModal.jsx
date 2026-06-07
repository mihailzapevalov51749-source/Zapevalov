import { PlatformModal } from "../../../../shared/platformModal";

export default function ObjectTypeDeleteConfirmModal({
  open,
  objectName,
  usageGroups = [],
  loading = false,
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  const hasUsage = usageGroups.some((group) => group.items?.length);

  const footer = (
    <div className="designer-object-type-delete-modal__footer">
      <button type="button" className="designer-btn" onClick={onClose} disabled={isSubmitting}>
        Отмена
      </button>
      <button
        type="button"
        className="designer-btn designer-btn--danger"
        onClick={onConfirm}
        disabled={isSubmitting || loading}
      >
        {isSubmitting ? "Удаление..." : "Удалить"}
      </button>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey="designer_object_type_delete_modal"
      onClose={onClose}
      title="Удалить объект"
      subtitle="Объект будет перемещён в корзину Studio."
      ariaLabel="Подтверждение удаления типа объекта"
      footer={footer}
      layoutPreset="compact"
      defaultBounds={{
        width: 520,
        height: hasUsage ? 420 : 320,
      }}
      contentStyle={{ padding: "16px 20px" }}
    >
      <div className="designer-object-type-delete-modal">
        <section className="designer-object-type-delete-modal__target" aria-label="Удаляемый объект">
          <h4 className="designer-object-type-delete-modal__section-title">Удаляемый объект</h4>
          <div className="designer-object-type-delete-modal__target-name">{objectName || "—"}</div>
        </section>

        {loading ? (
          <p className="designer-object-type-delete-modal__muted">Проверяем использование объекта…</p>
        ) : hasUsage ? (
          <section className="designer-object-type-delete-modal__usage" aria-label="Использование объекта">
            <h4 className="designer-object-type-delete-modal__section-title">Используется ли объект</h4>
            {usageGroups.map((group) =>
              group.items?.length ? (
                <div key={group.category} className="designer-object-type-delete-modal__usage-group">
                  <p className="designer-object-type-delete-modal__usage-label">{group.label}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={`${group.category}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </section>
        ) : (
          <p className="designer-object-type-delete-modal__muted">
            Объект нигде не используется. Его можно безопасно удалить.
          </p>
        )}
      </div>
    </PlatformModal>
  );
}
