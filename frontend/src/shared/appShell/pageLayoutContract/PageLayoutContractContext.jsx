import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";

import { useLocation } from "react-router-dom";

import { useGlobalWorkspaceTabs } from "../../workspaceTabs/GlobalWorkspaceTabsProvider";

import { resolvePageLayoutContract } from "./resolvePageLayoutContract.js";

const PageLayoutContractContext = createContext(null);

function resolveActiveContract(stack) {
  if (!Array.isArray(stack) || stack.length === 0) {
    return null;
  }

  return stack[stack.length - 1]?.contract ?? null;
}

export function PageLayoutContractProvider({ children }) {
  const stackRef = useRef([]);
  const [contract, setContract] = useState(null);

  const registerContract = useCallback((ownerId, nextContract) => {
    const normalizedOwnerId = String(ownerId || "").trim();

    if (!normalizedOwnerId || !nextContract) {
      return;
    }

    const stack = stackRef.current;
    const existingIndex = stack.findIndex((entry) => entry.ownerId === normalizedOwnerId);

    if (existingIndex >= 0) {
      stack[existingIndex] = {
        ownerId: normalizedOwnerId,
        contract: nextContract,
      };
    } else {
      stack.push({
        ownerId: normalizedOwnerId,
        contract: nextContract,
      });
    }

    setContract(resolveActiveContract(stack));
  }, []);

  const unregisterContract = useCallback((ownerId) => {
    const normalizedOwnerId = String(ownerId || "").trim();

    if (!normalizedOwnerId) {
      return;
    }

    const stack = stackRef.current;
    const nextStack = stack.filter((entry) => entry.ownerId !== normalizedOwnerId);
    stackRef.current = nextStack;
    setContract(resolveActiveContract(nextStack));
  }, []);

  const value = useMemo(
    () => ({
      contract,
      registerContract,
      unregisterContract,
    }),
    [contract, registerContract, unregisterContract],
  );

  return (
    <PageLayoutContractContext.Provider value={value}>
      {children}
    </PageLayoutContractContext.Provider>
  );
}

function usePageLayoutContractContext() {
  const context = useContext(PageLayoutContractContext);

  if (!context) {
    throw new Error(
      "Page layout contract hooks must be used within PageLayoutContractProvider",
    );
  }

  return context;
}

export function usePageLayoutContract() {
  const { contract } = usePageLayoutContractContext();

  return { contract };
}

/**
 * @param {import('./pageLayoutContractTypes.js').PageLayoutContract | null | undefined} contract
 */
export function useRegisterPageLayoutContract(contract) {
  const ownerId = useId();
  const { registerContract, unregisterContract } = usePageLayoutContractContext();

  useLayoutEffect(() => {
    if (!contract) {
      return undefined;
    }

    registerContract(ownerId, contract);

    return () => {
      unregisterContract(ownerId);
    };
  }, [contract, ownerId, registerContract, unregisterContract]);
}

/**
 * Resolve contract from route + workspace descriptor and register it for the current page.
 *
 * @param {Partial<import('./pageLayoutContractTypes.js').PageLayoutContract>} [overrides]
 */
export function useResolvedPageLayoutContract(overrides = {}) {
  const location = useLocation();
  const { currentDescriptor } = useGlobalWorkspaceTabs();

  const overridesKey = JSON.stringify(overrides ?? {});

  const contract = useMemo(
    () => resolvePageLayoutContract(location, currentDescriptor, JSON.parse(overridesKey)),
    [location.pathname, location.search, location.hash, currentDescriptor, overridesKey],
  );

  useRegisterPageLayoutContract(contract);

  return contract;
}
