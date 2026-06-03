import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  isTopOverlay,
  registerOverlay,
  unregisterOverlay,
} from "../../shared/overlay/overlayStack.js";

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
  suspendOverlayVisibility = false,
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
  const overlayIdRef = useRef(`object-card-modal-${Math.random().toString(36).slice(2, 10)}`);
  const showOverlay = Boolean(open && cardModel && !suspendOverlayVisibility);

  useEffect(() => {
    if (!showOverlay) {
      unregisterOverlay(overlayIdRef.current);
      return undefined;
    }

    registerOverlay(overlayIdRef.current);
    return () => {
      unregisterOverlay(overlayIdRef.current);
    };
  }, [showOverlay]);

  const handleOverlayMouseDown = (event) => {
    if (!isTopOverlay(overlayIdRef.current)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onClose?.();
  };

  useEffect(() => {
    if (!showOverlay) {
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
  }, [showOverlay, onClose]);

  if (!open || !cardModel || !showOverlay) {
    return null;
  }

  return createPortal(
    <div style={entityCardOverlayStyle} onMouseDown={handleOverlayMouseDown} role="presentation">
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
