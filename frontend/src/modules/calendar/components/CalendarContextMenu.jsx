import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import "../../../shared/viewEngine/viewEngineTable.css";
import { Z_INDEX_TOKENS } from "../../../shared/layout/zIndexTokens";
import {
  clampMenuPosition,
  CONTEXT_MENU_ITEM_HEIGHT,
  EVENT_CONTEXT_MENU_ACTIONS,
  SLOT_CONTEXT_MENU_ACTIONS,
} from "../utils/calendarContextMenu";

export default function CalendarContextMenu({ state, onClose, onSelectAction }) {
  const menuRef = useRef(null);
  const openedAtRef = useRef(0);

  const isOpen = Boolean(state?.open);
  const actions =
    state?.mode === "event" ? EVENT_CONTEXT_MENU_ACTIONS : SLOT_CONTEXT_MENU_ACTIONS;
  const menuHeight = actions.length * CONTEXT_MENU_ITEM_HEIGHT + 12;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    openedAtRef.current = Date.now();

    const handleMouseDown = (event) => {
      if (Date.now() - openedAtRef.current < 120) {
        return;
      }

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

    const handleContextMenu = (event) => {
      if (menuRef.current?.contains(event.target)) {
        return;
      }

      onClose?.();
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const position = clampMenuPosition(state.x, state.y, 220, menuHeight);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={state.mode === "event" ? "Меню события" : "Меню календаря"}
      className="view-engine-toolbar__portal-menu object-context-menu"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: Z_INDEX_TOKENS.popovers.default,
        minWidth: 220,
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="view-engine-toolbar__portal-menu-section">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            className={`view-engine-toolbar__portal-menu-item${
              action.tone === "danger" ? " view-engine-toolbar__portal-menu-item--danger" : ""
            }`}
            onClick={() => {
              onSelectAction?.(action.id, state);
              onClose?.();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
