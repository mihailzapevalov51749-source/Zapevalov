import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  entityCardModalStyle,
  entityCardOverlayStyle,
} from "./styles/entityCardModalStyles";

export default function EntityCardModal({
  open = false,
  onClose,
  children,
  ariaLabelledby,
  overlayStyle = null,
  modalStyle = null,
}) {
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

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      style={{
        ...entityCardOverlayStyle,
        ...(overlayStyle || {}),
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          ...entityCardModalStyle,
          ...(modalStyle || {}),
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
