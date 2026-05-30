import { useCallback, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { runtimeWriteGateway } from "../../runtimeWriteGateway";
import {
  buildCreateEntityPayload,
  buildInitialCreateFormValues,
} from "../entity/buildCreateEntityPayload";
import { getCreatableFields } from "../entity/getCreatableFields";

/**
 * Runtime entity create orchestration (Entity Layer — not table rows).
 */
export default function useObjectViewCreateEntity({
  tenantId,
  objectTypeKey,
  catalog,
  enabled = true,
  onCreated,
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const creatableFields = useMemo(() => {
    if (!enabled) {
      return [];
    }

    return getCreatableFields(catalog, objectTypeKey);
  }, [catalog, objectTypeKey, enabled]);

  const canCreate = Boolean(
    enabled && tenantId && objectTypeKey && creatableFields.length > 0,
  );

  const openDialog = useCallback(() => {
    if (!canCreate) {
      return;
    }

    setFormValues(buildInitialCreateFormValues(creatableFields));
    setFieldErrors({});
    setSubmitError("");
    setIsDialogOpen(true);
  }, [canCreate, creatableFields]);

  const closeDialog = useCallback(() => {
    if (submitting) {
      return;
    }

    setIsDialogOpen(false);
    setFieldErrors({});
    setSubmitError("");
  }, [submitting]);

  const setFieldValue = useCallback((fieldKey, nextValue) => {
    const normalizedKey = String(fieldKey || "").trim();

    if (!normalizedKey) {
      return;
    }

    setFormValues((current) => ({
      ...current,
      [normalizedKey]: nextValue,
    }));

    setFieldErrors((current) => {
      if (!current[normalizedKey]) {
        return current;
      }

      const next = { ...current };
      delete next[normalizedKey];
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (!tenantId || !objectTypeKey) {
      setSubmitError("Не задан object type");
      return { ok: false };
    }

    const { values, fieldErrors: nextFieldErrors } = buildCreateEntityPayload(
      formValues,
      creatableFields,
    );

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return { ok: false };
    }

    setSubmitting(true);
    setSubmitError("");
    setFieldErrors({});

    try {
      const entity = await runtimeWriteGateway.createEntity({
        tenantId,
        objectTypeKey,
        values,
      });

      setIsDialogOpen(false);
      await onCreated?.(entity);
      return { ok: true, entity };
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(error, "Не удалось создать объект"),
      );
      return { ok: false };
    } finally {
      setSubmitting(false);
    }
  }, [
    tenantId,
    objectTypeKey,
    formValues,
    creatableFields,
    onCreated,
  ]);

  return {
    canCreate,
    creatableFields,
    isDialogOpen,
    openDialog,
    closeDialog,
    formValues,
    setFieldValue,
    fieldErrors,
    submitting,
    submitError,
    submit,
  };
}
