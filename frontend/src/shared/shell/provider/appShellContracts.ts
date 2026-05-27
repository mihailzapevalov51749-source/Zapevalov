import {
  createDesignerHeaderContract,
  createRuntimeHeaderContract,
} from "../header/headerAdapters";
import type { AppHeaderContract } from "../header/headerContracts";
import { createDesignerSidebarContract } from "../sidebar/sidebarAdapters";
import { createRuntimeSidebarContract } from "../sidebar/sidebarAdapters";
import type { AppSidebarContract } from "../sidebar/sidebarContracts";
import type { AppShellSources, AppShellState } from "./appShellTypes";

type BuildContractOptions = {
  state: AppShellState;
  sources: AppShellSources;
  dispatchAction: (actionKey: string, payload?: Record<string, unknown>) => void;
};

export function buildSidebarContract({
  state,
  sources,
  dispatchAction,
}: BuildContractOptions): AppSidebarContract | null {
  const onToggleCollapse = () =>
    dispatchAction("shell.sidebar.toggle-collapse");

  if (state.mode === "designer") {
    return createDesignerSidebarContract({
      collapsed: state.collapsed,
      onToggleCollapse,
      activeKey: sources.designerActiveKey,
    });
  }

  if (state.mode === "runtime") {
    return createRuntimeSidebarContract({
      collapsed: state.collapsed,
      onToggleCollapse,
      navigationItems: sources.navigationItems,
      activePath: sources.pathname,
      activePageId: state.navigation.activePageId,
      isEditMode: state.editMode.sidebarMenu,
      menuScale: state.menuScale,
      searchQuery: undefined,
      canEditMenu: state.capabilities.canEditMenu,
      canCreateItem: state.capabilities.canCreateItem,
      canOpenSettings: state.capabilities.canOpenSettings,
      canDragItems: state.capabilities.canDragItems,
      canScaleMenu: state.capabilities.canScaleMenu,
    });
  }

  return null;
}

export function buildHeaderContract({
  state,
  sources,
  dispatchAction,
}: BuildContractOptions): AppHeaderContract | null {
  if (state.mode === "designer") {
    return createDesignerHeaderContract({
      tenantId: sources.tenantId,
      user: sources.user,
      title: sources.title,
      subtitle: sources.subtitle,
      pathname: sources.pathname,
    });
  }

  if (state.mode === "runtime") {
    return createRuntimeHeaderContract({
      pathname: sources.pathname,
      title: sources.title,
      subtitle: sources.subtitle,
      breadcrumbs: sources.breadcrumbs,
      page: sources.page,
      portal: sources.portal,
      tenant: sources.tenant,
      user: sources.user,
      tenantId: sources.tenantId,
      searchQuery: state.search.value,
      isEditMode: state.editMode.headerPage,
      isPageTitleEditable: state.editMode.titleEditing,
      pageTitleDraft: state.titleEdit.draft,
      notificationUnreadCount: state.notifications.unreadCount,
      canSearch: state.capabilities.canSearch,
      canEditPage: state.capabilities.canEditPage,
      canEditTitle: state.capabilities.canEditTitle,
      canViewNotifications: state.capabilities.canViewNotifications,
      canOpenSettings: state.capabilities.canOpenSettings,
      onSearchChangeKey: "shell.header.search.set-value",
      onSearchClearKey: "shell.header.search.clear",
      onEnterEditModeKey: "shell.edit.enter-page",
      onExitEditModeKey: "shell.edit.exit-page",
      onEditTitleKey: "shell.edit.title.start",
      onSaveTitleKey: "shell.edit.title.save",
      onCancelTitleKey: "shell.edit.title.cancel",
    });
  }

  return null;
}
