const OBJECT_VIEW_ADAPTER_LABELS = {
  table: "Таблица",
  board: "Канбан",
  tree: "Дерево",
  calendar: "Календарь",
  timeline: "Таймлайн",
  graph: "Граф",
  cards: "Карточки",
  chart: "Диаграмма",
};

/**
 * Human label for object view adapter (tab), not saved representation name.
 * @param {string | null | undefined} viewType
 * @returns {string}
 */
export function getObjectViewAdapterLabel(viewType) {
  const normalized = String(viewType ?? "table")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return OBJECT_VIEW_ADAPTER_LABELS.table;
  }

  return OBJECT_VIEW_ADAPTER_LABELS[normalized] ?? "Представление";
}
