import { useState } from "react";

import AppShellPageMinimizeButton from "../appShell/AppShellPageMinimizeButton.jsx";
import { usePageLayoutContract } from "../appShell/pageLayoutContract/PageLayoutContractContext.jsx";

import { useGlobalWorkspaceTabs } from "./GlobalWorkspaceTabsProvider";

export default function PageWorkspaceTabControls() {
  const { contract } = usePageLayoutContract();
  const { minimizeCurrentPage, loading } = useGlobalWorkspaceTabs();
  const [busyAction, setBusyAction] = useState("");

  if (!contract?.canMinimize) {
    return null;
  }

  const runAction = async (actionName, action) => {
    if (busyAction || loading) {
      return;
    }

    setBusyAction(actionName);

    try {
      await action();
    } finally {
      setBusyAction("");
    }
  };

  return (
    <AppShellPageMinimizeButton
      disabled={Boolean(busyAction) || loading}
      onClick={() =>
        runAction("minimize", () =>
          minimizeCurrentPage({
            fallbackRoute: contract.fallbackRoute,
            pageTitle: contract.title,
            context: contract.context,
            route: contract.route,
            moduleKey: contract.moduleKey,
            pageType: contract.pageType,
          }),
        )
      }
    />
  );
}
