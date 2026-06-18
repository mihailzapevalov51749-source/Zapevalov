import { useCallback, useEffect, useMemo, useState } from "react";

import * as platformReleasesApi from "../api/platformReleasesApi";

export default function useTenantPlatformUpdates(tenantId, { enabled = true } = {}) {
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!tenantId || !enabled) {
      setOffers([]);
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const items = await platformReleasesApi.listTenantUpdates(tenantId, {
        status: "available",
      });
      setOffers(Array.isArray(items) ? items : []);
    } catch (loadError) {
      setError(
        platformReleasesApi.getApiErrorMessage(loadError, "Не удалось загрузить обновления"),
      );
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, tenantId]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const primaryOffer = useMemo(() => offers[0] || null, [offers]);

  return {
    offers,
    primaryOffer,
    availableCount: offers.length,
    error,
    isLoading,
    reloadOffers: loadOffers,
  };
}
