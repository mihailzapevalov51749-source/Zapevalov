import { useEffect, useState } from "react";

export default function useTableDirtyState({
  resolvedBlockId,
  tableId,
}) {
  const [isRepresentationDirty, setIsRepresentationDirty] = useState(false);

  const handleMarkDirty = () => {
    if (!resolvedBlockId) return;

    setIsRepresentationDirty(true);
    window.__UNIVERSAL_TABLE_DIRTY__ = true;

    window.dispatchEvent(
      new CustomEvent("universal-table:mark-dirty", {
        detail: {
          blockId: resolvedBlockId,
          tableId: tableId || null,
        },
      })
    );
  };

  useEffect(() => {
    if (!isRepresentationDirty) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRepresentationDirty]);

  return {
    isRepresentationDirty,
    setIsRepresentationDirty,
    handleMarkDirty,
  };
}