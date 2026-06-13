import GlobalWorkspaceTabsBar from "../workspaceTabs/GlobalWorkspaceTabsBar";

import { useGlobalWorkspaceTabs } from "../workspaceTabs/GlobalWorkspaceTabsProvider";

import WorkspacePageActionsBridge from "../workspaceTabs/WorkspacePageActionsBridge";

import { AppShellChromeProvider, useAppShellChrome } from "./AppShellChromeContext";

import {
  AppShellPageActionsHost,
  AppShellPageActionsProvider,
} from "./AppShellPageActionsContext";

import { PageLayoutContractProvider } from "./pageLayoutContract/PageLayoutContractContext.jsx";

import "./appShell.css";

import "./pageToolbarActions.css";

function AppShellLayout({ children }) {
  const { chrome } = useAppShellChrome();
  const { tabs } = useGlobalWorkspaceTabs();
  const hasBottomTabs = tabs.length > 0;

  return (
    <div
      className="app-shell"
      data-has-bottom-tabs={hasBottomTabs ? "true" : undefined}
    >
      <div className="app-shell__main">{children}</div>

      {hasBottomTabs ? (
        <div
          className="app-shell__bottom-tabs"
          style={{
            left: chrome.hasPlatformChrome ? chrome.workspaceLeftOffset : 0,
          }}
        >
          <GlobalWorkspaceTabsBar />
        </div>
      ) : null}

      <WorkspacePageActionsBridge />
      <AppShellPageActionsHost />
    </div>
  );
}

export default function AppShell({ children }) {
  return (
    <AppShellChromeProvider>
      <PageLayoutContractProvider>
        <AppShellPageActionsProvider>
          <AppShellLayout>{children}</AppShellLayout>
        </AppShellPageActionsProvider>
      </PageLayoutContractProvider>
    </AppShellChromeProvider>
  );
}

