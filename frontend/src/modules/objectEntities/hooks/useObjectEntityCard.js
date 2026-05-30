import { useCallback, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { getRuntimeEntity } from "../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { mapRuntimeEntityToCardModel } from "../services/mapRuntimeEntityToCardModel";
import useObjectEntityUpdate from "./useObjectEntityUpdate";

/**
 * Object instance card state (Runtime Entity — not table row).
 */
export default function useObjectEntityCard({
  tenantId = null,
  objectTypeKey = null,
  catalog = null,
  listItems = [],
  titleFieldKey = null,
  enabled = true,
  onSaved,
  mode = "edit",
}) {
  const [openEntityId, setOpenEntityId] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [localEntity, setLocalEntity] = useState(null);
  const [initialContext, setInitialContext] = useState(null);
  const [openError, setOpenError] = useState("");

  function resolveEntityOpenError(error) {
    const status = error?.response?.status;

    if (status === 403) {
      return "Нет доступа к объекту";
    }

    if (status === 404) {
      return "Объект не найден";
    }

    return getApiErrorMessage(error, "Не удалось открыть объект");
  }

  const listEntity = useMemo(() => {
    if (!openEntityId || !Array.isArray(listItems)) {
      return null;
    }

    return (
      listItems.find((item) => String(item?.id) === String(openEntityId)) ||
      null
    );
  }, [listItems, openEntityId]);

  const activeEntity = localEntity || listEntity;

  const cardModel = useMemo(() => {
    if (!activeEntity || !enabled || mode !== "edit") {
      return null;
    }

    return mapRuntimeEntityToCardModel({
      entity: activeEntity,
      catalog,
      objectTypeKey,
      tenantId,
      titleFieldKey,
    });
  }, [
    activeEntity,
    catalog,
    objectTypeKey,
    tenantId,
    titleFieldKey,
    enabled,
    mode,
  ]);

  const handleEntityUpdated = useCallback(
    async (entity) => {
      setLocalEntity(entity);
      await onSaved?.(entity);
    },
    [onSaved],
  );

  const {
    submitting,
    submitError,
    setSubmitError,
    submitUpdate,
  } = useObjectEntityUpdate({
    tenantId,
    objectTypeKey,
    onUpdated: handleEntityUpdated,
  });

  const isOpen = Boolean(openEntityId && cardModel);

  const openCard = useCallback(
    async (entityId, options = {}) => {
      if (!enabled || mode !== "edit") {
        return;
      }

      const normalizedId = String(entityId || "").trim();

      if (!normalizedId) {
        return;
      }

      setOpenError("");

      let entity = Array.isArray(listItems)
        ? listItems.find((item) => String(item?.id) === normalizedId)
        : null;

      const resolvedObjectTypeKey = String(
        options.objectTypeKey || objectTypeKey || "",
      ).trim();

      if (!entity && tenantId && resolvedObjectTypeKey) {
        try {
          entity = await getRuntimeEntity(
            tenantId,
            resolvedObjectTypeKey,
            normalizedId,
          );
        } catch (error) {
          console.warn(
            "[useObjectEntityCard] Failed to load runtime entity for card open",
            {
              tenantId,
              objectTypeKey: resolvedObjectTypeKey,
              entityId: normalizedId,
              error,
            },
          );
          setOpenError(resolveEntityOpenError(error));
          return;
        }
      }

      if (!entity) {
        console.warn("[useObjectEntityCard] Runtime entity not found", {
          entityId: normalizedId,
          objectTypeKey: resolvedObjectTypeKey,
        });
        setOpenError("Объект не найден");
        return;
      }

      const model = mapRuntimeEntityToCardModel({
        entity,
        catalog,
        objectTypeKey: resolvedObjectTypeKey || objectTypeKey,
        tenantId,
        titleFieldKey,
      });

      setOpenEntityId(normalizedId);
      setLocalEntity(entity);
      setFormValues(model.formValues);
      setFieldErrors({});
      setSubmitError("");
      setInitialContext(options.initialContext || null);
    },
    [
      enabled,
      mode,
      listItems,
      catalog,
      objectTypeKey,
      tenantId,
      titleFieldKey,
      setSubmitError,
    ],
  );

  const closeCard = useCallback(() => {
    if (submitting) {
      return;
    }

    setOpenEntityId(null);
    setLocalEntity(null);
    setFormValues({});
    setFieldErrors({});
    setSubmitError("");
    setInitialContext(null);
    setOpenError("");
  }, [submitting, setSubmitError]);

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

  const save = useCallback(async () => {
    if (!cardModel?.entityId) {
      return { ok: false };
    }

    const result = await submitUpdate({
      entityId: cardModel.entityId,
      formValues,
      editableFields: cardModel.editableFields,
    });

    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
    }

    if (result.ok && result.entity) {
      const model = mapRuntimeEntityToCardModel({
        entity: result.entity,
        catalog,
        objectTypeKey,
        tenantId,
        titleFieldKey,
      });
      setFormValues(model.formValues);
    }

    return result;
  }, [
    cardModel,
    formValues,
    submitUpdate,
    catalog,
    objectTypeKey,
    tenantId,
    titleFieldKey,
  ]);

  return {
    mode,
    isOpen,
    openCard,
    closeCard,
    cardModel,
    formValues,
    setFieldValue,
    fieldErrors,
    save,
    submitting,
    submitError,
    initialContext,
    openError,
    clearOpenError: () => setOpenError(""),
    refreshEntity: handleEntityUpdated,
  };
}
