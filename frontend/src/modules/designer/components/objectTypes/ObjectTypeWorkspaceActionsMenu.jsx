import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

const MENU_SECTIONS = [
  {
    id: "object",
    label: "Object",
    items: [
      { id: "duplicate", label: "Дублировать объект" },
      { id: "save-as-template", label: "Сохранить как шаблон" },
      { id: "export-config", label: "Экспортировать конфигурацию" },
    ],
  },
  {
    id: "runtime",
    label: "Runtime",
    items: [
      { id: "open-runtime-preview", label: "Открыть Runtime Preview" },
      { id: "publish-history", label: "История публикаций" },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    items: [
      { id: "access-rights", label: "Права доступа" },
      { id: "archive", label: "Архивировать объект" },
    ],
  },
];

const DANGER_ITEM = { id: "delete", label: "Удалить объект" };

function notifySoon(actionId) {
  console.info(`[Designer] Soon: ${actionId}`);
}

export default function ObjectTypeWorkspaceActionsMenu({
  isSystemObject = false,
  deleting = false,
  onDelete,
}) {
  const menuId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [soonVisible, setSoonVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!soonVisible) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSoonVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, [soonVisible]);

  const handleStubAction = (actionId) => {
    notifySoon(actionId);
    setSoonVisible(true);
    setOpen(false);
  };

  const handleDeleteClick = () => {
    setOpen(false);
    onDelete?.();
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
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          id={menuId}
          className="designer-workspace-menu__panel"
          role="menu"
          aria-label="Действия объекта"
        >
          {MENU_SECTIONS.map((section) => (
            <div key={section.id} className="designer-workspace-menu__section">
              <div className="designer-workspace-menu__section-label" role="presentation">
                {section.label}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="designer-workspace-menu__item"
                  onClick={() => handleStubAction(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}

          <div className="designer-workspace-menu__danger-zone">
            <button
              type="button"
              role="menuitem"
              className="designer-workspace-menu__item designer-workspace-menu__item--danger"
              onClick={handleDeleteClick}
              disabled={deleting || isSystemObject}
              title={
                isSystemObject
                  ? "Системный объект нельзя удалить"
                  : "Удалить объект"
              }
            >
              {deleting ? "Удаление..." : DANGER_ITEM.label}
            </button>
          </div>
        </div>
      ) : null}

      {soonVisible ? (
        <div className="designer-workspace-menu__soon" role="status" aria-live="polite">
          Скоро
        </div>
      ) : null}
    </div>
  );
}
