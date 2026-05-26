import { useCallback, useEffect, useRef } from "react";

import { TABLE_HEIGHT_PADDING } from "../services/tableConstants";

export default function useTableAutoHeight({
  block,
  onBlockUpdated,
  layoutControlled = false,
}) {
  const tableRef = useRef(null);
  const lastReportedHeightRef = useRef(0);

  const reportTableHeight = useCallback(() => {
    if (layoutControlled) return;
    if (!tableRef.current || !block?.id) return;

    const nextHeight = Math.ceil(
      tableRef.current.scrollHeight + TABLE_HEIGHT_PADDING
    );

    if (Math.abs(nextHeight - lastReportedHeightRef.current) < 2) return;

    lastReportedHeightRef.current = nextHeight;

    onBlockUpdated?.({
      ...block,
      settings: {
        ...(block.settings || {}),
        autoHeight: nextHeight,
      },
    });
  }, [block, layoutControlled, onBlockUpdated]);

  useEffect(() => {
    if (layoutControlled) return;
    if (!tableRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      reportTableHeight();
    });

    observer.observe(tableRef.current);

    return () => {
      observer.disconnect();
    };
  }, [layoutControlled, reportTableHeight]);

  const requestTableHeightReport = () => {
    requestAnimationFrame(reportTableHeight);
  };

  return {
    tableRef,
    reportTableHeight,
    requestTableHeightReport,
  };
}