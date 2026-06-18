import { useCallback, useEffect, useState } from "react";

import { getRuntimeModuleConfiguration } from "./tenantModuleConfigurationRuntimeApi";

export default function useRuntimeModuleConfiguration(tenantId, moduleKey) {
  const [configuration, setConfiguration] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!tenantId || !moduleKey) {
      setConfiguration(null);
      return null;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await getRuntimeModuleConfiguration(tenantId, moduleKey);
      setConfiguration(data);
      return data;
    } catch (loadError) {
      console.error(loadError);
      setError(loadError?.message || "Не удалось загрузить runtime-конфигурацию");
      setConfiguration(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, moduleKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    configuration,
    settings: configuration?.settings || {},
    isLoading,
    error,
    reload,
  };
}
