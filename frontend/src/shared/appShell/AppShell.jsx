import GlobalWorkspaceTabsBar from "../workspaceTabs/GlobalWorkspaceTabsBar";

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

  return (
    <div className="app-shell">
      <div className="app-shell__main">{children}</div>

      <div
        className="app-shell__bottom-tabs"
        style={{
          left: chrome.hasPlatformChrome ? chrome.workspaceLeftOffset : 0,
        }}
      >
        <GlobalWorkspaceTabsBar />
      </div>

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
