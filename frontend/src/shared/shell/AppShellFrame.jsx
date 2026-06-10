import { useRegisterAppShellChrome } from "../appShell/AppShellChromeContext";

import { APP_SHELL_SHELL_HEADER_HEIGHT } from "../appShell/appShellConstants";

import AppHeaderRenderer from "./header/components/AppHeaderRenderer";

import AppSidebarRenderer from "./sidebar/components/AppSidebarRenderer";

import { resolveAppSidebarWidth } from "./shellSidebarGeometry";

import { useShellSidebarState } from "./useShellSidebarState";

export default function AppShellFrame({
  headerContract,
  sidebarContract,
  workspace,
  onHeaderAction,
  onSidebarItemAction,
  onSidebarAction,
  sidebarCollapsed: sidebarCollapsedOverride,
  onToggleSidebarCollapsed: onToggleSidebarCollapsedOverride,
  sidebarTransition = "all 0.2s ease",
  workspaceTransition = "all 0.2s ease",
  platformZone = undefined,
  ...rootProps
}) {
  const tenantSidebarState = useShellSidebarState();
  const sidebarCollapsed =
    typeof sidebarCollapsedOverride === "boolean"
      ? sidebarCollapsedOverride
      : tenantSidebarState.sidebarCollapsed;
  const toggleSidebarCollapsed =
    onToggleSidebarCollapsedOverride ?? tenantSidebarState.toggleSidebarCollapsed;
  const sidebarWidth = resolveAppSidebarWidth(sidebarCollapsed);
  const workspaceLeftOffset = resolveAppSidebarWidth(sidebarCollapsed);

  useRegisterAppShellChrome({
    hasPlatformChrome: true,
    workspaceLeftOffset,
    shellHeaderHeight: headerContract ? APP_SHELL_SHELL_HEADER_HEIGHT : 0,
  });

  return (
    <div
      className="app-shell-frame"
      data-platform-zone={platformZone || undefined}
      {...rootProps}
    >
      <aside
        className="app-shell-frame__sidebar"
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          transition: sidebarTransition,
        }}
      >
        {sidebarContract ? (
          <AppSidebarRenderer
            contract={sidebarContract}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
            onItemAction={onSidebarItemAction}
            onAction={onSidebarAction}
          />
        ) : null}
      </aside>

      <main
        className="app-shell-frame__main"
        style={{
          transition: workspaceTransition,
        }}
      >
        {headerContract ? (
          <AppHeaderRenderer contract={headerContract} onAction={onHeaderAction} />
        ) : null}

        <div className="app-shell-frame__workspace">{workspace}</div>
      </main>
    </div>
  );
}
