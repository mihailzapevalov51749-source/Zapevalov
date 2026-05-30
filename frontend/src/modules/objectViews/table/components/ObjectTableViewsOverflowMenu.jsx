import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Overflow menu for views: list + representation actions (reference TableRepresentationsOverflowMenu pattern).
 */
export default function ObjectTableViewsOverflowMenu({
  open = false,
  anchorRef,
  onClose,
  overflowViews = [],
  activeViewKey = "",
  activeViewLabel = "",
  isDirty = false,
  canSave = false,
  saving = false,
  canRename = false,
  canDuplicate = false,
  canDelete = false,
  canSetDefault = false,
  actionLoading = false,
  onSelectView,
  onRename,
  onDuplicate,
  onDelete,
  onSetDefault,
  onSave,
  onReset,
  onRefresh,
  refreshing = false,
}) {
  const menuRef = useRef(null);

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

  if (!open || typeof document === "undefined") {
    return null;
  }

  const rect = anchorRef?.current?.getBoundingClientRect?.();
  const top = rect ? rect.bottom + 6 : 48;
  const right = rect ? Math.max(8, window.innerWidth - rect.right) : 8;

  const handleSelectView = (key) => {
    onSelectView?.(key);
    onClose?.();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="view-engine-toolbar__portal-menu view-engine-toolbar__views-portal-menu"
      style={{
        position: "fixed",
        top,
        right,
        zIndex: 5000,
      }}
      role="menu"
    >
      {overflowViews.length > 0 ? (
        <div className="view-engine-toolbar__portal-menu-section">
          <div className="view-engine-toolbar__portal-menu-label">
            Представления
          </div>
          {overflowViews.map((item) => {
            const key = String(item.contract?.key || "");
            const label = item.contract?.name || key;
            const isActive = key === String(activeViewKey);

            return (
              <button
                key={key}
                type="button"
                className={`view-engine-toolbar__portal-menu-item${isActive ? " is-active" : ""}`}
                onClick={() => handleSelectView(key)}
              >
                {label}
                {item.contract?.meta?.isDefault ? " ★" : ""}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="view-engine-toolbar__portal-menu-section">
        <div className="view-engine-toolbar__portal-menu-label">
          {activeViewLabel || "Текущее представление"}
          {isDirty ? " *" : ""}
        </div>

        {canRename ? (
          <button
            type="button"
            className="view-engine-toolbar__portal-menu-item"
            disabled={actionLoading}
            onClick={() => {
              onClose?.();
              onRename?.();
            }}
          >
            Переименовать представление
          </button>
        ) : null}

        {canDuplicate ? (
          <button
            type="button"
            className="view-engine-toolbar__portal-menu-item"
            disabled={actionLoading}
            onClick={() => {
              onClose?.();
              onDuplicate?.();
            }}
          >
            Дублировать
          </button>
        ) : null}

        {canSetDefault ? (
          <button
            type="button"
            className="view-engine-toolbar__portal-menu-item"
            disabled={actionLoading}
            onClick={() => {
              onClose?.();
              onSetDefault?.();
            }}
          >
            Сделать по умолчанию
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            className="view-engine-toolbar__portal-menu-item view-engine-toolbar__portal-menu-item--danger"
            disabled={actionLoading}
            onClick={() => {
              onClose?.();
              onDelete?.();
            }}
          >
            Удалить
          </button>
        ) : null}

        <div className="view-engine-toolbar__portal-menu-divider" />

        <button
          type="button"
          className="view-engine-toolbar__portal-menu-item"
          disabled={!isDirty || !canSave || saving}
          title={
            !canSave
              ? "Сохранение недоступно: создайте представление в конструкторе"
              : !isDirty
                ? "Нет несохранённых изменений"
                : ""
          }
          onClick={() => {
            void Promise.resolve(onSave?.()).finally(() => {
              onClose?.();
            });
          }}
        >
          {saving ? "Сохранение…" : "Сохранить изменения представления"}
        </button>

        <button
          type="button"
          className="view-engine-toolbar__portal-menu-item"
          disabled={!isDirty}
          onClick={() => {
            onReset?.();
            onClose?.();
          }}
        >
          Сбросить изменения
        </button>

        <button
          type="button"
          className="view-engine-toolbar__portal-menu-item"
          disabled={refreshing}
          onClick={() => {
            onRefresh?.();
            onClose?.();
          }}
        >
          {refreshing ? "Обновление…" : "Обновить данные"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
