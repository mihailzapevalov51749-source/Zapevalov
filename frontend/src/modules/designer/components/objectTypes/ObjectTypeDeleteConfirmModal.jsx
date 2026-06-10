import { PlatformModal } from "../../../../shared/platformModal";

function CountList({ counts = [] }) {
  if (!counts.length) {
    return (
      <p className="designer-object-type-delete-modal__muted">
        Дополнительных внутренних сущностей не найдено.
      </p>
    );
  }

  return (
    <ul className="designer-object-type-delete-modal__count-list">
      {counts.map((item) => (
        <li key={item.category}>
          {item.label}: {item.count}
        </li>
      ))}
    </ul>
  );
}

function ExternalWarnings({ warnings = [] }) {
  if (!warnings.length) {
    return null;
  }

  return (
    <section
      className="designer-object-type-delete-modal__external"
      aria-label="Внешние зависимости"
    >
      <h4 className="designer-object-type-delete-modal__section-title">Внимание</h4>
      <p className="designer-object-type-delete-modal__muted">
        Другие сущности используют этот объект. Удаление приведёт к разрыву ссылок.
      </p>
      {warnings.map((group) =>
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
  );
}

export default function ObjectTypeDeleteConfirmModal({
  open,
  objectName,
  internalCounts = [],
  externalWarnings = [],
  loading = false,
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  const hasExternalWarnings = externalWarnings.some((group) => group.items?.length);
  const canDelete = !loading;

  const footer = (
    <div className="designer-object-type-delete-modal__footer">
      <button type="button" className="designer-btn" onClick={onClose} disabled={isSubmitting}>
        Отмена
      </button>
      <button
        type="button"
        className="designer-btn designer-btn--danger"
        onClick={onConfirm}
        disabled={isSubmitting || !canDelete}
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
      title="Удалить объект?"
      subtitle="Объект будет перемещён в корзину Studio вместе со своим содержимым."
      ariaLabel="Подтверждение удаления типа объекта"
      footer={footer}
      layoutPreset="compact"
      defaultBounds={{
        width: 520,
        height: hasExternalWarnings ? 480 : 380,
      }}
      contentStyle={{ padding: "16px 20px" }}
    >
      <div className="designer-object-type-delete-modal">
        <section className="designer-object-type-delete-modal__target" aria-label="Удаляемый объект">
          <h4 className="designer-object-type-delete-modal__section-title">Удаляемый объект</h4>
          <div className="designer-object-type-delete-modal__target-name">{objectName || "—"}</div>
        </section>

        {loading ? (
          <p className="designer-object-type-delete-modal__muted">Собираем сведения об удалении…</p>
        ) : (
          <>
            <section className="designer-object-type-delete-modal__usage" aria-label="Будет удалено">
              <h4 className="designer-object-type-delete-modal__section-title">Будет удалено</h4>
              <CountList counts={internalCounts} />
            </section>
            <ExternalWarnings warnings={externalWarnings} />
          </>
        )}
      </div>
    </PlatformModal>
  );
}
