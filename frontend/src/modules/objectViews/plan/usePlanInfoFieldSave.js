import { useCallback, useState } from "react";

import { persistRuntimeEntityFieldUpdate } from "../services/persistRuntimeEntityFieldUpdate.js";

/**
 * Inline field save for Plan Info tab (shared runtime update pipeline with Object Table).
 */
export default function usePlanInfoFieldSave({
  tenantId,
  objectTypeKey,
  entityId = null,
  displayFields = [],
  enabled = true,
  previewMode = false,
  onEntityPatched,
  onEntityUpdated,
}) {
  const [saveError, setSaveError] = useState("");

  const handleFieldChange = useCallback(
    async (fieldKey, nextValue) => {
      const normalizedKey = String(fieldKey || "").trim();
      const normalizedEntityId = String(entityId || "").trim();

      if (!enabled || previewMode || !tenantId || !objectTypeKey || !normalizedEntityId || !normalizedKey) {
        return { ok: false };
      }

      const field = (displayFields || []).find(
        (item) => String(item?.key || "").trim() === normalizedKey,
      );

      if (!field) {
        return { ok: false };
      }

      setSaveError("");

      try {
        const values = await persistRuntimeEntityFieldUpdate({
          tenantId,
          objectTypeKey,
          entityId: normalizedEntityId,
          fieldKey: normalizedKey,
          fieldDef: field,
          nextValue,
        });

        onEntityPatched?.(normalizedEntityId, values);
        await onEntityUpdated?.(normalizedEntityId, { fieldKey: normalizedKey, values });

        return { ok: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Не удалось сохранить изменение";

        setSaveError(message);
        return { ok: false, error: message };
      }
    },
    [
      displayFields,
      enabled,
      entityId,
      objectTypeKey,
      onEntityPatched,
      onEntityUpdated,
      previewMode,
      tenantId,
    ],
  );

  return {
    handleFieldChange,
    saveError,
    canEdit: enabled && !previewMode && Boolean(entityId),
  };
}
