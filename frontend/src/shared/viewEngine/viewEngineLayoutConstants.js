/** Grid chrome widths (reference: useUniversalTableLayout / TableHeader). */

import {
  VE_FULL_TABLE_MIN_WIDTH_FLOOR,
  VE_ROW_NUMBER_COLUMN_WIDTH,
  VE_SELECT_COLUMN_WIDTH,
} from "./viewEngineReferenceTokens";

export const VIEW_ENGINE_SELECT_COLUMN_WIDTH = VE_SELECT_COLUMN_WIDTH;
export const VIEW_ENGINE_ROW_NUMBER_COLUMN_WIDTH = VE_ROW_NUMBER_COLUMN_WIDTH;

/**
 * @param {{
 *   dataColumns?: import("./contracts").ViewEngineColumn[],
 *   getColumnWidth: (column: import("./contracts").ViewEngineColumn) => number,
 *   showSelectionColumn?: boolean,
 *   showRowNumberColumn?: boolean,
 * }} params
 */
export function buildViewEngineGridTemplateColumns({
  dataColumns = [],
  getColumnWidth,
  showSelectionColumn = true,
  showRowNumberColumn = false,
}) {
  const parts = [];

  if (showSelectionColumn) {
    parts.push(`${VIEW_ENGINE_SELECT_COLUMN_WIDTH}px`);
  }

  if (showRowNumberColumn) {
    parts.push(`${VIEW_ENGINE_ROW_NUMBER_COLUMN_WIDTH}px`);
  }

  for (const column of dataColumns) {
    parts.push(`${getColumnWidth(column)}px`);
  }

  return parts.join(" ");
}

/**
 * @param {{
 *   dataColumns?: import("./contracts").ViewEngineColumn[],
 *   getColumnWidth: (column: import("./contracts").ViewEngineColumn) => number,
 *   showSelectionColumn?: boolean,
 *   showRowNumberColumn?: boolean,
 * }} params
 */
export function resolveViewEngineFullTableMinWidth({
  dataColumns = [],
  getColumnWidth,
  showSelectionColumn = true,
  showRowNumberColumn = false,
}) {
  let sum = 0;

  if (showSelectionColumn) {
    sum += VIEW_ENGINE_SELECT_COLUMN_WIDTH;
  }

  if (showRowNumberColumn) {
    sum += VIEW_ENGINE_ROW_NUMBER_COLUMN_WIDTH;
  }

  for (const column of dataColumns) {
    sum += getColumnWidth(column);
  }

  return Math.max(sum, VE_FULL_TABLE_MIN_WIDTH_FLOOR);
}
