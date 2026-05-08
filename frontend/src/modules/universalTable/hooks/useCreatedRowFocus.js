import { useEffect, useState } from "react";

export default function useCreatedRowFocus({
  visibleRows = [],
  forcedVisibleRowIds,
  setForcedVisibleRowIds,
}) {
  const [createdRowFocusRequest, setCreatedRowFocusRequest] = useState(null);

  const registerCreatedRowFocus = ({ result, payloadOrEvent }) => {
    const newRow = result?.row || result;

    if (!newRow?.id) return;

    const rowId = String(newRow.id);

    setForcedVisibleRowIds?.((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });

    setCreatedRowFocusRequest({
      reason: "created-row",
      rowId,
      position: result?.position || payloadOrEvent?.position || "bottom",
      focusFirstCell: result?.focusFirstCell !== false,
      createdAt: Date.now(),
    });
  };

  const clearCreatedRowFocusRequest = () => {
    setCreatedRowFocusRequest(null);
  };

  useEffect(() => {
    if (createdRowFocusRequest?.reason !== "created-row") return;
    if (!createdRowFocusRequest?.rowId) return;

    const hasVisibleRow = visibleRows.some(
      (row) => String(row.id) === String(createdRowFocusRequest.rowId)
    );

    if (!hasVisibleRow) return;

    const frameId = requestAnimationFrame(() => {
      const rowElement = document.querySelector(
        `[data-universal-table-row-id="${createdRowFocusRequest.rowId}"]`
      );

      if (!rowElement) return;

      rowElement.scrollIntoView({
        block: createdRowFocusRequest.position === "top" ? "start" : "nearest",
        inline: "nearest",
        behavior: "smooth",
      });

      if (!createdRowFocusRequest.focusFirstCell) {
        setCreatedRowFocusRequest(null);
        return;
      }

      const firstInput = rowElement.querySelector(
        "[data-primary-cell-editor='true'] textarea, [data-primary-cell-editor='true'] input, textarea, input"
      );

      firstInput?.focus?.();
      firstInput?.select?.();

      setCreatedRowFocusRequest(null);
    });

    return () => cancelAnimationFrame(frameId);
  }, [createdRowFocusRequest, visibleRows]);

  const effectiveCreatedRowFocusRequest =
    createdRowFocusRequest?.reason === "created-row"
      ? createdRowFocusRequest
      : null;

  return {
    createdRowFocusRequest,
    effectiveCreatedRowFocusRequest,

    forcedVisibleRowIds,
    setForcedVisibleRowIds,

    registerCreatedRowFocus,
    clearCreatedRowFocusRequest,
  };
}