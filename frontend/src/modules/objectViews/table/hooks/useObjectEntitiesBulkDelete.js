import { useCallback, useState } from "react";

import { getApiErrorMessage } from "../../../designer/api/platformApiClient";
import {
  deleteRuntimeEntityWithScenario,
  getRuntimeEntityDeletePreview,
} from "../../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { showPlatformNotification } from "../../../../shared/platformNotification/PlatformNotification";
import {
  aggregateBulkDeletePreview,
  isBulkDeleteAlreadyRemovedError,
  sortBulkDeleteTargets,
} from "../services/objectEntityBulkDeletePresentation";

function normalizeEntityIds(selectedIds) {
  const ids = [];

  if (selectedIds instanceof Set) {
    for (const entityId of selectedIds) {
      const normalized = String(entityId ?? "").trim();

      if (normalized) {
        ids.push(normalized);
      }
    }

    return ids;
  }

  for (const entityId of Array.isArray(selectedIds) ? selectedIds : []) {
    const normalized = String(entityId ?? "").trim();

    if (normalized) {
      ids.push(normalized);
    }
  }

  return ids;
}

/**
 * Bulk delete flow for Object Table — reuses single-entity delete API and modals.
 */
export default function useObjectEntitiesBulkDelete({
  tenantId,
  objectTypeKey,
  onDeleted,
  onClearSelection,
} = {}) {
  const [previewEntries, setPreviewEntries] = useState([]);
  const [aggregate, setAggregate] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const reset = useCallback(() => {
    setPreviewEntries([]);
    setAggregate(null);
    setLoadingPreview(false);
    setDeleting(false);
    setError("");
    setConfirmOpen(false);
    setScenarioOpen(false);
  }, []);

  const beginBulkDelete = useCallback(
    async (selectedIds) => {
      const entityIds = normalizeEntityIds(selectedIds);
      const normalizedTypeKey = String(objectTypeKey || "").trim();

      if (!tenantId || !normalizedTypeKey || !entityIds.length) {
        return { ok: false };
      }

      setError("");
      setLoadingPreview(true);

      try {
        const previewResults = await Promise.all(
          entityIds.map(async (entityId) => {
            try {
              const preview = await getRuntimeEntityDeletePreview(
                tenantId,
                normalizedTypeKey,
                entityId,
              );

              return {
                entityId,
                preview,
                ok: true,
              };
            } catch (previewError) {
              return {
                entityId,
                ok: false,
                error: previewError,
              };
            }
          }),
        );

        const successfulEntries = previewResults.filter((entry) => entry.ok);

        if (!successfulEntries.length) {
          const firstError = previewResults.find((entry) => !entry.ok)?.error;
          setError(
            getApiErrorMessage(
              firstError,
              "Не удалось подготовить массовое удаление",
            ),
          );
          return { ok: false };
        }

        const nextAggregate = aggregateBulkDeletePreview(
          successfulEntries,
          entityIds.length,
        );

        setPreviewEntries(successfulEntries);
        setAggregate(nextAggregate);

        if (nextAggregate.hasChildren) {
          setScenarioOpen(true);
          setConfirmOpen(false);
        } else {
          setConfirmOpen(true);
          setScenarioOpen(false);
        }

        return { ok: true, aggregate: nextAggregate };
      } finally {
        setLoadingPreview(false);
      }
    },
    [tenantId, objectTypeKey],
  );

  const executeBulkDelete = useCallback(
    async (scenario = null) => {
      const normalizedTypeKey = String(objectTypeKey || "").trim();
      const targets = sortBulkDeleteTargets(previewEntries);

      if (!tenantId || !normalizedTypeKey || !targets.length) {
        return { ok: false };
      }

      setDeleting(true);
      setError("");

      let deletedCount = 0;
      let failedCount = 0;

      try {
        for (const target of targets) {
          const entityId = String(target?.entityId || "").trim();

          if (!entityId) {
            failedCount += 1;
            continue;
          }

          try {
            await deleteRuntimeEntityWithScenario(
              tenantId,
              normalizedTypeKey,
              entityId,
              { scenario },
            );
            deletedCount += 1;
          } catch (deleteError) {
            if (
              scenario === "with_descendants" &&
              isBulkDeleteAlreadyRemovedError(deleteError)
            ) {
              deletedCount += 1;
              continue;
            }

            failedCount += 1;
          }
        }

        if (deletedCount > 0) {
          await onDeleted?.({
            deletedCount,
            failedCount,
            scenario: scenario || "solo",
          });
          onClearSelection?.();
        }

        if (failedCount > 0) {
          showPlatformNotification({
            message: `Удалено: ${deletedCount}\nНе удалено: ${failedCount}`,
            variant: "warning",
          });
        }

        reset();
        return { ok: failedCount === 0, deletedCount, failedCount };
      } catch (deleteError) {
        setError(getApiErrorMessage(deleteError, "Не удалось удалить записи"));
        return { ok: false };
      } finally {
        setDeleting(false);
      }
    },
    [tenantId, objectTypeKey, previewEntries, onDeleted, onClearSelection, reset],
  );

  const cancelDelete = useCallback(() => {
    if (deleting) {
      return;
    }

    reset();
  }, [deleting, reset]);

  const confirmSimpleDelete = useCallback(async () => {
    return executeBulkDelete(null);
  }, [executeBulkDelete]);

  const confirmScenarioDelete = useCallback(
    async (scenario) => {
      return executeBulkDelete(scenario);
    },
    [executeBulkDelete],
  );

  return {
    beginBulkDelete,
    cancelDelete,
    confirmSimpleDelete,
    confirmScenarioDelete,
    aggregate,
    previewEntries,
    loadingPreview,
    deleting,
    error,
    confirmOpen,
    scenarioOpen,
    isBusy: loadingPreview || deleting,
  };
}
