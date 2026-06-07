import { useRef, useState } from "react";
import { GripVertical } from "lucide-react";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";

import "./planLayoutOrderList.css";

export default function PlanLayoutOrderList({
  title,
  items = [],
  onToggleVisible,
  onReorder,
  onLabelChange = null,
  canToggleVisible = () => true,
  showInInfoColumn = false,
  onToggleShowInInfo = null,
  canToggleShowInInfo = () => true,
  renderMeta = null,
}) {
  const dropPositionRef = useRef("before");
  const [dragOverKey, setDragOverKey] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState("before");

  if (!items.length) {
    return <p className="plan-layout-order-list__empty">Список пуст</p>;
  }

  const rowClassName = showInInfoColumn
    ? "plan-layout-order-list__row plan-layout-order-list__row--with-info"
    : "plan-layout-order-list__row";

  return (
    <div className="plan-layout-order-list">
      {title ? <h6 className="plan-layout-order-list__title">{title}</h6> : null}

      {showInInfoColumn ? (
        <div className="plan-layout-order-list__header plan-layout-order-list__header--with-info">
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span className="plan-layout-order-list__header-info">Инфо</span>
          <span aria-hidden="true" />
        </div>
      ) : null}

      <div className="plan-layout-order-list__items">
        {items.map((item) => {
          const itemKey = String(item?.key || "").trim();
          const label = String(item?.label || itemKey).trim();
          const isVisible = item?.visible !== false;
          const showInInfo = item?.showInInfo === true;
          const allowToggle = canToggleVisible(itemKey, item);
          const allowToggleShowInInfo = canToggleShowInInfo(itemKey, item);
          const isDragOver = dragOverKey === itemKey;

          return (
            <div
              key={itemKey}
              className={[
                rowClassName,
                !isVisible ? "is-hidden" : "",
                isDragOver ? "is-drag-over" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable
              onDragStart={(event) => {
                const isInteractiveControl = event.target?.closest?.(
                  "[data-plan-layout-visibility='true'], [data-plan-layout-show-in-info='true']",
                );

                if (isInteractiveControl) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }

                event.stopPropagation();
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", itemKey);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const rect = event.currentTarget.getBoundingClientRect();
                const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";

                dropPositionRef.current = position;
                setDragOverKey(itemKey);
                setDragOverPosition(position);
              }}
              onDragLeave={() => {
                setDragOverKey((current) => (current === itemKey ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const sourceKey = event.dataTransfer.getData("text/plain");

                setDragOverKey(null);
                onReorder?.(sourceKey, itemKey, dropPositionRef.current || "before");
              }}
              onDragEnd={() => {
                setDragOverKey(null);
              }}
            >
              <span className="plan-layout-order-list__handle" aria-hidden="true">
                <GripVertical size={14} />
              </span>

              <button
                type="button"
                className="plan-layout-order-list__visibility"
                data-plan-layout-visibility="true"
                aria-label={isVisible ? `Скрыть ${label}` : `Показать ${label}`}
                disabled={!allowToggle}
                onClick={() => onToggleVisible?.(itemKey)}
              >
                <img
                  src={isVisible ? eyeOpenIcon : eyeClosedIcon}
                  alt=""
                  width={16}
                  height={16}
                />
              </button>

              {showInInfoColumn ? (
                itemKey === "info" ? (
                  <span className="plan-layout-order-list__info-placeholder" aria-hidden="true">
                    —
                  </span>
                ) : (
                  <label
                    className="plan-layout-order-list__info-toggle"
                    data-plan-layout-show-in-info="true"
                  >
                    <input
                      type="checkbox"
                      checked={showInInfo}
                      disabled={!allowToggleShowInInfo}
                      aria-label={`Показывать ${label} во вкладке Инфо`}
                      onChange={() => onToggleShowInInfo?.(itemKey)}
                    />
                  </label>
                )
              ) : null}

              <div className="plan-layout-order-list__content">
                {onLabelChange ? (
                  <input
                    className="plan-layout-order-list__label-input"
                    value={label}
                    aria-label={`Название ${label}`}
                    onChange={(event) => onLabelChange(itemKey, event.target.value)}
                  />
                ) : (
                  <span className="plan-layout-order-list__label">{label}</span>
                )}
                {renderMeta ? renderMeta(item) : null}
              </div>

              <span
                className={[
                  "plan-layout-order-list__drop-indicator",
                  isDragOver && dragOverPosition === "before" ? "is-before" : "",
                  isDragOver && dragOverPosition === "after" ? "is-after" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
