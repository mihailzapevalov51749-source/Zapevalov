import { Info, Pencil } from "lucide-react";

import closeIcon from "../../../../assets/icons/x.svg";
import { PlatformModal } from "../../../../shared/platformModal";

import "./objectTableDirtyGuardModal.css";
import {
  OFFICE_USER_VIEW_UNSAVED_CHANGES_DEFAULT_BOUNDS,
  OFFICE_USER_VIEW_UNSAVED_CHANGES_MODAL_KEY,
} from "./objectTableDirtyGuardModalKeys";
import {
  resolveDirtyGuardFooterActions,
  resolveDirtyGuardModalCopy,
} from "./objectTableDirtyGuardModalModel";

/**
 * Confirms view switch when session has unsaved changes (Office user views).
 */
export default function ObjectTableDirtyGuardModal({
  open = false,
  mode = "userView",
  viewName = "Представление",
  saving = false,
  onSave,
  onSaveAsNew,
  onDiscard,
  onCancel,
}) {
  const copy = resolveDirtyGuardModalCopy(mode, viewName);
  const footerActions = resolveDirtyGuardFooterActions(mode);

  const footer = (
    <div className="ot-dirty-guard-modal__footer">
      <div className="ot-dirty-guard-modal__footer-left">
        {footerActions.showDiscard ? (
          <button
            type="button"
            className="ot-dirty-guard-modal__btn ot-dirty-guard-modal__btn--secondary"
            disabled={saving}
            onClick={() => onDiscard?.()}
          >
            Не сохранять
          </button>
        ) : null}
      </div>

      <div className="ot-dirty-guard-modal__footer-center">
        {footerActions.showSaveAsNew ? (
          <button
            type="button"
            className="ot-dirty-guard-modal__btn ot-dirty-guard-modal__btn--outline"
            disabled={saving || typeof onSaveAsNew !== "function"}
            onClick={() => onSaveAsNew?.()}
          >
            Сохранить как новое
          </button>
        ) : null}
      </div>

      <div className="ot-dirty-guard-modal__footer-right">
        {footerActions.showSave ? (
          <button
            type="button"
            className="ot-dirty-guard-modal__btn ot-dirty-guard-modal__btn--primary"
            disabled={saving}
            onClick={() => onSave?.()}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey={OFFICE_USER_VIEW_UNSAVED_CHANGES_MODAL_KEY}
      onClose={onCancel}
      hideHeader
      canCustomizeLayout
      keepFullyVisible
      viewportInset={24}
      defaultBounds={OFFICE_USER_VIEW_UNSAVED_CHANGES_DEFAULT_BOUNDS}
      ariaLabel={copy.title}
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
        <div className="ot-dirty-guard-modal">
          <header
            className="ot-dirty-guard-modal__header"
            style={{ cursor: headerCursor }}
            onMouseDown={startDrag}
            data-platform-modal-drag-handle
          >
            <div className="ot-dirty-guard-modal__icon-wrap" aria-hidden="true">
              <Pencil size={22} strokeWidth={2.2} />
            </div>

            <div className="ot-dirty-guard-modal__title-wrap">
              <h2 className="ot-dirty-guard-modal__title">{copy.title}</h2>
            </div>

            <button
              type="button"
              className="ot-dirty-guard-modal__close-btn"
              aria-label="Закрыть"
              disabled={saving}
              onClick={() => onCancel?.()}
              onMouseDown={(event) => event.stopPropagation()}
              data-platform-modal-no-drag
            >
              <img src={closeIcon} alt="" width={16} height={16} draggable={false} />
            </button>
          </header>

          <div className="ot-dirty-guard-modal__divider" aria-hidden="true" />

          <div className="ot-dirty-guard-modal__body">
            <p className="ot-dirty-guard-modal__message">
              {copy.messageLine1}
              <br />
              {copy.messageLine2}
            </p>

            <p className="ot-dirty-guard-modal__hint">
              <Info
                size={16}
                strokeWidth={2}
                className="ot-dirty-guard-modal__hint-icon"
                aria-hidden="true"
              />
              <span>{copy.hint}</span>
            </p>
          </div>
        </div>
      )}
    </PlatformModal>
  );
}
