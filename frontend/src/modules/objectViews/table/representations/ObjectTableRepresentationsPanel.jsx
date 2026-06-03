import { useMemo } from "react";
import { createPortal } from "react-dom";

import settingsIcon from "../../../../assets/icons/settings.gif";
import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";

import { buildObjectTableViewSummaries } from "../viewSettings/objectTableViewSettingsSummaries";

import "./objectTableRepresentationsPanel.css";

export default function ObjectTableRepresentationsPanel({
  open = false,
  anchorRef,
  onClose,
  views = [],
  activeViewKey = "",
  catalog = null,
  objectTypeKey = "",
  visibleSlotsLimit = 2,
  onVisibleSlotsLimitChange,
  getPinnedSlotIndex,
  replacePinnedSlot,
  onSelectView,
  onToggleVisibility,
  onOpenViewSettings,
}) {
  const summariesByKey = useMemo(() => {
    const map = new Map();

    for (const view of views) {
      const summary = buildObjectTableViewSummaries({
        effectiveContract: view.contract,
        catalog,
        objectTypeKey,
      }).summaryLine;

      map.set(view.key, summary);
    }

    return map;
  }, [views, catalog, objectTypeKey]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const rect = anchorRef?.current?.getBoundingClientRect?.();
  const top = rect ? rect.bottom + 6 : 48;
  const right = rect ? Math.max(8, window.innerWidth - rect.right) : 8;

  const handleLimitChange = (event) => {
    onVisibleSlotsLimitChange?.(event.target.value);
  };

  return createPortal(
    <div
      className="object-table-representations-panel"
      style={{ position: "fixed", top, right, zIndex: 5000 }}
      data-object-table-representations-panel="true"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="object-table-representations-panel__limit-row">
        <div className="object-table-representations-panel__limit-label">
          Кол-во представлений на экране
        </div>
        <input
          type="number"
          min={1}
          max={2}
          className="object-table-representations-panel__limit-input"
          value={visibleSlotsLimit}
          onChange={handleLimitChange}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        />
      </div>

      {views.length === 0 ? (
        <div className="object-table-representations-panel__empty">
          Пользовательских представлений пока нет.
          <br />
          Создайте представление из состояния «Все».
        </div>
      ) : (
        views.map((view) => {
          const isActive = view.key === String(activeViewKey);
          const isHidden = !view.isVisible;
          const summary = summariesByKey.get(view.key) || "";
          const slotIndex = getPinnedSlotIndex?.(view);

          return (
            <div
              key={view.key}
              className={[
                "object-table-representations-panel__item",
                isActive ? " is-active" : "",
                isHidden ? " is-hidden" : "",
              ]
                .filter(Boolean)
                .join("")}
            >
              <button
                type="button"
                disabled={isHidden}
                className={[
                  "object-table-representations-panel__name-btn",
                  isActive ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={view.name}
                onClick={() => onSelectView?.(view)}
              >
                <span className="object-table-representations-panel__title">
                  {view.isDefault ? "★ " : ""}
                  {view.name}
                  {view.isDirty ? " *" : ""}
                </span>
                <span
                  className="object-table-representations-panel__summary"
                  title={summary}
                >
                  {summary}
                </span>
              </button>

              <div className="object-table-representations-panel__actions">
                {visibleSlotsLimit > 0 ? (
                  <select
                    className="object-table-representations-panel__slot-select"
                    value={slotIndex !== null ? slotIndex + 1 : ""}
                    disabled={isHidden}
                    title="Позиция представления"
                    onChange={(event) => {
                      event.stopPropagation();
                      const nextIndex = Number(event.target.value) - 1;

                      if (nextIndex >= 0) {
                        replacePinnedSlot?.(view, nextIndex);
                      }
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    {Array.from({ length: visibleSlotsLimit }).map((_, index) => (
                      <option key={index} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                ) : null}

                <button
                  type="button"
                  className="object-table-representations-panel__icon-btn"
                  title={
                    view.isVisible
                      ? "Скрыть представление"
                      : "Показать представление"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleVisibility?.(view);
                  }}
                >
                  <img
                    src={view.isVisible ? eyeOpenIcon : eyeClosedIcon}
                    alt=""
                  />
                </button>

                <button
                  type="button"
                  className="object-table-representations-panel__icon-btn"
                  title="Настроить представление"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenViewSettings?.(view.key, event.currentTarget);
                  }}
                >
                  <img src={settingsIcon} alt="" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>,
    document.body,
  );
}
