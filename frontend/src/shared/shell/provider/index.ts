/**
 * AppShellProvider — canonical shell state owner (Phase 6.6 skeleton).
 * Not imported by production layouts until shadow integration (Phase 6.8).
 */

export { default as AppShellProvider, AppShellContext } from "./AppShellProvider";
export { useAppShell } from "./useAppShell";

export {
  APP_SHELL_ACTION_TYPES,
  appShellReducer,
  createInitialAppShellState,
} from "./appShellReducer";

export {
  buildHeaderContract,
  buildSidebarContract,
} from "./appShellContracts";

export {
  SHELL_LOCAL_ACTION_KEYS,
  defaultCapabilitiesForMode,
} from "./appShellTypes";

export {
  createAppShellActionBridge,
  createAppShellActionRegistry,
  APP_SHELL_ACTION_KEYS,
  APP_SHELL_LEGACY_ACTION_KEY_ALIASES,
  normalizeAppShellActionKey,
  isCanonicalAppShellActionKey,
} from "../actions";

export type {
  AppShellActionHandler,
  AppShellActionRegistry,
  AppShellActionPayload,
  AppShellCapabilitiesState,
  AppShellContextValue,
  AppShellDispatchContext,
  AppShellEditModeState,
  AppShellGeometryState,
  AppShellMode,
  AppShellNavigationState,
  AppShellNotificationsState,
  AppShellSearchState,
  AppShellSources,
  AppShellState,
  AppShellTitleEditState,
} from "./appShellTypes";
