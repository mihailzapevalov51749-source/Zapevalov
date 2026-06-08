import useObjectSettingsSplitResize from "./useObjectSettingsSplitResize";
import {
  DEFAULT_MIN_LEFT_WIDTH_PX,
  DEFAULT_MIN_RIGHT_WIDTH_PX,
} from "./objectSettingsStorage";

export default function ObjectSettingsSplitLayout({
  left,
  right,
  storageKey,
  defaultLeftWidth,
  minLeftWidth = DEFAULT_MIN_LEFT_WIDTH_PX,
  minRightWidth = DEFAULT_MIN_RIGHT_WIDTH_PX,
  className = "",
  minHeight = 420,
}) {
  const {
    workspaceRef,
    leftWidth,
    isDragging,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleResizeLostPointerCapture,
  } = useObjectSettingsSplitResize({
    storageKey,
    defaultLeftWidth,
    minLeftWidth,
    minRightWidth,
  });

  const workspaceStyle = {
    minHeight,
    ...(leftWidth === null
      ? undefined
      : {
          gridTemplateColumns: `${leftWidth}px 7px minmax(0, 1fr)`,
        }),
  };

  return (
    <div
      ref={workspaceRef}
      className={[
        "object-settings-split",
        isDragging ? "object-settings-split--dragging" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={workspaceStyle}
      data-object-settings-dragging={isDragging ? "true" : "false"}
    >
      <div className="object-settings-split__left">{left}</div>

      <div
        className={[
          "object-settings-split__handle",
          isDragging ? "object-settings-split__handle--dragging" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="separator"
        aria-orientation="vertical"
        aria-label="Изменить ширину панелей"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onLostPointerCapture={handleResizeLostPointerCapture}
      />

      <div className="object-settings-split__right">{right}</div>
    </div>
  );
}
