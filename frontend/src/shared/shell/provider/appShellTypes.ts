import type { AppHeaderContract } from "../header/headerContracts";
import type { HeaderMode } from "../header/headerTypes";
import type { AppSidebarContract } from "../sidebar/sidebarContracts";
import type { SidebarMode } from "../sidebar/sidebarTypes";

export type AppShellMode = SidebarMode;

export type AppShellEditModeState = {
  sidebarMenu: boolean;
  headerPage: boolean;
  titleEditing: boolean;
};

export type AppShellSearchState = {
  value: string;
  enabled: boolean;
};

export type AppShellNotificationsState = {
  unreadCount: number;
  enabled: boolean;
};

export type AppShellTitleEditState = {
  draft: string;
  isEditing: boolean;
};

export type AppShellCapabilitiesState = {
  canSearch: boolean;
  canEditPage: boolean;
  canEditTitle: boolean;
  canViewNotifications: boolean;
  canOpenSettings: boolean;
  canUsePageActions: boolean;
  canSwitchMode: boolean;
  canEditMenu: boolean;
  canCreateItem: boolean;
  canDragItems: boolean;
  canScaleMenu: boolean;
};

export type AppShellNavigationState = {
  activeItemId?: string;
  activePageId?: string | number;
  expandedItemIds: string[];
};

export type AppShellGeometryState = {
  sidebarWidth: number;
  workspaceLeftOffset: number;
  workspaceTopOffset: number;
};

/**
 * Opaque external inputs — provider reads but does not own business data.
 */
export type AppShellSources = {
  pathname?: string;
  tenantId?: string | number;
  navigationItems?: unknown[];
  page?: unknown;
  portal?: unknown;
  user?: Record<string, unknown>;
  tenant?: Record<string, unknown>;
  designerActiveKey?: string;
  title?: string;
  subtitle?: string;
  breadcrumbs?: unknown[];
};

export type AppShellState = {
  mode: AppShellMode;
  collapsed: boolean;
  navigation: AppShellNavigationState;
  editMode: AppShellEditModeState;
  search: AppShellSearchState;
  notifications: AppShellNotificationsState;
  titleEdit: AppShellTitleEditState;
  menuScale: number;
  capabilities: AppShellCapabilitiesState;
  geometry: AppShellGeometryState;
  meta: {
    hydrated: boolean;
  };
};

export type AppShellActionPayload = Record<string, unknown> | undefined;

export type AppShellDispatchContext = {
  state: AppShellState;
  sources: AppShellSources;
};

export type AppShellActionHandler = (
  payload: AppShellActionPayload,
  context: AppShellDispatchContext
) => void;

export type AppShellActionRegistry = Record<string, AppShellActionHandler>;

export type AppShellContextValue = {
  state: AppShellState;
  sources: AppShellSources;
  sidebarContract: AppSidebarContract | null;
  headerContract: AppHeaderContract | null;
  dispatchAction: (actionKey: string, payload?: AppShellActionPayload) => void;
  setSources: (next: AppShellSources | ((prev: AppShellSources) => AppShellSources)) => void;
};

export const SHELL_LOCAL_ACTION_KEYS = {
  TOGGLE_COLLAPSE: "shell.sidebar.toggle-collapse",
  SET_COLLAPSED: "shell.sidebar.set-collapsed",
  SET_MODE: "shell.set-mode",
  SET_SEARCH_VALUE: "shell.header.search.set-value",
  SET_MENU_SCALE: "shell.sidebar.set-menu-scale",
  SET_HEADER_PAGE_EDIT: "shell.edit.header-page",
  SET_SIDEBAR_MENU_EDIT: "shell.edit.sidebar-menu",
  SET_TITLE_EDITING: "shell.edit.title-editing",
} as const;

export function defaultCapabilitiesForMode(
  mode: AppShellMode
): AppShellCapabilitiesState {
  if (mode === "designer") {
    return {
      canSearch: false,
      canEditPage: false,
      canEditTitle: false,
      canViewNotifications: false,
      canOpenSettings: false,
      canUsePageActions: false,
      canSwitchMode: true,
      canEditMenu: false,
      canCreateItem: false,
      canDragItems: false,
      canScaleMenu: false,
    };
  }

  return {
    canSearch: true,
    canEditPage: true,
    canEditTitle: true,
    canViewNotifications: true,
    canOpenSettings: true,
    canUsePageActions: true,
    canSwitchMode: true,
    canEditMenu: true,
    canCreateItem: true,
    canDragItems: true,
    canScaleMenu: true,
  };
}

export function modeToHeaderMode(mode: AppShellMode): HeaderMode {
  return mode;
}
