import "./objectSettingsStyles.css";

export default function ObjectSettingsPage({
  children,
  className = "",
  dragging = false,
  compact = false,
}) {
  return (
    <div
      className={[
        "object-settings-page",
        compact ? "object-settings-page--compact" : "",
        dragging ? "object-settings-page--dragging" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
