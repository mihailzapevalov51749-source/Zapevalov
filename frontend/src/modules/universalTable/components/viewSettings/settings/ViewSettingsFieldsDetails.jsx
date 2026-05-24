import { useRef, useState } from "react";

import eyeOpenIcon from "../../../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../../../assets/icons/eye-closed.png";

import {
  getColumnId,
  getColumnTitle,
  isSystemColumn,
  isLockedVisibilityColumn,
  getHiddenColumnIds,
} from "../helpers/tableRepresentationViewUtils";

import {
  settingsFieldsListStyle,
  settingsFieldButtonStyle,
  settingsFieldLeftStyle,
  settingsFieldTitleStyle,
  settingsFieldSystemLabelStyle,
  settingsDetailRowStyle,
} from "./viewSettingsStyles";

export default function ViewSettingsFieldsDetails({
  representation,
  columns = [],
  tableViewState = {},
  activeRepresentationId = null,

  onToggleColumnVisibility,

  handleStartDragColumnWithSystem,
  handleDragOverColumnWithSystem,
  handleDropColumnWithSystem,
}) {
  const dropPositionRef = useRef("before");

  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState("before");

  const hiddenIds = getHiddenColumnIds(
    representation,
    tableViewState,
    activeRepresentationId
  );

  const safeColumns = Array.isArray(columns) ? columns : [];

  if (!safeColumns.length) {
    return <div style={settingsDetailRowStyle}>Полей пока нет</div>;
  }

  return (
    <div style={settingsFieldsListStyle}>
      {safeColumns.map((column) => {
        const columnId = getColumnId(column);
        const title = String(getColumnTitle(column) || "").trim();

        const isTitleColumn = title.toLowerCase() === "название";
        const isHidden = hiddenIds.includes(columnId);
        const isLocked = isLockedVisibilityColumn(column) || isTitleColumn;
        const isSystem = isSystemColumn(column);
        const isDragOver = dragOverColumnId === columnId;

        return (
          <div
            key={columnId}
            draggable={!isTitleColumn}
            onDragStart={(event) => {
              const isVisibilityButton = event.target?.closest?.(
                "[data-view-field-visibility='true']"
              );

              if (isVisibilityButton || isTitleColumn) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }

              event.stopPropagation();
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", columnId);

              handleStartDragColumnWithSystem?.(columnId);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();

              const rect = event.currentTarget.getBoundingClientRect();
              const offsetY = event.clientY - rect.top;
              const position = offsetY > rect.height / 2 ? "after" : "before";

              dropPositionRef.current = position;
              setDragOverColumnId(columnId);
              setDragOverPosition(position);

              handleDragOverColumnWithSystem?.(event, columnId);
            }}
            onDragLeave={() => {
              setDragOverColumnId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();

              setDragOverColumnId(null);

              const sourceColumnId =
                event.dataTransfer.getData("text/plain");

              handleDropColumnWithSystem?.(
                columnId,
                sourceColumnId,
                dropPositionRef.current
              );
            }}
            style={{
              ...settingsFieldButtonStyle,
              position: "relative",
              cursor: isTitleColumn ? "default" : "grab",
              opacity: isLocked ? 0.72 : 1,
              borderTop:
                isDragOver && dragOverPosition === "before"
                  ? "2px solid #2563eb"
                  : "2px solid transparent",
              borderBottom:
                isDragOver && dragOverPosition === "after"
                  ? "2px solid #2563eb"
                  : "2px solid transparent",
              background: isDragOver
                ? "#eff6ff"
                : settingsFieldButtonStyle.background,
            }}
            title={isTitleColumn ? "Главное поле" : "Переместить поле"}
          >
            <div style={settingsFieldLeftStyle}>
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#94a3b8",
                  fontSize: 15,
                  lineHeight: 1,
                  userSelect: "none",
                  opacity: isTitleColumn ? 0.35 : 1,
                }}
              >
                ⋮⋮
              </span>

              <span
                style={{
                  ...settingsFieldTitleStyle,
                  color: isHidden ? "#94a3b8" : "#111827",
                }}
              >
                {title}

                {isSystem ? (
                  <span style={settingsFieldSystemLabelStyle}>системное</span>
                ) : null}
              </span>
            </div>

            <button
              type="button"
              data-view-field-visibility="true"
              disabled={isLocked}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (isLocked) return;

                onToggleColumnVisibility?.(columnId);
              }}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLocked ? "default" : "pointer",
                position: "relative",
                zIndex: 10,
              }}
              title={
                isLocked
                  ? "Это поле нельзя скрыть"
                  : isHidden
                    ? "Показать поле"
                    : "Скрыть поле"
              }
            >
              <img
                src={isHidden ? eyeClosedIcon : eyeOpenIcon}
                alt=""
                draggable={false}
                style={{
                  width: 16,
                  height: 16,
                  objectFit: "contain",
                  opacity: isLocked ? 0.28 : isHidden ? 0.5 : 0.9,
                  flexShrink: 0,
                  pointerEvents: "none",
                }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}