import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

const MENU_ITEMS = [
  { id: "rename", label: "Переименовать" },
  { id: "duplicate", label: "Дублировать" },
];

const PANEL_WIDTH = 220;
const PANEL_HEIGHT = 148;

function notifySoon(actionId) {
  console.info(`[Designer] Soon: ${actionId}`);
}

export default function ObjectTypeWorkspaceActionsMenu({
  isSystemObject = false,
  deleting = false,
  onRename,
  onDuplicate,
  onDelete,
}) {
  const menuId = useId();
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const [soonVisible, setSoonVisible] = useState(false);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 10;
    const availableBottom = window.innerHeight - rect.bottom;
    const preferTop = availableBottom < PANEL_HEIGHT;
    const top = preferTop
      ? Math.max(viewportPadding, rect.top - PANEL_HEIGHT - 8)
      : Math.min(window.innerHeight - PANEL_HEIGHT - viewportPadding, rect.bottom + 8);
    const left = Math.min(
      window.innerWidth - PANEL_WIDTH - viewportPadding,
      Math.max(viewportPadding, rect.right - PANEL_WIDTH),
    );

    setPanelPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const insideTrigger = rootRef.current?.contains(event.target);
      const insidePanel = panelRef.current?.contains(event.target);
      if (!insideTrigger && !insidePanel) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    updatePanelPosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!soonVisible) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSoonVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, [soonVisible]);

  const closeAndRun = (action) => {
    setOpen(false);
    action?.();
  };

  const handleDuplicateClick = () => {
    if (onDuplicate) {
      closeAndRun(onDuplicate);
      return;
    }
    notifySoon("duplicate");
    setSoonVisible(true);
    setOpen(false);
  };

  return (
    <div className="designer-workspace-menu" ref={rootRef}>
      <button
        type="button"
        className="designer-workspace-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Действия"
        ref={triggerRef}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </button>

      {open
        ? createPortal(
            <div
              id={menuId}
              className="designer-workspace-menu__panel designer-object-type-actions-menu__panel"
              ref={panelRef}
              style={{ top: panelPosition.top, left: panelPosition.left }}
              role="menu"
              aria-label="Действия объекта"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="designer-workspace-menu__section">
                <div className="designer-workspace-menu__section-label" role="presentation">
                  Управление объектом
                </div>
                {MENU_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className="designer-workspace-menu__item"
                    onClick={() => {
                      if (item.id === "rename") {
                        closeAndRun(onRename);
                        return;
                      }
                      handleDuplicateClick();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="designer-workspace-menu__danger-zone">
                <button
                  type="button"
                  role="menuitem"
                  className="designer-workspace-menu__item designer-workspace-menu__item--danger"
                  onClick={() => closeAndRun(onDelete)}
                  disabled={deleting || isSystemObject}
                  title={
                    isSystemObject
                      ? "Системный объект нельзя удалить"
                      : "Удалить объект"
                  }
                >
                  {deleting ? "Удаление..." : "Удалить"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {soonVisible ? (
        <div className="designer-workspace-menu__soon" role="status" aria-live="polite">
          Скоро
        </div>
      ) : null}
    </div>
  );
}
