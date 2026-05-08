import { useState } from "react";

export default function useTableDirtyState({
  activeRepresentationId,
  markRepresentationDirty,
}) {
  const [isBaseStateDirty, setIsBaseStateDirty] = useState(false);

  const markCurrentViewDirty = () => {
    window.__UNIVERSAL_TABLE_DIRTY__ = true;

    if (activeRepresentationId) {
      markRepresentationDirty?.();
      return;
    }

    setIsBaseStateDirty(true);
  };

  const clearDirty = () => {
    setIsBaseStateDirty(false);
    window.__UNIVERSAL_TABLE_DIRTY__ = false;
  };

  const markBaseStateDirty = () => {
    window.__UNIVERSAL_TABLE_DIRTY__ = true;
    setIsBaseStateDirty(true);
  };

  return {
    isBaseStateDirty,
    setIsBaseStateDirty,
    markCurrentViewDirty,
    markBaseStateDirty,
    clearDirty,
  };
}