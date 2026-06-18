import { useCallback, useEffect, useState } from "react";

import PlatformOwnerFirstSetupWizard from "./PlatformOwnerFirstSetupWizard.jsx";
import { getPlatformSetupState } from "./platformSetupApi.js";
import { shouldShowPlatformOwnerFirstSetup } from "./platformSetupGateLogic.js";
import { isBridgeSessionUser } from "../../api/sessionBridgeApi.js";

export default function PlatformSetupGate({ children, onUserRefresh, user = null }) {
  const [setupState, setSetupState] = useState(null);
  const [isLoading, setIsLoading] = useState(() => !isBridgeSessionUser(user));
  const [loadError, setLoadError] = useState("");

  const refreshSetupState = useCallback(async () => {
    if (isBridgeSessionUser(user)) {
      setSetupState(null);
      setLoadError("");
      setIsLoading(false);
      return null;
    }

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
  }, [user]);

  useEffect(() => {
    refreshSetupState().catch(() => {});
  }, [refreshSetupState, user]);

  const handleCompleted = async () => {
    await onUserRefresh?.();
    await refreshSetupState();
  };

  if (isBridgeSessionUser(user)) {
    return children;
  }

  if (isLoading) {
    return <div style={{ padding: 24 }}>Проверка состояния платформы...</div>;
  }

  if (loadError) {
    return <div style={{ padding: 24, color: "#dc2626" }}>{loadError}</div>;
  }

  if (shouldShowPlatformOwnerFirstSetup(user, setupState)) {
    return <PlatformOwnerFirstSetupWizard onCompleted={handleCompleted} />;
  }

  return children;
}
