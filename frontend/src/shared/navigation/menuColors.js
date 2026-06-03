/** Palette for left menu item colors — single source for navigation & choice options. */
export const MENU_COLORS = [
  "",
  "#ffffff",

  "#0f172a",
  "#334155",
  "#475569",
  "#64748b",

  "#2563eb",
  "#3b82f6",
  "#0ea5e9",
  "#06b6d4",

  "#16a34a",
  "#22c55e",
  "#84cc16",

  "#f59e0b",
  "#f97316",

  "#ef4444",
  "#ec4899",
  "#a855f7",
];

/** Colors suitable as default markers for choice options (no empty / white). */
export const CHOICE_OPTION_PALETTE = MENU_COLORS.filter(
  (color) => color && color !== "#ffffff",
);

export function getMenuColorTitle(color) {
  if (color === "") {
    return "Без цвета";
  }

  if (color === "#ffffff") {
    return "Белый";
  }

  return color;
}

export function getDefaultChoiceOptionColor(index = 0) {
  const palette = CHOICE_OPTION_PALETTE;

  if (!palette.length) {
    return "#2563eb";
  }

  return palette[index % palette.length];
}
