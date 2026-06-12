import { createContext, useCallback, useMemo, useRef, useState } from "react";

import PlatformConfirmModal from "./PlatformConfirmModal";

export const PlatformConfirmContext = createContext(null);

const EMPTY_OPTIONS = {
  title: "",
  message: "",
  description: "",
  confirmLabel: undefined,
  cancelLabel: undefined,
  variant: "default",
  loading: false,
};

export default function PlatformConfirmProvider({ children }) {
  const resolverRef = useRef(null);
  const [state, setState] = useState({
    open: false,
    options: EMPTY_OPTIONS,
    loading: false,
  });

  const finish = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;

    setState({
      open: false,
      options: EMPTY_OPTIONS,
      loading: false,
    });

    resolve?.(result);
  }, []);

  const confirm = useCallback((options = {}) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        options: {
          title: String(options.title || "").trim(),
          message: options.message ?? "",
          description: options.description ?? "",
          confirmLabel: options.confirmLabel,
          cancelLabel: options.cancelLabel,
          variant: options.variant || "default",
        },
        loading: false,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    finish(true);
  }, [finish]);

  const handleCancel = useCallback(() => {
    finish(false);
  }, [finish]);

  const contextValue = useMemo(() => confirm, [confirm]);

  return (
    <PlatformConfirmContext.Provider value={contextValue}>
      {children}
      <PlatformConfirmModal
        open={state.open}
        title={state.options.title}
        message={state.options.message}
        description={state.options.description}
        confirmLabel={state.options.confirmLabel}
        cancelLabel={state.options.cancelLabel}
        variant={state.options.variant}
        loading={state.loading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </PlatformConfirmContext.Provider>
  );
}
