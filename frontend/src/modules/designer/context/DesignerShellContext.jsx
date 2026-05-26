import { createContext, useContext, useMemo } from "react";

const DesignerShellContext = createContext(null);

export function DesignerShellProvider({ value, children }) {
  const memoValue = useMemo(() => value, [value]);
  return (
    <DesignerShellContext.Provider value={memoValue}>
      {children}
    </DesignerShellContext.Provider>
  );
}

export function useDesignerShell() {
  const context = useContext(DesignerShellContext);

  if (!context) {
    throw new Error("useDesignerShell must be used within DesignerShellProvider");
  }

  return context;
}
