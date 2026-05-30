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
  sidebarTransition = "all 0.2s ease",
  workspaceTransition = "all 0.2s ease",
}) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShellSidebarState();
  const sidebarWidth = resolveAppSidebarWidth(sidebarCollapsed);
  const workspaceLeftOffset = resolveAppSidebarWidth(sidebarCollapsed);

  console.log("[RENDER AppShellFrame]", {
    hasHeaderContract: Boolean(headerContract),
    hasSidebarContract: Boolean(sidebarContract),
    sidebarCollapsed,
    sidebarWidth,
    workspaceLeftOffset,
  });

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        maxHeight: "100vh",
        background: "#f8fafc",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: sidebarWidth,
          height: "100vh",
          zIndex: 20,
          boxSizing: "border-box",
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
      </div>

      <main
        style={{
          position: "fixed",
          top: 0,
          left: workspaceLeftOffset,
          right: 0,
          bottom: 0,
          height: "100vh",
          minHeight: 0,
          background: "#f8fafc",
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          transition: workspaceTransition,
        }}
      >
        {headerContract ? (
          <AppHeaderRenderer
            contract={headerContract}
            onAction={onHeaderAction}
          />
        ) : null}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            overflow: "hidden",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {workspace}
        </div>
      </main>
    </div>
  );
}
