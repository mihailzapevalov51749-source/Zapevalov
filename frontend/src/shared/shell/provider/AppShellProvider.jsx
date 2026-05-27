import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  readShellSidebarCollapsed,
  writeShellSidebarCollapsed,
} from "../useShellSidebarState";
import { createAppShellActionBridge } from "../actions/appShellActionBridge";
import { buildHeaderContract, buildSidebarContract } from "./appShellContracts";
import {
  APP_SHELL_ACTION_TYPES,
  appShellReducer,
  createInitialAppShellState,
} from "./appShellReducer";
import { SHELL_LOCAL_ACTION_KEYS } from "./appShellTypes";

/** @type {import('react').Context<import('./appShellTypes').AppShellContextValue | null>} */
export const AppShellContext = createContext(null);

/**
 * Canonical AppShell state owner (skeleton).
 * Not wired to PortalLayout / DesignerShell in Phase 6.6.
 *
 * @param {{
 *   mode?: import('./appShellTypes').AppShellMode;
 *   initialSources?: import('./appShellTypes').AppShellSources;
 *   children: import('react').ReactNode;
 * }} props
 */
export default function AppShellProvider({
  mode = "runtime",
  initialSources = {},
  children,
}) {
  const [sources, setSourcesState] = useState(initialSources);
  const stateRef = useRef(null);
  const sourcesRef = useRef(initialSources);
  const actionBridgeRef = useRef(null);

  const [state, dispatch] = useReducer(
    appShellReducer,
    createInitialAppShellState(mode, readShellSidebarCollapsed())
  );

  stateRef.current = state;
  sourcesRef.current = sources;

  if (!actionBridgeRef.current) {
    actionBridgeRef.current = createAppShellActionBridge({
      getState: () => stateRef.current,
      getSources: () => sourcesRef.current,
    });
  }

  useEffect(() => {
    dispatch({
      type: APP_SHELL_ACTION_TYPES.HYDRATE,
      payload: { collapsed: readShellSidebarCollapsed() },
    });
  }, []);

  useEffect(() => {
    writeShellSidebarCollapsed(state.collapsed);
  }, [state.collapsed]);

  const setSources = useCallback((next) => {
    setSourcesState((previous) =>
      typeof next === "function" ? next(previous) : next
    );
  }, []);

  const dispatchReducerAction = useCallback((actionKey, payload) => {
    switch (actionKey) {
      case SHELL_LOCAL_ACTION_KEYS.TOGGLE_COLLAPSE:
        dispatch({ type: APP_SHELL_ACTION_TYPES.TOGGLE_COLLAPSED });
        return true;

      case SHELL_LOCAL_ACTION_KEYS.SET_COLLAPSED:
        dispatch({
          type: APP_SHELL_ACTION_TYPES.SET_COLLAPSED,
          payload: { collapsed: Boolean(payload?.collapsed) },
        });
        return true;

      case SHELL_LOCAL_ACTION_KEYS.SET_MODE:
        dispatch({
          type: APP_SHELL_ACTION_TYPES.SET_MODE,
          payload: { mode: payload?.mode ?? "runtime" },
        });
        return true;

      case SHELL_LOCAL_ACTION_KEYS.SET_SEARCH_VALUE:
        dispatch({
          type: APP_SHELL_ACTION_TYPES.SET_SEARCH_VALUE,
          payload: { value: String(payload?.value ?? "") },
        });
        return true;

      case SHELL_LOCAL_ACTION_KEYS.SET_MENU_SCALE:
        dispatch({
          type: APP_SHELL_ACTION_TYPES.SET_MENU_SCALE,
          payload: { menuScale: Number(payload?.menuScale ?? 1) },
        });
        return true;

      case SHELL_LOCAL_ACTION_KEYS.SET_HEADER_PAGE_EDIT:
        dispatch({
          type: APP_SHELL_ACTION_TYPES.SET_HEADER_PAGE_EDIT,
          payload: { active: Boolean(payload?.active) },
        });
        return true;

      case SHELL_LOCAL_ACTION_KEYS.SET_SIDEBAR_MENU_EDIT:
        dispatch({
          type: APP_SHELL_ACTION_TYPES.SET_SIDEBAR_MENU_EDIT,
          payload: { active: Boolean(payload?.active) },
        });
        return true;

      case SHELL_LOCAL_ACTION_KEYS.SET_TITLE_EDITING:
        dispatch({
          type: APP_SHELL_ACTION_TYPES.SET_TITLE_EDITING,
          payload: {
            isEditing: Boolean(payload?.isEditing),
            draft:
              typeof payload?.draft === "string" ? payload.draft : undefined,
          },
        });
        return true;

      default:
        return false;
    }
  }, []);

  const dispatchAction = useCallback(
    (actionKey, payload, meta) => {
      const handledLocally = dispatchReducerAction(actionKey, payload);

      if (handledLocally) {
        return;
      }

      actionBridgeRef.current
        .dispatchAction(actionKey, payload, meta)
        .then((result) => {
          if (!result?.ok && import.meta.env.DEV) {
            console.debug(
              "[AppShellProvider] action unresolved (skeleton):",
              actionKey,
              payload,
              result
            );
          }
        });

      if (import.meta.env.DEV && !actionBridgeRef.current.hasAction(actionKey)) {
        console.debug("[AppShellProvider] unhandled action (skeleton):", actionKey, payload);
      }
    },
    [dispatchReducerAction]
  );

  const sidebarContract = useMemo(
    () => buildSidebarContract({ state, sources, dispatchAction }),
    [state, sources, dispatchAction]
  );

  const headerContract = useMemo(
    () => buildHeaderContract({ state, sources, dispatchAction }),
    [state, sources, dispatchAction]
  );

  const value = useMemo(
    () => ({
      state,
      sources,
      sidebarContract,
      headerContract,
      dispatchAction,
      setSources,
    }),
    [state, sources, sidebarContract, headerContract, dispatchAction, setSources]
  );

  return (
    <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
  );
}
