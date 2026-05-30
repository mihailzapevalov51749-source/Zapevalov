import { useCallback, useRef, useState } from "react";

/**
 * Reusable dirty guard for view actions (switch, rename, delete, etc.).
 */
export default function useObjectViewDirtyGuard({
  isDirty = false,
  onSave,
  onReset,
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
    const saved = await onSave?.();

    if (saved) {
      finish();
    }
  }, [onSave, finish]);

  const handleDiscard = useCallback(() => {
    onReset?.();
    finish();
  }, [onReset, finish]);

  return {
    guardOpen: open,
    runGuarded,
    cancelGuard: cancel,
    handleGuardSave: handleSave,
    handleGuardDiscard: handleDiscard,
    saving,
  };
}
