import { PlatformModal } from "../../../../shared/platformModal";

export const DESIGNER_PAGES_BULK_DELETE_CONFIRM_MODAL_KEY =
  "designer-pages-bulk-delete-confirm-modal";

const DEFAULT_BOUNDS = {
  width: 560,
  height: 300,
};

export default function BulkDeletePagesConfirmModal({
  open,
  deletableCount = 0,
  protectedCount = 0,
  isSubmitting,
  onCancel,
  onConfirm,
}) {
  const hasProtected = protectedCount > 0;

  const footer = (
    <div
      className="designer-pages-bulk-delete-modal__footer"
      data-platform-modal-no-drag
    >
      <button
        type="button"
        className="designer-btn"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Отмена
      </button>
      <button
        type="button"
        className="designer-btn designer-btn--danger"
        onClick={onConfirm}
        disabled={isSubmitting || deletableCount <= 0}
      >
        {isSubmitting ? "Удаление…" : "Удалить"}
      </button>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey={DESIGNER_PAGES_BULK_DELETE_CONFIRM_MODAL_KEY}
      onClose={onCancel}
      title="Удалить выбранные страницы?"
      canCustomizeLayout
      keepFullyVisible
      viewportInset={24}
      layoutPreset="compact"
      defaultBounds={DEFAULT_BOUNDS}
      ariaLabel="Подтверждение массового удаления страниц"
      footer={footer}
      contentStyle={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        padding: "16px 20px",
        boxSizing: "border-box",
      }}
    >
      <div className="designer-pages-bulk-delete-modal__body">
        <p className="designer-pages-bulk-delete-modal__text">
          Выбранные страницы будут перемещены в корзину. Восстановить их можно будет
          до окончательного удаления.
        </p>

        {hasProtected ? (
          <p className="designer-pages-bulk-delete-modal__note">
            <span className="designer-pages-bulk-delete-modal__note-label">Примечание:</span>{" "}
            системные страницы будут пропущены автоматически.
          </p>
        ) : null}

        <ul className="designer-pages-bulk-delete-modal__summary" aria-label="Итоги удаления">
          <li>Будет удалено: {deletableCount}</li>
          {hasProtected ? <li>Будет пропущено: {protectedCount}</li> : null}
        </ul>
      </div>
    </PlatformModal>
  );
}
