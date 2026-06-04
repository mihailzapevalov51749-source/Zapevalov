import { useCallback, useEffect, useRef, useState } from "react";

import {
  createRelationFieldLink,
  deleteRelationFieldLink,
  getRelationFieldState,
} from "../../../api/runtimeRelationFieldsApi";
import { mapRelationFieldApiError } from "../services/mapRelationFieldApiError";

function normalizeItems(state) {
  return Array.isArray(state?.items) ? state.items : [];
}

/**
 * @param {{
 *   tenantId?: number | null,
 *   entityId?: string | null,
 *   fieldKey?: string | null,
 *   enabled?: boolean,
 * }} params
 */
export default function useRelationFieldState({
  tenantId = null,
  entityId = null,
  fieldKey = null,
  enabled = true,
}) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [mutating, setMutating] = useState(false);
  const requestIdRef = useRef(0);

  const canLoad =
    enabled &&
    Boolean(tenantId) &&
    Boolean(String(entityId ?? "").trim()) &&
    Boolean(String(fieldKey ?? "").trim());

  const reload = useCallback(async () => {
    if (!canLoad) {
      setState(null);
      setError("");
      return null;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const nextState = await getRelationFieldState(
        tenantId,
        String(entityId),
        String(fieldKey),
      );

      if (requestIdRef.current !== requestId) {
        return null;
      }

      setState(nextState);
      return nextState;
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return null;
      }

      setState(null);
      setError(mapRelationFieldApiError(err));
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [canLoad, entityId, fieldKey, tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const linkTarget = useCallback(
    async (targetEntityId) => {
      const normalizedTargetId = String(targetEntityId ?? "").trim();

      if (!canLoad || !normalizedTargetId) {
        return { ok: false };
      }

      setMutating(true);
      setMutationError("");

      try {
        await createRelationFieldLink(tenantId, String(entityId), String(fieldKey), {
          target_entity_id: normalizedTargetId,
        });

        await reload();

        return { ok: true };
      } catch (err) {
        setMutationError(mapRelationFieldApiError(err));
        return { ok: false };
      } finally {
        setMutating(false);
      }
    },
    [canLoad, entityId, fieldKey, reload, state, tenantId],
  );

  const unlinkTarget = useCallback(
    async (targetEntityId) => {
      const normalizedTargetId = String(targetEntityId ?? "").trim();

      if (!canLoad || !normalizedTargetId) {
        return { ok: false };
      }

      setMutating(true);
      setMutationError("");

      try {
        await deleteRelationFieldLink(tenantId, String(entityId), String(fieldKey), {
          target_entity_id: normalizedTargetId,
        });

        setState((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            items: normalizeItems(prev).filter(
              (item) => String(item.entity_id) !== normalizedTargetId,
            ),
          };
        });

        return { ok: true };
      } catch (err) {
        setMutationError(mapRelationFieldApiError(err));
        return { ok: false };
      } finally {
        setMutating(false);
      }
    },
    [canLoad, entityId, fieldKey, tenantId],
  );

  return {
    state,
    items: normalizeItems(state),
    cardinality: String(state?.cardinality || "one"),
    loading,
    error,
    mutationError,
    mutating,
    reload,
    linkTarget,
    unlinkTarget,
  };
}
