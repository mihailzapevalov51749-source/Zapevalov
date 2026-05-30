import { useState } from "react";
import {
  clearTableSessionDirty,
  markTableSessionDirty,
} from "../../universalTable/session/tableSessionStore";

export default function useTableDirtyState({
  activeRepresentationId,
  markRepresentationDirty,
}) {
  const [isBaseStateDirty, setIsBaseStateDirty] = useState(false);

  const markCurrentViewDirty = () => {
    markTableSessionDirty();

    if (activeRepresentationId) {
      markRepresentationDirty?.();
      return;
    }

    setIsBaseStateDirty(true);
  };

  const clearDirty = () => {
    setIsBaseStateDirty(false);
    clearTableSessionDirty();
  };

  const markBaseStateDirty = () => {
    markTableSessionDirty();
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