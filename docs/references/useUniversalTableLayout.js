import { useMemo } from "react";

import {
  ADD_COLUMN_WIDTH,
  SELECT_COLUMN_WIDTH,
} from "../services/tableConstants";

export default function useUniversalTableLayout({
  columns = [],
  getColumnWidth,
}) {
  const gridTemplateColumns = useMemo(() => {
    return columns.map((column) => `${getColumnWidth(column)}px`).join(" ");
  }, [columns, getColumnWidth]);

  const tableMinWidth = useMemo(() => {
    return columns.reduce((sum, column) => sum + getColumnWidth(column), 0);
  }, [columns, getColumnWidth]);

  const tableGridTemplateColumns = `${SELECT_COLUMN_WIDTH}px ${gridTemplateColumns} ${ADD_COLUMN_WIDTH}px`;

  const fullTableMinWidth =
    SELECT_COLUMN_WIDTH + tableMinWidth + ADD_COLUMN_WIDTH;

  return {
    gridTemplateColumns,
    tableMinWidth,
    tableGridTemplateColumns,
    fullTableMinWidth,
  };
}