import { useState } from "react";

export default function useTableEntityCardNavigation({
  rows = [],
  activeOpenedRow,
  handleOpenRowCard,
  handleCloseRowCard,
}) {
  const [notificationContext, setNotificationContext] = useState(null);
  const [rowCardHistory, setRowCardHistory] = useState([]);

  const handleOpenBaseRowCard = (row) => {
    setNotificationContext(null);
    setRowCardHistory([]);
    handleOpenRowCard?.(row);
  };

  const handleCloseEntityCard = () => {
    const shouldReturnToPreviousLocation = Boolean(notificationContext?.source);

    setNotificationContext(null);
    setRowCardHistory([]);
    handleCloseRowCard?.();

    if (shouldReturnToPreviousLocation) {
      window.dispatchEvent(new CustomEvent("yasnopro:navigation:return"));
    }
  };

  const handleOpenRelatedRow = (relatedRowOrId) => {
    const relatedRowId =
      relatedRowOrId?.id ||
      relatedRowOrId?.rowId ||
      relatedRowOrId?.row_id ||
      relatedRowOrId;

    if (!relatedRowId) return;

    const targetRow =
      rows.find((row) => String(row?.id) === String(relatedRowId)) || null;

    if (!targetRow) return;

    setNotificationContext(null);

    setRowCardHistory((prev) => {
      if (!activeOpenedRow) return prev;

      const currentRowId = String(activeOpenedRow?.id || "");
      const targetRowId = String(targetRow?.id || "");

      if (currentRowId && currentRowId === targetRowId) return prev;

      return [...prev, activeOpenedRow];
    });

    handleOpenRowCard?.(targetRow);
  };

  const handleBackRowCard = () => {
    if (!rowCardHistory.length) {
      handleCloseEntityCard();
      return;
    }

    const previousRow = rowCardHistory[rowCardHistory.length - 1];

    setNotificationContext(null);
    setRowCardHistory((prev) => prev.slice(0, -1));
    handleOpenRowCard?.(previousRow);
  };

  return {
    notificationContext,
    setNotificationContext,
    rowCardHistory,
    setRowCardHistory,
    handleOpenBaseRowCard,
    handleCloseEntityCard,
    handleOpenRelatedRow,
    handleBackRowCard,
  };
}