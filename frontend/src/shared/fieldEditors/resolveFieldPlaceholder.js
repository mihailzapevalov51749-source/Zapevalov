export function resolveFieldPlaceholder(fieldDef, column) {
  const fromDef = String(fieldDef?.placeholder || "").trim();

  if (fromDef) {
    return fromDef;
  }

  const fromColumn = String(
    column?.placeholder || column?.settings?.placeholder || "",
  ).trim();

  return fromColumn;
}
