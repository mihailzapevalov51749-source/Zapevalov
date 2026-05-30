import { useEffect } from "react";
import { setEntityLocationRegistryEntry } from "../../navigation/entityLocationRegistry";

import {
  normalizeId,
} from "../services/tableNormalization";

export default function useTableLocationRegistry({
  table,
  tableId,
  resolvedBlockId,
}) {
  useEffect(() => {
    if (!table?.id) return;

    const currentTableId = normalizeId(
      table.id
    );

    const currentBlockId = normalizeId(
      resolvedBlockId
    );

    setEntityLocationRegistryEntry(`tables.${currentTableId}`, {
      tableId: currentTableId,

      blockId: currentBlockId,

      pageId:
        window.location.pathname || "",

      originalTableId:
        table?.id || tableId || null,
    });
  }, [
    table?.id,
    tableId,
    resolvedBlockId,
  ]);
}