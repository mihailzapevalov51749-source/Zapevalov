import { useCallback, useEffect, useState } from "react";

import PlatformOwnerFirstSetupWizard from "./PlatformOwnerFirstSetupWizard.jsx";
import { getPlatformSetupState } from "./platformSetupApi.js";

export default function PlatformSetupGate({ children, onUserRefresh, user = null }) {
  const [setupState, setSetupState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshSetupState = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const nextState = await getPlatformSetupState();
      setSetupState(nextState);
      return nextState;
    } catch (error) {
      setLoadError(error.message || "Не удалось проверить состояние платформы");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSetupState().catch(() => {});
  }, [refreshSetupState]);

  const handleCompleted = async () => {
    await onUserRefresh?.();
    await refreshSetupState();
  };

  if (isLoading) {
    return <div style={{ padding: 24 }}>Проверка состояния платформы...</div>;
  }

  if (loadError) {
    return <div style={{ padding: 24, color: "#dc2626" }}>{loadError}</div>;
  }

  const isCompanyUser = user?.tenant_id != null;

  if (setupState?.needs_owner_setup && !isCompanyUser) {
    return <PlatformOwnerFirstSetupWizard onCompleted={handleCompleted} />;
  }

  return children;
}
