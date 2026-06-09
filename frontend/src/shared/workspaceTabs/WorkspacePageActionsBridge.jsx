import { usePageLayoutContract } from "../appShell/pageLayoutContract/PageLayoutContractContext.jsx";
import { AppShellPageActions } from "../appShell/AppShellPageActionsContext";
import PageWorkspaceTabControls from "./PageWorkspaceTabControls";

export default function WorkspacePageActionsBridge() {
  const { contract } = usePageLayoutContract();

  if (!contract?.canMinimize) {
    if (import.meta.env.DEV && !contract) {
      console.warn(
        "[WorkspacePageActionsBridge] page layout contract is not registered for current route",
      );
    }

    return null;
  }

  return (
    <AppShellPageActions>
      <PageWorkspaceTabControls />
    </AppShellPageActions>
  );
}
