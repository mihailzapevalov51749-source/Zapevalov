import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { usePageLayoutContract } from "./pageLayoutContract/PageLayoutContractContext.jsx";

const AppShellPageActionsContext = createContext(null);

function resolveActiveToolbarSlots(slotStacks) {
  const resolved = {};

  for (const [slotId, stack] of Object.entries(slotStacks)) {
    if (!Array.isArray(stack) || stack.length === 0) {
      continue;
    }

    const activeElement = stack[stack.length - 1]?.element ?? null;

    if (activeElement) {
      resolved[slotId] = activeElement;
    }
  }

  return resolved;
}

export function AppShellPageActionsProvider({ children }) {
  const [registration, setRegistration] = useState(null);
  const [toolbarSlots, setToolbarSlots] = useState({});
  const slotStacksRef = useRef({});

  const syncToolbarSlots = useCallback(() => {
    setToolbarSlots(resolveActiveToolbarSlots(slotStacksRef.current));
  }, []);

  const registerPageActions = useCallback((config) => {
    setRegistration(config);

    return () => {
      setRegistration((current) => (current === config ? null : current));
    };
  }, []);

  const registerToolbarSlot = useCallback(
    (ownerId, slotId, element) => {
      const normalizedOwnerId = String(ownerId || "").trim();
      const normalizedSlotId = String(slotId || "").trim();

      if (!normalizedOwnerId || !normalizedSlotId) {
        return () => undefined;
      }

      const stacks = slotStacksRef.current;

      if (!stacks[normalizedSlotId]) {
        stacks[normalizedSlotId] = [];
      }

      const stack = stacks[normalizedSlotId];
      const existingIndex = stack.findIndex((entry) => entry.ownerId === normalizedOwnerId);

      if (existingIndex >= 0) {
        stack[existingIndex] = {
          ownerId: normalizedOwnerId,
          element,
        };
      } else {
        stack.push({
          ownerId: normalizedOwnerId,
          element,
        });
      }

      syncToolbarSlots();

      return () => {
        const currentStack = slotStacksRef.current[normalizedSlotId];

        if (!Array.isArray(currentStack)) {
          return;
        }

        slotStacksRef.current[normalizedSlotId] = currentStack.filter(
          (entry) => entry.ownerId !== normalizedOwnerId,
        );

        if (slotStacksRef.current[normalizedSlotId].length === 0) {
          delete slotStacksRef.current[normalizedSlotId];
        }

        syncToolbarSlots();
      };
    },
    [syncToolbarSlots],
  );

  const value = useMemo(
    () => ({
      registration,
      toolbarSlots,
      registerPageActions,
      registerToolbarSlot,
    }),
    [registration, toolbarSlots, registerPageActions, registerToolbarSlot],
  );

  return (
    <AppShellPageActionsContext.Provider value={value}>
      {children}
    </AppShellPageActionsContext.Provider>
  );
}

export function useAppShellPageActions() {
  const context = useContext(AppShellPageActionsContext);

  if (!context) {
    throw new Error(
      "useAppShellPageActions must be used within AppShellPageActionsProvider",
    );
  }

  return context;
}

export function AppShellPageActionsSlot({
  slotId,
  className = "",
}) {
  const ownerId = useId();
  const { registerToolbarSlot } = useAppShellPageActions();
  const slotRef = useRef(null);

  useLayoutEffect(() => {
    return registerToolbarSlot(ownerId, slotId, slotRef.current);
  }, [ownerId, slotId, registerToolbarSlot]);

  return (
    <div
      ref={slotRef}
      className={["page-toolbar-actions__slot", "app-shell-page-actions-slot", className]
        .filter(Boolean)
        .join(" ")}
      data-app-shell-page-actions-slot={slotId}
    />
  );
}

export function AppShellPageActions({ children }) {
  const { registerPageActions } = useAppShellPageActions();

  useEffect(() => {
    return registerPageActions({
      content: children,
    });
  }, [children, registerPageActions]);

  return null;
}

export function AppShellPageActionsHost() {
  const { registration, toolbarSlots } = useAppShellPageActions();
  const { contract } = usePageLayoutContract();

  const toolbarZoneId = String(contract?.toolbarZoneId || "").trim();
  const slotElement = toolbarZoneId ? toolbarSlots[toolbarZoneId] : null;

  if (!registration?.content || !contract?.canMinimize || !toolbarZoneId || !slotElement) {
    return null;
  }

  return createPortal(
    <div
      className="page-toolbar-actions__workspace-tabs app-shell-page-actions"
      data-app-shell-page-actions-host
    >
      {registration.content}
    </div>,
    slotElement,
  );
}
