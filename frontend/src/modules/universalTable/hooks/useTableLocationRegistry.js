import { useEffect } from "react";

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

    if (
      !window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__
    ) {
      window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__ =
        {
          tables: {},
          files: {},
        };
    }

    if (
      !window
        .__YASNOPRO_ENTITY_LOCATION_REGISTRY__
        .tables
    ) {
      window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.tables =
        {};
    }

    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__.tables[
      currentTableId
    ] = {
      tableId: currentTableId,

      blockId: currentBlockId,

      pageId:
        window.location.pathname || "",

      originalTableId:
        table?.id || tableId || null,
    };
  }, [
    table?.id,
    tableId,
    resolvedBlockId,
  ]);
}