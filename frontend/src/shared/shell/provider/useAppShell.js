import { useContext } from "react";

import { AppShellContext } from "./AppShellProvider";

/**
 * Consumer hook for AppShellProvider.
 * Not used in production layouts until Phase 6.8+.
 */
export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }

  return context;
}
