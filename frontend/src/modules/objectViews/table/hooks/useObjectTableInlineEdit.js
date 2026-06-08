import { useCallback, useState } from "react";

import { getApiErrorMessage } from "../../../designer/api/platformApiClient";
import { persistRuntimeEntityFieldUpdate } from "../../services/persistRuntimeEntityFieldUpdate.js";
import { isCreatableFieldType } from "../../../../shared/fieldEditors/fieldEditorRegistry";
import { isViewEngineSystemColumn } from "../../../../shared/viewEngine/systemColumnKeys";

/**
 * Inline-редактирование строк экземпляров объекта в Object Table (toolbar ✎).
 */
export default function useObjectTableInlineEdit({
  tenantId,
  objectTypeKey,
  enabled = true,
  onEntityUpdated,
}) {
  const [isInlineEditMode, setIsInlineEditMode] = useState(false);
  const [inlineEditError, setInlineEditError] = useState("");

  const toggleInlineEditMode = useCallback(() => {
    if (!enabled) {
      return;
    }

    setInlineEditError("");
    setIsInlineEditMode((current) => !current);
  }, [enabled]);

  const handleCellChange = useCallback(
    async (rowId, fieldKey, column, nextValue) => {
      if (!enabled || !tenantId || !objectTypeKey || !rowId || !fieldKey) {
        return;
      }

      if (column && isViewEngineSystemColumn(column)) {
        return;
      }

      const fieldDef = column?.fieldDef;

      if (
        !fieldDef ||
        !isCreatableFieldType(fieldDef.rawFieldType || fieldDef.type)
      ) {
        return;
      }

      const key = String(fieldKey).trim();
      setInlineEditError("");

      try {
        await persistRuntimeEntityFieldUpdate({
          tenantId,
          objectTypeKey,
          entityId: String(rowId),
          fieldKey: key,
          fieldDef,
          nextValue,
        });

        await onEntityUpdated?.();
      } catch (error) {
        setInlineEditError(
          error instanceof Error
            ? error.message
            : getApiErrorMessage(error, "Не удалось сохранить изменение"),
        );
      }
    },
    [enabled, tenantId, objectTypeKey, onEntityUpdated],
  );

  return {
    isInlineEditMode,
    toggleInlineEditMode,
    handleCellChange,
    inlineEditError,
  };
}
