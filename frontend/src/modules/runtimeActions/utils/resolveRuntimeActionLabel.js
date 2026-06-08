export function resolveRuntimeActionLabel(action) {
  const override = String(action?.label_override || "").trim();
  if (override) {
    return override;
  }

  return String(action?.name || action?.key || "").trim() || "Действие";
}
