import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 190;
const MENU_PADDING = 8;
const MENU_GAP = 6;

const menuItemStyle = {
  width: "100%",
  padding: "8px 9px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#0f172a",
  textAlign: "left",
  fontSize: 14,
  cursor: "pointer",
  boxSizing: "border-box",
};

function getMenuPositionStyle(anchorRect) {
  if (!anchorRect) {
    return {
      position: "fixed",
      top: MENU_PADDING,
      left: MENU_PADDING,
      zIndex: 99999,
    };
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = anchorRect.left;
  let top = anchorRect.bottom + MENU_GAP;

  if (left + MENU_WIDTH > viewportWidth - MENU_PADDING) {
    left = viewportWidth - MENU_WIDTH - MENU_PADDING;
  }

  if (left < MENU_PADDING) {
    left = MENU_PADDING;
  }

  if (top + 86 > viewportHeight - MENU_PADDING) {
    top = Math.max(MENU_PADDING, anchorRect.top - 86 - MENU_GAP);
  }

  return {
    position: "fixed",
    top,
    left,
    zIndex: 99999,
  };
}

/**
 * Reusable row context menu (⋮) for View Engine presentations.
 * Business actions are injected via callbacks — no domain logic here.
 */
export default function ViewEngineRowMenu({
  visible = false,
  canCreateSubtask = true,
  canDelete = true,
  createChildMenuLabel = "Создать дочернюю запись",
  onCreateSubtask,
  onDelete,
}) {
  const menuButtonRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);

  const showButton = visible || isMenuOpen;
  const hasActions =
    (canCreateSubtask && typeof onCreateSubtask === "function") ||
    (canDelete && typeof onDelete === "function");

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const updatePosition = () => {
      setMenuAnchorRect(menuButtonRef.current?.getBoundingClientRect() || null);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      const isInsideButton = menuButtonRef.current?.contains(event.target);
      const isInsideMenu = event.target.closest?.("[data-view-engine-row-menu='true']");

      if (!isInsideButton && !isInsideMenu) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  if (!hasActions) {
    return <div className="view-engine-row-menu-slot" aria-hidden="true" />;
  }

  const handleToggleMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setMenuAnchorRect(menuButtonRef.current?.getBoundingClientRect() || null);
    setIsMenuOpen((current) => !current);
  };

  const handleCreateSubtask = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    onCreateSubtask?.();
  };

  const handleDelete = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.();
  };

  const menu = isMenuOpen
    ? createPortal(
        <div
          data-view-engine-table-action="true"
          data-view-engine-row-menu="true"
          style={{
            ...getMenuPositionStyle(menuAnchorRect),
            width: MENU_WIDTH,
            padding: 6,
            borderRadius: 10,
            background: "#ffffff",
            border: "1px solid #dbe3ef",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.18)",
            boxSizing: "border-box",
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {canCreateSubtask && typeof onCreateSubtask === "function" ? (
            <button type="button" onClick={handleCreateSubtask} style={menuItemStyle}>
              {createChildMenuLabel}
            </button>
          ) : null}

          {canDelete && typeof onDelete === "function" ? (
            <button
              type="button"
              onClick={handleDelete}
              style={{
                ...menuItemStyle,
                color: "#dc2626",
              }}
            >
              Удалить
            </button>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        className="view-engine-row-menu-slot"
        data-view-engine-table-action="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={menuButtonRef}
          type="button"
          className="view-engine-row-menu-button"
          data-view-engine-table-action="true"
          data-view-engine-row-menu-button="true"
          onClick={handleToggleMenu}
          title="Меню строки"
          aria-label="Меню строки"
          style={{
            opacity: showButton ? 1 : 0,
            pointerEvents: showButton ? "auto" : "none",
            background: isMenuOpen ? "#f1f5f9" : "transparent",
          }}
        >
          ⋮
        </button>
      </div>
      {menu}
    </>
  );
}
