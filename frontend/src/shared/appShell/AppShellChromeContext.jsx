import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const DEFAULT_CHROME = {
  hasPlatformChrome: false,
  workspaceLeftOffset: 0,
  shellHeaderHeight: 0,
};

const AppShellChromeContext = createContext(null);

function resolveActiveChrome(stack) {
  if (!Array.isArray(stack) || stack.length === 0) {
    return DEFAULT_CHROME;
  }

  const activePatch = stack[stack.length - 1]?.patch;

  if (!activePatch) {
    return DEFAULT_CHROME;
  }

  return {
    ...DEFAULT_CHROME,
    ...activePatch,
    hasPlatformChrome: true,
  };
}

export function AppShellChromeProvider({ children }) {
  const stackRef = useRef([]);
  const [chrome, setChrome] = useState(DEFAULT_CHROME);

  const registerChrome = useCallback((ownerId, patch) => {
    const normalizedOwnerId = String(ownerId || "").trim();

    if (!normalizedOwnerId || !patch) {
      return;
    }

    const stack = stackRef.current;
    const existingIndex = stack.findIndex((entry) => entry.ownerId === normalizedOwnerId);

    if (existingIndex >= 0) {
      stack[existingIndex] = {
        ownerId: normalizedOwnerId,
        patch,
      };
    } else {
      stack.push({
        ownerId: normalizedOwnerId,
        patch,
      });
    }

    setChrome(resolveActiveChrome(stack));
  }, []);

  const unregisterChrome = useCallback((ownerId) => {
    const normalizedOwnerId = String(ownerId || "").trim();

    if (!normalizedOwnerId) {
      return;
    }

    const stack = stackRef.current;
    const nextStack = stack.filter((entry) => entry.ownerId !== normalizedOwnerId);
    stackRef.current = nextStack;
    setChrome(resolveActiveChrome(nextStack));
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      registerChrome,
      unregisterChrome,
    }),
    [chrome, registerChrome, unregisterChrome],
  );

  return (
    <AppShellChromeContext.Provider value={value}>
      {children}
    </AppShellChromeContext.Provider>
  );
}

export function useAppShellChrome() {
  const context = useContext(AppShellChromeContext);

  if (!context) {
    throw new Error("useAppShellChrome must be used within AppShellChromeProvider");
  }

  return context;
}

export function useRegisterAppShellChrome({
  hasPlatformChrome = false,
  workspaceLeftOffset = 0,
  shellHeaderHeight = 0,
}) {
  const ownerId = useId();
  const { registerChrome, unregisterChrome } = useAppShellChrome();

  useEffect(() => {
    if (!hasPlatformChrome) {
      return undefined;
    }

    registerChrome(ownerId, {
      hasPlatformChrome: true,
      workspaceLeftOffset,
      shellHeaderHeight: Math.max(0, Number(shellHeaderHeight) || 0),
    });

    return () => {
      unregisterChrome(ownerId);
    };
  }, [
    hasPlatformChrome,
    workspaceLeftOffset,
    shellHeaderHeight,
    ownerId,
    registerChrome,
    unregisterChrome,
  ]);
}
