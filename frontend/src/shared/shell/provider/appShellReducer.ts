import { resolveAppSidebarWidth } from "../shellSidebarGeometry";
import {
  defaultCapabilitiesForMode,
  type AppShellMode,
  type AppShellState,
} from "./appShellTypes";

export const APP_SHELL_ACTION_TYPES = {
  HYDRATE: "appShell/hydrate",
  SET_COLLAPSED: "appShell/setCollapsed",
  TOGGLE_COLLAPSED: "appShell/toggleCollapsed",
  SET_MODE: "appShell/setMode",
  SET_SEARCH_VALUE: "appShell/setSearchValue",
  SET_MENU_SCALE: "appShell/setMenuScale",
  SET_HEADER_PAGE_EDIT: "appShell/setHeaderPageEdit",
  SET_SIDEBAR_MENU_EDIT: "appShell/setSidebarMenuEdit",
  SET_TITLE_EDITING: "appShell/setTitleEditing",
  SET_ACTIVE_NAV: "appShell/setActiveNav",
  SET_NOTIFICATIONS: "appShell/setNotifications",
} as const;

export type AppShellReducerAction =
  | { type: typeof APP_SHELL_ACTION_TYPES.HYDRATE; payload: { collapsed: boolean } }
  | { type: typeof APP_SHELL_ACTION_TYPES.SET_COLLAPSED; payload: { collapsed: boolean } }
  | { type: typeof APP_SHELL_ACTION_TYPES.TOGGLE_COLLAPSED }
  | { type: typeof APP_SHELL_ACTION_TYPES.SET_MODE; payload: { mode: AppShellMode } }
  | { type: typeof APP_SHELL_ACTION_TYPES.SET_SEARCH_VALUE; payload: { value: string } }
  | { type: typeof APP_SHELL_ACTION_TYPES.SET_MENU_SCALE; payload: { menuScale: number } }
  | { type: typeof APP_SHELL_ACTION_TYPES.SET_HEADER_PAGE_EDIT; payload: { active: boolean } }
  | { type: typeof APP_SHELL_ACTION_TYPES.SET_SIDEBAR_MENU_EDIT; payload: { active: boolean } }
  | { type: typeof APP_SHELL_ACTION_TYPES.SET_TITLE_EDITING; payload: { isEditing: boolean; draft?: string } }
  | {
      type: typeof APP_SHELL_ACTION_TYPES.SET_ACTIVE_NAV;
      payload: { activeItemId?: string; activePageId?: string | number };
    }
  | {
      type: typeof APP_SHELL_ACTION_TYPES.SET_NOTIFICATIONS;
      payload: { unreadCount?: number; enabled?: boolean };
    };

function resolveGeometry(collapsed: boolean) {
  const sidebarWidth = resolveAppSidebarWidth(collapsed);

  return {
    sidebarWidth,
    workspaceLeftOffset: sidebarWidth,
    workspaceTopOffset: 56,
  };
}

export function createInitialAppShellState(
  mode: AppShellMode = "runtime",
  collapsed = false
): AppShellState {
  return {
    mode,
    collapsed,
    navigation: {
      activeItemId: undefined,
      activePageId: undefined,
      expandedItemIds: [],
    },
    editMode: {
      sidebarMenu: false,
      headerPage: false,
      titleEditing: false,
    },
    search: {
      value: "",
      enabled: mode !== "designer",
    },
    notifications: {
      unreadCount: 0,
      enabled: mode !== "designer",
    },
    titleEdit: {
      draft: "",
      isEditing: false,
    },
    menuScale: 1,
    capabilities: defaultCapabilitiesForMode(mode),
    geometry: resolveGeometry(collapsed),
    meta: {
      hydrated: false,
    },
  };
}

export function appShellReducer(
  state: AppShellState,
  action: AppShellReducerAction
): AppShellState {
  switch (action.type) {
    case APP_SHELL_ACTION_TYPES.HYDRATE:
      return {
        ...state,
        collapsed: action.payload.collapsed,
        geometry: resolveGeometry(action.payload.collapsed),
        meta: { ...state.meta, hydrated: true },
      };

    case APP_SHELL_ACTION_TYPES.SET_COLLAPSED: {
      const collapsed = action.payload.collapsed;

      return {
        ...state,
        collapsed,
        geometry: resolveGeometry(collapsed),
      };
    }

    case APP_SHELL_ACTION_TYPES.TOGGLE_COLLAPSED: {
      const collapsed = !state.collapsed;

      return {
        ...state,
        collapsed,
        geometry: resolveGeometry(collapsed),
      };
    }

    case APP_SHELL_ACTION_TYPES.SET_MODE:
      return {
        ...state,
        mode: action.payload.mode,
        capabilities: defaultCapabilitiesForMode(action.payload.mode),
        search: {
          ...state.search,
          enabled: action.payload.mode !== "designer",
        },
        notifications: {
          ...state.notifications,
          enabled: action.payload.mode !== "designer",
        },
      };

    case APP_SHELL_ACTION_TYPES.SET_SEARCH_VALUE:
      return {
        ...state,
        search: {
          ...state.search,
          value: action.payload.value,
        },
      };

    case APP_SHELL_ACTION_TYPES.SET_MENU_SCALE:
      return {
        ...state,
        menuScale: action.payload.menuScale,
      };

    case APP_SHELL_ACTION_TYPES.SET_HEADER_PAGE_EDIT:
      return {
        ...state,
        editMode: {
          ...state.editMode,
          headerPage: action.payload.active,
        },
      };

    case APP_SHELL_ACTION_TYPES.SET_SIDEBAR_MENU_EDIT:
      return {
        ...state,
        editMode: {
          ...state.editMode,
          sidebarMenu: action.payload.active,
        },
      };

    case APP_SHELL_ACTION_TYPES.SET_TITLE_EDITING:
      return {
        ...state,
        editMode: {
          ...state.editMode,
          titleEditing: action.payload.isEditing,
        },
        titleEdit: {
          draft: action.payload.draft ?? state.titleEdit.draft,
          isEditing: action.payload.isEditing,
        },
      };

    case APP_SHELL_ACTION_TYPES.SET_ACTIVE_NAV:
      return {
        ...state,
        navigation: {
          ...state.navigation,
          activeItemId: action.payload.activeItemId,
          activePageId: action.payload.activePageId,
        },
      };

    case APP_SHELL_ACTION_TYPES.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: {
          unreadCount:
            action.payload.unreadCount ?? state.notifications.unreadCount,
          enabled: action.payload.enabled ?? state.notifications.enabled,
        },
      };

    default:
      return state;
  }
}
