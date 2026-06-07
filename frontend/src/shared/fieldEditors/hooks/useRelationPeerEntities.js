import { useEffect, useState } from "react";

import { queryRuntimeEntities } from "../../../modules/designer/api/runtimeQueryApi";

/**
 * Loads peer entities for relation field selectors (create + edit).
 *
 * @param {{
 *   tenantId?: number | null,
 *   peerObjectTypeKey?: string | null,
 *   excludeEntityId?: string | null,
 *   enabled?: boolean,
 * }} params
 */
export default function useRelationPeerEntities({
  tenantId = null,
  peerObjectTypeKey = "",
  excludeEntityId = null,
  enabled = true,
}) {
  const [peerEntities, setPeerEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const normalizedPeerType = String(peerObjectTypeKey ?? "").trim();
    const normalizedTenantId = Number(tenantId);
    const shouldLoad = enabled && normalizedPeerType && normalizedTenantId;

    if (!shouldLoad) {
      setPeerEntities([]);
      setLoadError("");
      return undefined;
    }

    let cancelled = false;

    async function loadPeers() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await queryRuntimeEntities(
          normalizedTenantId,
          normalizedPeerType,
          {
            limit: 50,
            offset: 0,
            sort: "created_at",
            order: "desc",
          },
        );

        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        const normalizedExcludeId = String(excludeEntityId ?? "").trim();

        setPeerEntities(
          items.filter(
            (item) => String(item?.id ?? "").trim() !== normalizedExcludeId,
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setPeerEntities([]);
          setLoadError(
            err?.response?.data?.detail ||
              err?.message ||
              "Не удалось загрузить записи",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPeers();

    return () => {
      cancelled = true;
    };
  }, [enabled, excludeEntityId, peerObjectTypeKey, tenantId]);

  return {
    peerEntities,
    loading,
    loadError,
  };
}
