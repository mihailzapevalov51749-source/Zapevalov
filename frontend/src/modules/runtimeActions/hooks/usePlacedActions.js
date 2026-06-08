import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { listRuntimeActionsForPlacement } from "../../designer/api/runtimeActionsApi";
import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../../../shared/navigation/navigationReload";

export default function usePlacedActions({
  tenantId = null,
  objectTypeKey = null,
  placementKey = null,
  enabled = true,
}) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadActions = useCallback(async () => {
    const normalizedTenantId = tenantId != null ? String(tenantId).trim() : "";
    const normalizedObjectTypeKey = String(objectTypeKey || "").trim();
    const normalizedPlacementKey = String(placementKey || "").trim();

    if (!enabled || !normalizedTenantId || !normalizedObjectTypeKey || !normalizedPlacementKey) {
      setActions([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const items = await listRuntimeActionsForPlacement(
        normalizedTenantId,
        normalizedObjectTypeKey,
        normalizedPlacementKey,
      );
      setActions(Array.isArray(items) ? items : []);
    } catch (err) {
      setActions([]);
      setError(getApiErrorMessage(err, "Не удалось загрузить действия."));
    } finally {
      setLoading(false);
    }
  }, [enabled, objectTypeKey, placementKey, tenantId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  useEffect(() => {
    const handleReload = () => {
      loadActions();
    };

    window.addEventListener(PORTAL_NAVIGATION_RELOAD_EVENT, handleReload);

    return () => {
      window.removeEventListener(PORTAL_NAVIGATION_RELOAD_EVENT, handleReload);
    };
  }, [loadActions]);

  return {
    actions,
    loading,
    error,
    reload: loadActions,
  };
}
