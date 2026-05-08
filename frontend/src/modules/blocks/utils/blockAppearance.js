export function getBlockAppearanceStyles(settings = {}, isEditMode = false) {
  const appearance = settings.appearance || {};

  const modeSettings = isEditMode
    ? appearance.editMode || {}
    : appearance.viewMode || {};

  const backgroundEnabled =
    modeSettings.backgroundEnabled ??
    appearance.backgroundEnabled ??
    true;

  const borderEnabled =
    modeSettings.borderEnabled ??
    appearance.borderEnabled ??
    true;

  const shadowEnabled = appearance.shadowEnabled ?? false;

  return {
    background: backgroundEnabled
      ? appearance.backgroundColor || "#ffffff"
      : "transparent",

    border: borderEnabled
      ? `1px solid ${appearance.borderColor || "#e2e8f0"}`
      : "none",

    borderRadius: appearance.borderRadius ?? 12,

    padding: appearance.padding ?? 18,

    boxShadow: shadowEnabled
      ? "0 8px 24px rgba(15, 23, 42, 0.08)"
      : "none",

    boxSizing: "border-box",
    overflow: "hidden",
  };
}