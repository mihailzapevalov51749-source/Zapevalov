import { Trash2 } from "lucide-react";

import closeIcon from "../../../../assets/icons/x.svg";
import { PlatformModal } from "../../../../shared/platformModal";

import "./objectEntityDeleteModal.css";

/**
 * Shared Platform Modal shell for entity delete dialogs.
 */
export default function ObjectEntityDeleteModalBase({
  open = false,
  modalKey,
  defaultBounds,
  ariaLabel = "Удаление записи",
  title = "Удаление записи",
  subtitle = "",
  deleting = false,
  onCancel,
  footer = null,
  bodyClassName = "",
  children,
}) {
  return (
    <PlatformModal
      open={open}
      modalKey={modalKey}
      onClose={onCancel}
      hideHeader
      canCustomizeLayout
      keepFullyVisible
      viewportInset={24}
      layoutPreset="compact"
      defaultBounds={defaultBounds}
      ariaLabel={ariaLabel}
      footer={footer}
      contentStyle={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {({ startDrag, headerCursor }) => (
        <div className="ot-entity-delete-modal ot-entity-delete-modal--unified">
          <header
            className="ot-entity-delete-modal__shell-header"
            style={{ cursor: headerCursor }}
            onMouseDown={startDrag}
            data-platform-modal-drag-handle
          >
            <div className="ot-entity-delete-modal__icon-wrap" aria-hidden="true">
              <Trash2 size={20} strokeWidth={2.2} />
            </div>

            <div className="ot-entity-delete-modal__header-text">
              <h2 className="ot-entity-delete-modal__shell-title">{title}</h2>
              {subtitle ? (
                <p className="ot-entity-delete-modal__subtitle">{subtitle}</p>
              ) : null}
            </div>

            <button
              type="button"
              className="ot-entity-delete-modal__close-btn"
              aria-label="Закрыть"
              disabled={deleting}
              onClick={() => onCancel?.()}
              onMouseDown={(event) => event.stopPropagation()}
              data-platform-modal-no-drag
            >
              <img src={closeIcon} alt="" width={16} height={16} draggable={false} />
            </button>
          </header>

          <div className={`ot-entity-delete-modal__shell-body ${bodyClassName}`.trim()}>
            {children}
          </div>
        </div>
      )}
    </PlatformModal>
  );
}

export function ObjectEntityDeleteRecordInfo({
  label = "Удаляемая запись",
  value = "",
}) {
  const normalizedLabel = String(label || "").trim();

  return (
    <div className="ot-entity-delete-modal__info-block">
      {normalizedLabel ? (
        <p className="ot-entity-delete-modal__info-block-label">{normalizedLabel}</p>
      ) : null}
      <p className="ot-entity-delete-modal__info-block-value">{value || "—"}</p>
    </div>
  );
}

export function ObjectEntityDeleteInfoBadge({ children }) {
  return <div className="ot-entity-delete-modal__info-badge">{children}</div>;
}

export function ObjectEntityDeleteBulkBadges({ badges = [] }) {
  const items = Array.isArray(badges) ? badges : [];

  if (!items.length) {
    return null;
  }

  return (
    <div className="ot-entity-delete-modal__bulk-badges">
      {items.map((badge) => (
        <ObjectEntityDeleteInfoBadge key={badge.label}>
          {badge.label}: <strong>{badge.value}</strong>
        </ObjectEntityDeleteInfoBadge>
      ))}
    </div>
  );
}

export function ObjectEntityDeleteModalFooterShell({ children }) {
  return <div className="ot-entity-delete-modal__footer-shell">{children}</div>;
}

export function ObjectEntityDeleteModalFooterActions({
  deleting = false,
  deleteDisabled = false,
  onCancel,
  onConfirm,
  confirmLabel = "Удалить",
}) {
  return (
    <div className="ot-entity-delete-modal__footer-actions">
      <button
        type="button"
        className="ot-entity-delete-modal__btn ot-entity-delete-modal__btn--secondary ot-entity-delete-modal__btn-cancel"
        disabled={deleting}
        onClick={() => onCancel?.()}
      >
        Отмена
      </button>

      <button
        type="button"
        className="ot-entity-delete-modal__btn ot-entity-delete-modal__btn--danger ot-entity-delete-modal__btn-delete"
        disabled={deleting || deleteDisabled}
        onClick={() => onConfirm?.()}
      >
        {deleting ? "Удаление…" : confirmLabel}
      </button>
    </div>
  );
}
