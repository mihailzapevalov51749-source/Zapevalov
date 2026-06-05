import { useCallback, useRef, useState } from "react";

/**
 * Reusable dirty guard for view actions (switch, rename, delete, etc.).
 */
export default function useObjectViewDirtyGuard({
  isDirty = false,
  isBaseStateActive = false,
  viewName = "",
  onSave,
  onReset,
  onRequestSaveAsNew,
  saving = false,
}) {
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef(null);

  const runGuarded = useCallback(
    (action) => {
      if (typeof action !== "function") {
        return;
      }

      if (!isDirty) {
        action();
        return;
      }

      pendingActionRef.current = action;
      setOpen(true);
    },
    [isDirty],
  );

  const cancel = useCallback(() => {
    pendingActionRef.current = null;
    setOpen(false);
  }, []);

  const finish = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setOpen(false);
    action?.();
  }, []);

  const handleSave = useCallback(async () => {
    if (isBaseStateActive) {
      return;
    }

    const saved = await onSave?.();

    if (saved) {
      finish();
    }
  }, [isBaseStateActive, onSave, finish]);

  const handleDiscard = useCallback(() => {
    onReset?.();
    finish();
  }, [onReset, finish]);

  const handleSaveAsNew = useCallback(() => {
    // Hide guard while «Сохранить как новое» dialog is open; keep pending navigation.
    setOpen(false);
    onRequestSaveAsNew?.();
  }, [onRequestSaveAsNew]);

  const completeSaveAsNew = useCallback(() => {
    finish();
  }, [finish]);

  const cancelPendingNavigation = useCallback(() => {
    pendingActionRef.current = null;
  }, []);

  return {
    guardOpen: open,
    guardMode: isBaseStateActive ? "baseState" : "userView",
    guardViewName: String(viewName || "").trim() || "Представление",
    runGuarded,
    cancelGuard: cancel,
    handleGuardSave: handleSave,
    handleGuardDiscard: handleDiscard,
    handleGuardSaveAsNew: handleSaveAsNew,
    completeSaveAsNew,
    cancelPendingNavigation,
    saving,
  };
}
