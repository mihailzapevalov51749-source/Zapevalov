import { createContext, useContext, useMemo } from "react";

import { SHELL_LAYOUT_MODE } from "./shellLayoutMode.js";

const ShellLayoutModeContext = createContext(SHELL_LAYOUT_MODE.SHELL);

export function ShellLayoutModeProvider({ mode = SHELL_LAYOUT_MODE.SHELL, children }) {
  const value = useMemo(
    () =>
      mode === SHELL_LAYOUT_MODE.EMBEDDED
        ? SHELL_LAYOUT_MODE.EMBEDDED
        : SHELL_LAYOUT_MODE.SHELL,
    [mode],
  );

  return (
    <ShellLayoutModeContext.Provider value={value}>
      {children}
    </ShellLayoutModeContext.Provider>
  );
}

export function useShellLayoutMode() {
  return useContext(ShellLayoutModeContext);
}
