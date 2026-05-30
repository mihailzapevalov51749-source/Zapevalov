import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createRelation,
  deleteRelation,
  listRuntimeEntityRelations,
} from "../../../api/runtimeRelationsApi";
import { getRuntimeEntity } from "../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { mapRelationInstancesToGroups } from "../services/mapRelationInstancesToGroups";
import { resolveCreatableRelationOptions } from "../services/resolveCreatableRelationOptions";

/**
 * Loads runtime relation instances for an entity and enriches related entities.
 */
export default function useObjectEntityRelations({
  tenantId = null,
  objectTypeKey = null,
  entityId = null,
  catalog = null,
  enabled = true,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [deletingInstanceId, setDeletingInstanceId] = useState("");
  const [mutationError, setMutationError] = useState("");

  const normalizedEntityId = String(entityId ?? "").trim();
  const normalizedObjectTypeKey = String(objectTypeKey ?? "").trim();
  const canLoad = Boolean(
    enabled && tenantId && normalizedEntityId && normalizedObjectTypeKey,
  );

  const creatableRelationOptions = useMemo(
    () => resolveCreatableRelationOptions(catalog, normalizedObjectTypeKey),
    [catalog, normalizedObjectTypeKey],
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

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!canLoad) {
      setLoading(false);
      setError("");
      setGroups([]);
      return undefined;
    }

    let cancelled = false;

    async function loadRelations() {
      setLoading(true);
      setError("");

      try {
        const instances = await listRuntimeEntityRelations(
          tenantId,
          normalizedEntityId,
        );

        if (cancelled) {
          return;
        }

        const nextGroups = await mapRelationInstancesToGroups({
          instances,
          currentEntityId: normalizedEntityId,
          catalog,
          tenantId,
          currentObjectTypeKey: normalizedObjectTypeKey,
          fetchEntity,
        });

        if (!cancelled) {
          setGroups(nextGroups);
        }
      } catch (err) {
        if (!cancelled) {
          setGroups([]);
          setError(
            err?.response?.data?.detail ||
              err?.message ||
              "Не удалось загрузить связи",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRelations();

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

  const createRelationInstance = useCallback(
    async ({ relationKey, currentRole, peerEntityId }) => {
      const normalizedRelationKey = String(relationKey ?? "").trim();
      const normalizedPeerEntityId = String(peerEntityId ?? "").trim();

      if (!tenantId || !normalizedEntityId || !normalizedRelationKey) {
        return false;
      }

      if (!normalizedPeerEntityId) {
        setMutationError("Выберите связанную запись");
        return false;
      }

      const sourceEntityId =
        currentRole === "source" ? normalizedEntityId : normalizedPeerEntityId;
      const targetEntityId =
        currentRole === "source" ? normalizedPeerEntityId : normalizedEntityId;

      setCreating(true);
      setMutationError("");

      try {
        await createRelation(tenantId, normalizedRelationKey, {
          source_entity_id: sourceEntityId,
          target_entity_id: targetEntityId,
        });
        reload();
        return true;
      } catch (err) {
        setMutationError(
          err?.response?.data?.detail ||
            err?.message ||
            "Не удалось создать связь",
        );
        return false;
      } finally {
        setCreating(false);
      }
    },
    [tenantId, normalizedEntityId, reload],
  );

  const deleteRelationInstance = useCallback(
    async (relationInstanceId) => {
      const normalizedRelationInstanceId = String(relationInstanceId ?? "").trim();

      if (!tenantId || !normalizedRelationInstanceId) {
        return false;
      }

      setDeletingInstanceId(normalizedRelationInstanceId);
      setMutationError("");

      try {
        await deleteRelation(tenantId, normalizedRelationInstanceId);
        reload();
        return true;
      } catch (err) {
        setMutationError(
          err?.response?.data?.detail ||
            err?.message ||
            "Не удалось удалить связь",
        );
        return false;
      } finally {
        setDeletingInstanceId("");
      }
    },
    [tenantId, reload],
  );

  const totalCount = useMemo(
    () =>
      groups.reduce((total, group) => total + (group.items?.length || 0), 0),
    [groups],
  );

  return {
    loading,
    error,
    groups,
    totalCount,
    reload,
    creatableRelationOptions,
    creating,
    deletingInstanceId,
    mutationError,
    createRelation: createRelationInstance,
    deleteRelation: deleteRelationInstance,
  };
}
