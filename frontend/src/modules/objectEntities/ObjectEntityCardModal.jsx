import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  entityCardModalStyle,
  entityCardOverlayStyle,
} from "../../shared/entityCardShell/styles/entityCardModalUtStyles";

import ObjectEntityCardView from "./ObjectEntityCardView";

function normalizeInitialContext(initialContext) {
  if (!initialContext) {
    return null;
  }

  const type = String(initialContext?.type || "").trim();
  const tab =
    initialContext?.tab ||
    (type === "card_note"
      ? "notes"
      : type === "card_attachment_file"
        ? "attachments"
        : "comments");

  return {
    ...initialContext,
    tab,
  };
}

/**
 * Runtime object instance card — UT modal shell (entityCard/styles).
 */
export default function ObjectEntityCardModal({
  open = false,
  mode = "edit",
  cardModel = null,
  formValues = {},
  fieldErrors = {},
  onFieldChange,
  onClose,
  onSave,
  submitting = false,
  submitError = "",
  initialContext = null,
  catalog = null,
  onEntityUpdated = null,
  cardLayout = null,
  canConfigureCard = false,
  onSaveCardLayout = null,
  cardSettingsSaving = false,
  onOpenRelatedEntity = null,
}) {
  const normalizedContext = normalizeInitialContext(initialContext);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !cardModel) {
    return null;
  }

  return createPortal(
    <div style={entityCardOverlayStyle} onMouseDown={onClose} role="presentation">
      <div
        style={entityCardModalStyle}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="object-entity-card-title"
      >
        <ObjectEntityCardView
          mode={mode}
          cardModel={cardModel}
          formValues={formValues}
          fieldErrors={fieldErrors}
          onFieldChange={onFieldChange}
          onClose={onClose}
          onSave={onSave}
          submitting={submitting}
          submitError={submitError}
          initialContext={normalizedContext}
          catalog={catalog}
          onEntityUpdated={onEntityUpdated}
          cardLayout={cardLayout}
          canConfigureCard={canConfigureCard}
          onSaveCardLayout={onSaveCardLayout}
          cardSettingsSaving={cardSettingsSaving}
          onOpenRelatedEntity={onOpenRelatedEntity}
        />
      </div>
    </div>,
    document.body,
  );
}
