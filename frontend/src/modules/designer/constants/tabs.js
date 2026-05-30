export const DESIGNER_TABS = [
  { id: "general", label: "Общие" },
  { id: "fields", label: "Поля" },
  { id: "relations", label: "Связи" },
  { id: "views", label: "Вкладки" },
  { id: "runtime-preview", label: "Runtime Preview" },
];

export const DESIGNER_TAB_IDS = DESIGNER_TABS.map((tab) => tab.id);

export const DEFAULT_DESIGNER_TAB = "general";

export function isValidDesignerTab(tab) {
  return DESIGNER_TAB_IDS.includes(tab);
}
