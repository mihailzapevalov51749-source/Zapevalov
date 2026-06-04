import { useEffect, useMemo, useRef, useState } from "react";

import { enrichTableRowsWithRelationFields } from "../../services/enrichTableRowsWithRelationFields";
import { preloadRelationFieldStatesForPage } from "../../services/preloadRelationFieldStatesForPage";

/**
 * Page-level relation field preload for Object Table (no per-cell fetch).
 */
export default function useRelationTableEnrichment({
  tenantId = null,
  rows = [],
  columns = [],
  relationColumns = [],
  enabled = true,
}) {
  const [relationStateByKey, setRelationStateByKey] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  const entityIds = useMemo(
    () =>
      rows
        .map((row) => String(row?.id ?? "").trim())
        .filter(Boolean),
    [rows],
  );

  const relationFieldKeys = useMemo(
    () => new Set(relationColumns.map((column) => String(column.key || "").trim())),
    [relationColumns],
  );

  const fetchSignature = useMemo(
    () =>
      JSON.stringify({
        tenantId,
        entityIds,
        relationKeys: [...relationFieldKeys].sort(),
      }),
    [tenantId, entityIds, relationFieldKeys],
  );

  useEffect(() => {
    if (!enabled || !relationColumns.length || !entityIds.length || !tenantId) {
      setRelationStateByKey(new Map());
      setLoading(false);
      return undefined;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const nextMap = await preloadRelationFieldStatesForPage({
          tenantId,
          entityIds,
          relationColumns,
        });

        if (!cancelled && requestRef.current === requestId) {
          setRelationStateByKey(nextMap);
        }
      } finally {
        if (!cancelled && requestRef.current === requestId) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, fetchSignature, tenantId, entityIds, relationColumns]);

  const enrichedRows = useMemo(
    () =>
      enrichTableRowsWithRelationFields(
        rows,
        columns,
        relationStateByKey,
        relationFieldKeys,
      ),
    [rows, columns, relationStateByKey, relationFieldKeys],
  );

  return {
    enrichedRows,
    relationStateByKey,
    loading,
  };
}
