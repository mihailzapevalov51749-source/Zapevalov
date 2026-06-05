import { useCallback, useState } from "react";

import {
  deleteRuntimeEntityWithScenario,
  getRuntimeEntityDeletePreview,
} from "../../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { getApiErrorMessage } from "../../../designer/api/platformApiClient";

/**
 * Safe entity delete flow for Object Table / future ViewEngineRowMenu.
 */
export default function useObjectEntityDelete({
  tenantId,
  objectTypeKey,
  onDeleted,
} = {}) {
  const [target, setTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const reset = useCallback(() => {
    setTarget(null);
    setPreview(null);
    setLoadingPreview(false);
    setDeleting(false);
    setError("");
    setConfirmOpen(false);
    setScenarioOpen(false);
  }, []);

  const beginDelete = useCallback(
    async ({ entityId, entityTitle = "" } = {}) => {
      const normalizedId = String(entityId || "").trim();
      const normalizedTypeKey = String(objectTypeKey || "").trim();

      if (!tenantId || !normalizedId || !normalizedTypeKey) {
        return { ok: false };
      }

      setError("");
      setLoadingPreview(true);
      setTarget({
        entityId: normalizedId,
        entityTitle: String(entityTitle || "").trim(),
      });

      try {
        const previewResult = await getRuntimeEntityDeletePreview(
          tenantId,
          normalizedTypeKey,
          normalizedId,
        );

        setPreview(previewResult);

        const resolvedTitle =
          String(previewResult?.entity_title || previewResult?.entityTitle || "").trim() ||
          String(entityTitle || "").trim();

        setTarget({
          entityId: normalizedId,
          entityTitle: resolvedTitle,
        });

        if (previewResult?.has_hierarchy_children || previewResult?.hasHierarchyChildren) {
          setScenarioOpen(true);
          setConfirmOpen(false);
        } else {
          setConfirmOpen(true);
          setScenarioOpen(false);
        }

        return { ok: true, preview: previewResult };
      } catch (previewError) {
        setError(
          getApiErrorMessage(previewError, "Не удалось подготовить удаление записи"),
        );
        reset();
        return { ok: false };
      } finally {
        setLoadingPreview(false);
      }
    },
    [tenantId, objectTypeKey, reset],
  );

  const executeDelete = useCallback(
    async (scenario = null) => {
      const normalizedId = String(target?.entityId || "").trim();
      const normalizedTypeKey = String(objectTypeKey || "").trim();

      if (!tenantId || !normalizedId || !normalizedTypeKey) {
        return { ok: false };
      }

      setDeleting(true);
      setError("");

      try {
        const result = await deleteRuntimeEntityWithScenario(
          tenantId,
          normalizedTypeKey,
          normalizedId,
          { scenario },
        );

        await onDeleted?.(result, {
          entityId: normalizedId,
          scenario: scenario || "solo",
        });

        reset();
        return { ok: true, result };
      } catch (deleteError) {
        setError(getApiErrorMessage(deleteError, "Не удалось удалить запись"));
        return { ok: false };
      } finally {
        setDeleting(false);
      }
    },
    [tenantId, objectTypeKey, target, onDeleted, reset],
  );

  const cancelDelete = useCallback(() => {
    if (deleting) {
      return;
    }
    reset();
  }, [deleting, reset]);

  const confirmSimpleDelete = useCallback(async () => {
    return executeDelete(null);
  }, [executeDelete]);

  const confirmScenarioDelete = useCallback(
    async (scenario) => {
      return executeDelete(scenario);
    },
    [executeDelete],
  );

  return {
    beginDelete,
    cancelDelete,
    confirmSimpleDelete,
    confirmScenarioDelete,
    target,
    preview,
    loadingPreview,
    deleting,
    error,
    confirmOpen,
    scenarioOpen,
  };
}
