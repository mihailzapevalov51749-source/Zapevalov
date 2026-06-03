import { useRef, useState } from "react";

import eyeOpenIcon from "../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../assets/icons/eye-closed.png";

import "./viewPropertiesFieldsList.css";

/**
 * Unified field order for display: field_order + any missing keys from catalog.
 *
 * @param {string[]} fieldOrder
 * @param {Array<{ key: string }>} fieldOptions
 */
export function buildUnifiedFieldKeys(fieldOrder = [], fieldOptions = []) {
  const order = [...(fieldOrder || [])];
  const seen = new Set(order);

  for (const field of fieldOptions) {
    const key = String(field?.key || "").trim();

    if (!key || seen.has(key)) {
      continue;
    }

    order.push(key);
    seen.add(key);
  }

  return order;
}

export default function ViewPropertiesFieldsList({
  fieldOptions = [],
  visibleFields = [],
  fieldOrder = [],
  titleFieldKey = null,
  onToggleVisibleField,
  onReorderField,
}) {
  const dropPositionRef = useRef("before");
  const [dragOverFieldKey, setDragOverFieldKey] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState("before");

  const fieldByKey = new Map(
    fieldOptions.map((field) => [String(field.key), field]),
  );

  const visibleSet = new Set(visibleFields || []);
  const orderedKeys = buildUnifiedFieldKeys(fieldOrder, fieldOptions);

  if (!orderedKeys.length) {
    return <p className="designer-view-fields-list__empty">Полей пока нет</p>;
  }

  return (
    <div className="designer-view-fields-list">
      <h6 className="designer-view-fields-list__title">Поля</h6>

      <div className="designer-view-fields-list__items">
        {orderedKeys.map((fieldKey) => {
          const field = fieldByKey.get(fieldKey);
          const title = String(field?.name || fieldKey).trim();
          const isVisible = visibleSet.has(fieldKey);
          const isSystem = Boolean(field?.is_system);
          const isTitleField =
            titleFieldKey && String(titleFieldKey) === String(fieldKey);
          const isLocked = isTitleField;
          const isDragOver = dragOverFieldKey === fieldKey;

          return (
            <div
              key={fieldKey}
              className={[
                "designer-view-fields-list__row",
                !isVisible ? "is-hidden" : "",
                isDragOver ? "is-drag-over" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={!isLocked}
              onDragStart={(event) => {
                const isVisibilityControl = event.target?.closest?.(
                  "[data-view-field-visibility='true']",
                );

                if (isVisibilityControl || isLocked) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }

                event.stopPropagation();
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", fieldKey);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();

                const rect = event.currentTarget.getBoundingClientRect();
                const offsetY = event.clientY - rect.top;
                const position = offsetY > rect.height / 2 ? "after" : "before";

                dropPositionRef.current = position;
                setDragOverFieldKey(fieldKey);
                setDragOverPosition(position);
              }}
              onDragLeave={() => {
                setDragOverFieldKey(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragOverFieldKey(null);

                const sourceKey = event.dataTransfer.getData("text/plain");

                if (!sourceKey || sourceKey === fieldKey) {
                  return;
                }

                onReorderField?.(sourceKey, fieldKey, dropPositionRef.current);
              }}
              title={isLocked ? "Главное поле" : "Переместить поле"}
            >
              <div
                className={[
                  "designer-view-fields-list__drop-indicator",
                  isDragOver && dragOverPosition === "before"
                    ? "is-before"
                    : "",
                  isDragOver && dragOverPosition === "after" ? "is-after" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />

              <span
                className="designer-view-fields-list__handle"
                aria-hidden="true"
                style={{ opacity: isLocked ? 0.35 : 1 }}
              >
                ⋮⋮
              </span>

              <span
                className={[
                  "designer-view-fields-list__label",
                  !isVisible ? "is-muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {title}
                {isSystem ? (
                  <span className="designer-view-fields-list__system-badge">
                    системное
                  </span>
                ) : null}
              </span>

              <button
                type="button"
                data-view-field-visibility="true"
                className="designer-view-fields-list__visibility-btn"
                disabled={isLocked}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (isLocked) {
                    return;
                  }

                  onToggleVisibleField?.(fieldKey);
                }}
                title={
                  isLocked
                    ? "Это поле нельзя скрыть"
                    : isVisible
                      ? "Скрыть поле"
                      : "Показать поле"
                }
              >
                <img
                  src={isVisible ? eyeOpenIcon : eyeClosedIcon}
                  alt=""
                  draggable={false}
                  className="designer-view-fields-list__visibility-icon"
                  style={{ opacity: isLocked ? 0.28 : isVisible ? 0.9 : 0.5 }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
