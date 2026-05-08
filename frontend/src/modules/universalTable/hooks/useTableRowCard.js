import { useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_ROW_CARD_SETTINGS = {
  width: 520,
  maxHeight: "80vh",
  layout: "one_column",
  titleMode: "default",
  customTitle: "",
  visibleColumnIds: [],
  columnOrder: [],
};

export const normalizeRowCardSettings = (settings) => ({
  ...DEFAULT_ROW_CARD_SETTINGS,
  ...(settings || {}),
});

export default function useTableRowCard({
  rows = [],
  tableId,
  blockId,
  isInlineEditMode,
  closeColumnMenu,
}) {
  const shouldOpenCreatedRowCardRef = useRef(false);
  const previousRowIdsRef = useRef(new Set());

  const cardInstanceIdRef = useRef(
    `universal-table-row-card-${
      tableId || blockId || "unknown"
    }-${Date.now()}-${Math.random()}`
  );

  const [openedRowData, setOpenedRowData] = useState(null);

  const activeOpenedRow = useMemo(() => {
    if (!openedRowData?.rowId) return null;

    return (
      rows.find((row) => String(row.id) === String(openedRowData.rowId)) ||
      null
    );
  }, [rows, openedRowData]);

  const openRowCardByRow = (row, anchorRect = null) => {
    if (isInlineEditMode) return;
    if (!row?.id) return;

    closeColumnMenu?.();

    window.dispatchEvent(
      new CustomEvent("universal-table-row-card-opened", {
        detail: {
          instanceId: cardInstanceIdRef.current,
        },
      })
    );

    setOpenedRowData({
      rowId: row.id,
      anchorRect,
    });
  };

  const handleOpenRowCard = (row, event) => {
    if (isInlineEditMode) return;
    if (!row?.id) return;

    openRowCardByRow(
      row,
      event?.currentTarget?.getBoundingClientRect?.() || null
    );
  };

  const handleCloseRowCard = () => {
    setOpenedRowData(null);
  };

  const markShouldOpenCreatedRowCard = () => {
    shouldOpenCreatedRowCardRef.current = true;
  };

  const clearShouldOpenCreatedRowCard = () => {
    shouldOpenCreatedRowCardRef.current = false;
  };

  useEffect(() => {
    previousRowIdsRef.current = new Set(rows.map((row) => String(row.id)));
  }, []);

  useEffect(() => {
    if (!shouldOpenCreatedRowCardRef.current) {
      previousRowIdsRef.current = new Set(rows.map((row) => String(row.id)));
      return;
    }

    const previousRowIds = previousRowIdsRef.current;

    const createdRow =
      rows.find((row) => !previousRowIds.has(String(row.id))) ||
      rows[rows.length - 1] ||
      null;

    previousRowIdsRef.current = new Set(rows.map((row) => String(row.id)));

    if (!createdRow) return;

    shouldOpenCreatedRowCardRef.current = false;
    openRowCardByRow(createdRow);
  }, [rows]);

  useEffect(() => {
    const handleExternalRowCardOpen = (event) => {
      const openedInstanceId = event.detail?.instanceId;

      if (openedInstanceId !== cardInstanceIdRef.current) {
        setOpenedRowData(null);
      }
    };

    window.addEventListener(
      "universal-table-row-card-opened",
      handleExternalRowCardOpen
    );

    return () => {
      window.removeEventListener(
        "universal-table-row-card-opened",
        handleExternalRowCardOpen
      );
    };
  }, []);

  useEffect(() => {
    if (!openedRowData?.rowId) return;

    const rowExists = rows.some(
      (row) => String(row.id) === String(openedRowData.rowId)
    );

    if (!rowExists) {
      setOpenedRowData(null);
    }
  }, [rows, openedRowData]);

  useEffect(() => {
    if (isInlineEditMode) {
      setOpenedRowData(null);
    }
  }, [isInlineEditMode]);

  return {
    openedRowData,
    activeOpenedRow,

    openRowCardByRow,
    handleOpenRowCard,
    handleCloseRowCard,

    markShouldOpenCreatedRowCard,
    clearShouldOpenCreatedRowCard,
  };
}