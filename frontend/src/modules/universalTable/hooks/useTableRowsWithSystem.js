import { useMemo } from "react";

import {
  normalizeColumns,
  getPersistentRowNumber,
} from "../services/tableNormalization";

export default function useTableRowsWithSystem({
  rows = [],
  columnsWithSystem = [],
  visibleColumnsWithSystem = [],
  systemRowNumberColumnId,
}) {
  const normalizedColumnsWithSystem = useMemo(() => {
    return normalizeColumns(columnsWithSystem);
  }, [columnsWithSystem]);

  const normalizedVisibleColumnsWithSystem = useMemo(() => {
    return normalizeColumns(visibleColumnsWithSystem);
  }, [visibleColumnsWithSystem]);

  const rowsWithSystem = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    return rows.map((row) => ({
      ...row,
      values: {
        ...(row?.values || {}),

        [systemRowNumberColumnId]:
          getPersistentRowNumber(row),

        created_at:
          row?.values?.created_at ??
          row?.values?.createdAt ??
          row?.created_at ??
          row?.createdAt ??
          row?.created ??
          "",

        updated_at:
          row?.values?.updated_at ??
          row?.values?.updatedAt ??
          row?.values?.modified_at ??
          row?.values?.modifiedAt ??
          row?.updated_at ??
          row?.updatedAt ??
          row?.modified_at ??
          row?.modifiedAt ??
          "",
      },
    }));
  }, [rows, systemRowNumberColumnId]);

  return {
    normalizedColumnsWithSystem,
    normalizedVisibleColumnsWithSystem,
    rowsWithSystem,
  };
}