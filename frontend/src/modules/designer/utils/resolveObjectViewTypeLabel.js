const VIEW_TYPE_LABELS = {
  table: "Таблица",
  plan: "План",
  quick_form: "Быстрая форма",
  kanban: "Канбан",
  calendar: "Календарь",
  chart: "Диаграмма",
  diagram: "Диаграмма",
};

/**
 * Human-readable object view type label for Studio Preview.
 *
 * @param {string | null | undefined} viewType
 */
export function resolveObjectViewTypeLabel(viewType) {
  const typeKey = String(viewType || "table").trim().toLowerCase();
  return VIEW_TYPE_LABELS[typeKey] || typeKey || "Таблица";
}
