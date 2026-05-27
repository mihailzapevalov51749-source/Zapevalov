import { useCallback, useEffect, useState } from "react";

export const SHELL_SIDEBAR_COLLAPSED_KEY = "yasnopro-sidebar-collapsed";

export const SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT =
  "yasnopro:shell-sidebar-collapsed-changed";

export function readShellSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SHELL_SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeShellSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SHELL_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    // ignore storage errors
  }

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT, {
      detail: { collapsed },
    })
  );
}

type ShellSidebarCollapsedListener = (collapsed: boolean) => void;

let sharedSidebarCollapsed = readShellSidebarCollapsed();
const shellSidebarCollapsedListeners = new Set<ShellSidebarCollapsedListener>();

function publishShellSidebarCollapsed(next: boolean): void {
  if (sharedSidebarCollapsed === next) {
    return;
  }

  sharedSidebarCollapsed = next;
  writeShellSidebarCollapsed(next);
  shellSidebarCollapsedListeners.forEach((listener) => listener(next));
}

function subscribeShellSidebarCollapsed(
  listener: ShellSidebarCollapsedListener
): () => void {
  shellSidebarCollapsedListeners.add(listener);
  listener(sharedSidebarCollapsed);

  return () => {
    shellSidebarCollapsedListeners.delete(listener);
  };
}

export function useShellSidebarState() {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(
    sharedSidebarCollapsed
  );

  useEffect(() => subscribeShellSidebarCollapsed(setSidebarCollapsedState), []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key != null && event.key !== SHELL_SIDEBAR_COLLAPSED_KEY) {
        return;
      }

      publishShellSidebarCollapsed(readShellSidebarCollapsed());
    }

    function handleShellSidebarCollapsedChanged(event: Event) {
      const detail = (event as CustomEvent<{ collapsed?: boolean }>).detail;

      if (typeof detail?.collapsed === "boolean") {
        publishShellSidebarCollapsed(detail.collapsed);
        return;
      }

      publishShellSidebarCollapsed(readShellSidebarCollapsed());
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT,
      handleShellSidebarCollapsedChanged
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        SHELL_SIDEBAR_COLLAPSED_CHANGED_EVENT,
        handleShellSidebarCollapsedChanged
      );
    };
  }, []);

  const setSidebarCollapsed = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      const next =
        typeof value === "function" ? value(sharedSidebarCollapsed) : value;
      publishShellSidebarCollapsed(next);
    },
    []
  );

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((previous) => !previous);
  }, [setSidebarCollapsed]);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
  };
}
