import { useCallback, useState } from "react";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { runtimeWriteGateway } from "../../runtimeWriteGateway";
import { buildEntityUpdatePayload } from "../services/buildEntityUpdatePayload";

/**
 * Runtime entity PATCH orchestration.
 */
export default function useObjectEntityUpdate({
  tenantId,
  objectTypeKey,
  onUpdated,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const submitUpdate = useCallback(
    async ({ entityId, formValues, editableFields }) => {
      if (!tenantId || !objectTypeKey || !entityId) {
        setSubmitError("Не задан контекст объекта");
        return { ok: false };
      }

      const { values, fieldErrors } = buildEntityUpdatePayload(
        formValues,
        editableFields,
      );

      if (Object.keys(fieldErrors).length > 0) {
        return { ok: false, fieldErrors };
      }

      setSubmitting(true);
      setSubmitError("");

      try {
        const entity = await runtimeWriteGateway.updateEntity({
          tenantId,
          objectTypeKey,
          entityId,
          values,
        });

        await onUpdated?.(entity);
        return { ok: true, entity };
      } catch (error) {
        setSubmitError(
          getApiErrorMessage(error, "Не удалось сохранить объект"),
        );
        return { ok: false };
      } finally {
        setSubmitting(false);
      }
    },
    [tenantId, objectTypeKey, onUpdated],
  );

  return {
    submitting,
    submitError,
    setSubmitError,
    submitUpdate,
  };
}
