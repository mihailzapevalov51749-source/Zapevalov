import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import "../../viewEngine/viewEngineTable.css";

/**
 * Object-level dropdown menu (not view/tab/table scoped).
 */
export default function ObjectContextMenu({
  open = false,
  anchorRef,
  onClose,
  actions = [],
  onSelectAction,
}) {
  const menuRef = useRef(null);
  const menuActions = (Array.isArray(actions) ? actions : []).filter(
    (action) => action && !action.disabled,
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      const inMenu = menuRef.current?.contains(event.target);
      const inAnchor = anchorRef?.current?.contains(event.target);

      if (!inMenu && !inAnchor) {
        onClose?.();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined" || !menuActions.length) {
    return null;
  }

  const rect = anchorRef?.current?.getBoundingClientRect?.();
  const top = rect ? rect.bottom + 6 : 48;
  const left = rect ? Math.max(8, rect.left) : 8;

  const handleSelect = (actionId) => {
    onSelectAction?.(actionId);
    onClose?.();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="view-engine-toolbar__portal-menu object-context-menu"
      data-object-context-menu="true"
      role="menu"
      aria-label="Меню объекта"
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 10050,
        minWidth: 220,
      }}
    >
      <div className="view-engine-toolbar__portal-menu-section">
        {menuActions.map((action) => {
          const actionId = String(action.id || "").trim();
          const tone = String(action.tone || "default").trim();

          return (
            <button
              key={actionId}
              type="button"
              role="menuitem"
              className={`view-engine-toolbar__portal-menu-item${
                tone === "danger" ? " view-engine-toolbar__portal-menu-item--danger" : ""
              }`}
              onClick={() => handleSelect(actionId)}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
