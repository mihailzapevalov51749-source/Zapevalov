import { useEffect, useState } from "react";
import { markTableSessionDirty } from "../session/tableSessionStore";

export default function useTableDirtyState({
  resolvedBlockId,
  tableId,
}) {
  const [isRepresentationDirty, setIsRepresentationDirty] = useState(false);

  const handleMarkDirty = () => {
    if (!resolvedBlockId) return;

    setIsRepresentationDirty(true);
    markTableSessionDirty({
      tableId,
      blockId: resolvedBlockId,
    });

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