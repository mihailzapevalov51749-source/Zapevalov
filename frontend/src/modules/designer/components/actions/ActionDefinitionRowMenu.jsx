import { useCallback, useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function ActionDefinitionRowMenu({ onDelete, disabled = false }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  const handleDelete = useCallback(() => {
    closeMenu();
    onDelete?.();
  }, [closeMenu, onDelete]);

  return (
    <div className="designer-workspace-menu" ref={rootRef}>
      <button
        type="button"
        className="designer-workspace-menu__trigger"
        aria-label="Действия"
        aria-expanded={open}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreVertical size={16} strokeWidth={2} aria-hidden="true" />
      </button>

      {open ? (
        <div className="designer-workspace-menu__panel" role="menu">
          <div className="designer-workspace-menu__danger-zone">
            <button
              type="button"
              className="designer-workspace-menu__item designer-workspace-menu__item--danger"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete();
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
