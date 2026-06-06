const VIEW_TYPE_LABELS = {
  table: "Таблица",
  kanban: "Канбан",
  calendar: "Календарь",
};

/**
 * @param {{
 *   activeAdapterType?: string,
 *   activeRepresentationName?: string,
 * }} params
 */
export function resolveStudioPreviewDisplayLabel({
  activeAdapterType = "table",
  activeRepresentationName = "",
} = {}) {
  const typeKey = String(activeAdapterType || "table").toLowerCase();
  const typeLabel = VIEW_TYPE_LABELS[typeKey] || "Таблица";

  if (typeKey === "table") {
    const representationName =
      String(activeRepresentationName || "Все").trim() || "Все";

    return `${typeLabel} → ${representationName}`;
  }

  return typeLabel;
}
