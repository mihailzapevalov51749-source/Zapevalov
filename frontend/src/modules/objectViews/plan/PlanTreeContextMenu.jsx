import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { clampMenuPosition } from "../../../portal/utils/pageCanvasContextMenuUtils.js";

import "../../../shared/viewEngine/viewEngineTable.css";

/**
 * @typedef {Object} PlanTreeContextMenuAction
 * @property {string} id
 * @property {string} label
 * @property {"default" | "danger"} [tone]
 * @property {boolean} [disabled]
 */

export default function PlanTreeContextMenu({
  open = false,
  position = null,
  actions = [],
  onSelectAction,
  onClose,
}) {
  const menuRef = useRef(null);
  const menuActions = (Array.isArray(actions) ? actions : []).filter(Boolean);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      if (menuRef.current?.contains(event.target)) {
        return;
      }

      onClose?.();
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
  }, [open, onClose]);

  if (!open || typeof document === "undefined" || !menuActions.length || !position) {
    return null;
  }

  const menuWidth = 240;
  const menuHeight = menuActions.length * 36 + 16;
  const clamped = clampMenuPosition(position.x, position.y, menuWidth, menuHeight);

  return createPortal(
    <div
      ref={menuRef}
      className="view-engine-toolbar__portal-menu object-context-menu object-plan-view__tree-context-menu"
      role="menu"
      aria-label="Меню записи плана"
      style={{
        position: "fixed",
        top: clamped.y,
        left: clamped.x,
        zIndex: 10050,
        minWidth: menuWidth,
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
              disabled={Boolean(action.disabled)}
              className={`view-engine-toolbar__portal-menu-item${
                tone === "danger" ? " view-engine-toolbar__portal-menu-item--danger" : ""
              }`}
              onClick={() => {
                if (action.disabled) {
                  return;
                }

                onSelectAction?.(actionId);
                onClose?.();
              }}
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
