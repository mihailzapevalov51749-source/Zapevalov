import { useMemo } from "react";

import {
  buildViewEngineGridTemplateColumns,
  resolveViewEngineFullTableMinWidth,
} from "../viewEngineLayoutConstants";
import { DEFAULT_COLUMN_WIDTH } from "../viewEngineStyles";

/**
 * @param {import("../contracts").ViewEngineColumn[]} dataColumns
 * @param {(column: import("../contracts").ViewEngineColumn) => number} getColumnWidth
 * @param {{ showSelectionColumn?: boolean, showRowNumberColumn?: boolean }} [options]
 */
export default function useViewEngineLayout(
  dataColumns = [],
  getColumnWidth,
  options = {},
) {
  const {
    showSelectionColumn = true,
    showRowNumberColumn = false,
  } = options;

  const resolveWidth =
    typeof getColumnWidth === "function"
      ? getColumnWidth
      : (column) => column.width || DEFAULT_COLUMN_WIDTH;

  const layoutParams = useMemo(
    () => ({
      dataColumns,
      getColumnWidth: resolveWidth,
      showSelectionColumn,
      showRowNumberColumn,
    }),
    [dataColumns, resolveWidth, showSelectionColumn, showRowNumberColumn],
  );

  const gridTemplateColumns = useMemo(() => {
    return buildViewEngineGridTemplateColumns(layoutParams);
  }, [layoutParams]);

  const fullTableMinWidth = useMemo(() => {
    return resolveViewEngineFullTableMinWidth(layoutParams);
  }, [layoutParams]);

  return {
    gridTemplateColumns,
    fullTableMinWidth,
  };
}
