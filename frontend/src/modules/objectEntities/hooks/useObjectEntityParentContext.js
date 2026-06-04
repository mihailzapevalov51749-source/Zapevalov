import { useCallback, useEffect, useState } from "react";

import { listRuntimeEntityRelations } from "../../../api/runtimeRelationsApi";
import { getRuntimeEntity } from "../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { resolveParentContextFromRelations } from "../services/resolveParentContextFromRelations";

/**
 * Parent Section data from runtime_relation_instances (hierarchy relations only).
 */
export default function useObjectEntityParentContext({
  tenantId = null,
  objectTypeKey = null,
  entityId = null,
  catalog = null,
  enabled = true,
  reloadToken = 0,
}) {
  const [loading, setLoading] = useState(false);
  const [parent, setParent] = useState(null);

  const normalizedEntityId = String(entityId ?? "").trim();
  const normalizedObjectTypeKey = String(objectTypeKey ?? "").trim();

  const canLoad = Boolean(
    enabled && tenantId && normalizedEntityId && normalizedObjectTypeKey,
  );

  const fetchEntity = useCallback(
    async (relatedEntityId, relatedObjectTypeKey) => {
      if (!tenantId || !relatedObjectTypeKey || !relatedEntityId) {
        return null;
      }

      return getRuntimeEntity(tenantId, relatedObjectTypeKey, relatedEntityId);
    },
    [tenantId],
  );

  useEffect(() => {
    if (!canLoad) {
      setLoading(false);
      setParent(null);
      return undefined;
    }

    let cancelled = false;

    async function loadParent() {
      setLoading(true);

      try {
        const instances = await listRuntimeEntityRelations(
          tenantId,
          normalizedEntityId,
        );

        if (cancelled) {
          return;
        }

        const parentContext = await resolveParentContextFromRelations({
          instances,
          currentEntityId: normalizedEntityId,
          catalog,
          currentObjectTypeKey: normalizedObjectTypeKey,
          fetchEntity,
        });

        if (!cancelled) {
          setParent(parentContext);
        }
      } catch {
        if (!cancelled) {
          setParent(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadParent();

    return () => {
      cancelled = true;
    };
  }, [
    canLoad,
    tenantId,
    normalizedEntityId,
    normalizedObjectTypeKey,
    catalog,
    fetchEntity,
    reloadToken,
  ]);

  return {
    loading,
    parent,
  };
}
