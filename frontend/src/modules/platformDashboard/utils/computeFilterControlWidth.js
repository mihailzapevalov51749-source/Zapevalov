const FILTER_FONT_FAMILY =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export const FILTER_SELECT_FONT = `12px ${FILTER_FONT_FAMILY}`;
export const FILTER_DATE_LABEL_FONT = `500 11px ${FILTER_FONT_FAMILY}`;
export const FILTER_DATE_VALUE_FONT = `12px ${FILTER_FONT_FAMILY}`;

/** Widest possible date-range label (DD.MM.YYYY — DD.MM.YYYY). */
export const MAX_DATE_RANGE_LABEL = "31.12.2026 — 31.12.2026";

let measureCanvas;

function getMeasureContext() {
  if (typeof document === "undefined") {
    return null;
  }

  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }

  return measureCanvas.getContext("2d");
}

export function measureTextWidth(text, font = FILTER_SELECT_FONT) {
  const normalized = String(text || "");
  const context = getMeasureContext();

  if (context) {
    context.font = font;
    return Math.ceil(context.measureText(normalized).width);
  }

  return Math.ceil(normalized.length * 7);
}

export function getMaxLabelWidth(labels, font = FILTER_SELECT_FONT) {
  const items = Array.isArray(labels) ? labels : [];

  return items.reduce((maxWidth, label) => {
    return Math.max(maxWidth, measureTextWidth(label, font));
  }, 0);
}

export function computeSelectWidth(
  labels,
  { horizontalPadding = 36, minWidth = 112 } = {},
) {
  const contentWidth = getMaxLabelWidth(labels, FILTER_SELECT_FONT);
  return Math.max(minWidth, contentWidth + horizontalPadding);
}

export const DATE_FILTER_HORIZONTAL_PADDING = 16;
export const DATE_FILTER_LABEL_VALUE_GAP = 6;
export const DATE_FILTER_VALUE_BUFFER = 14;
export const DATE_FILTER_BORDER_WIDTH = 2;
export const DATE_FILTER_CLEAR_SLOT_WIDTH = 22;
export const DATE_FILTER_CLEAR_GAP = 6;

export function computeDateFilterWidth(dateLabel, hasValue = false) {
  const labelWidth = measureTextWidth("Дата", FILTER_DATE_LABEL_FONT);
  const valueWidth = measureTextWidth(dateLabel || "—", FILTER_DATE_VALUE_FONT);
  const clearWidth = hasValue
    ? DATE_FILTER_CLEAR_SLOT_WIDTH + DATE_FILTER_CLEAR_GAP
    : 0;

  return Math.max(
    96,
    labelWidth +
      DATE_FILTER_LABEL_VALUE_GAP +
      valueWidth +
      DATE_FILTER_VALUE_BUFFER +
      DATE_FILTER_HORIZONTAL_PADDING +
      DATE_FILTER_BORDER_WIDTH +
      clearWidth,
  );
}

/** Fixed period field width — always sized for the widest date range + clear control. */
export function computeFixedDateFilterWidth() {
  return computeDateFilterWidth(MAX_DATE_RANGE_LABEL, true);
}
