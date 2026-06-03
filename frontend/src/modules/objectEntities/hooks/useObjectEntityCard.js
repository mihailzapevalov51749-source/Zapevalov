import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { getCreatableFields } from "../../objectViews/entity/getCreatableFields";
import {
  buildCreateEntityPayload,
  buildInitialCreateFormValues,
} from "../../objectViews/entity/buildCreateEntityPayload";
import { getRuntimeEntity } from "../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { runtimeWriteGateway } from "../../runtimeWriteGateway";
import {
  buildCreateCardModel,
  mapRuntimeEntityToCardModel,
} from "../services/mapRuntimeEntityToCardModel";
import useObjectEntityUpdate from "./useObjectEntityUpdate";

/**
 * Object instance card state (Runtime Entity — not table row).
 * Supports create and edit in a single card surface.
 */
export default function useObjectEntityCard({
  tenantId = null,
  objectTypeKey = null,
  catalog = null,
  listItems = [],
  titleFieldKey = null,
  enabled = true,
  onSaved,
}) {
  const [cardMode, setCardMode] = useState("edit");
  const [openEntityId, setOpenEntityId] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [localEntity, setLocalEntity] = useState(null);
  const [initialContext, setInitialContext] = useState(null);
  const [openError, setOpenError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const catalogFormSyncKeyRef = useRef("");

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

  const creatableFields = useMemo(() => {
    if (!enabled) {
      return [];
    }

    return getCreatableFields(catalog, objectTypeKey);
  }, [catalog, objectTypeKey, enabled]);

  const canCreate = Boolean(
    enabled && tenantId && objectTypeKey && creatableFields.length > 0,
  );

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

  useEffect(() => {
    if (!enabled || cardMode === "create" || !localEntity || !catalog || !openEntityId) {
      return;
    }

    const resolvedObjectTypeKey = String(objectTypeKey || "").trim();

    if (!resolvedObjectTypeKey) {
      return;
    }

    const catalogVersion = String(
      catalog.catalog_version ?? catalog.catalogVersion ?? "0",
    );
    const syncKey = `${openEntityId}:${resolvedObjectTypeKey}:${catalogVersion}:${titleFieldKey || ""}`;

    if (catalogFormSyncKeyRef.current === syncKey) {
      return;
    }

    const model = mapRuntimeEntityToCardModel({
      entity: localEntity,
      catalog,
      objectTypeKey: resolvedObjectTypeKey,
      tenantId,
      titleFieldKey,
    });

    if (!model.editableFields.length) {
      return;
    }

    catalogFormSyncKeyRef.current = syncKey;
    setFormValues(model.formValues);
  }, [
    enabled,
    cardMode,
    catalog,
    localEntity,
    openEntityId,
    objectTypeKey,
    tenantId,
    titleFieldKey,
  ]);

  const cardModel = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (cardMode === "create") {
      return buildCreateCardModel({
        catalog,
        objectTypeKey,
        tenantId,
        titleFieldKey,
      });
    }

    if (!activeEntity) {
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
    cardMode,
    catalog,
    objectTypeKey,
    tenantId,
    titleFieldKey,
    enabled,
  ]);

  const handleEntityUpdated = useCallback(
    async (entity) => {
      setLocalEntity(entity);
      await onSaved?.(entity, { created: false });
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

  const isOpen = Boolean(cardModel && (cardMode === "create" || openEntityId));

  const openCreateCard = useCallback(() => {
    if (!canCreate) {
      return;
    }

    setCardMode("create");
    setOpenEntityId(null);
    setLocalEntity(null);
    setFormValues(buildInitialCreateFormValues(creatableFields));
    setFieldErrors({});
    setSubmitError("");
    setInitialContext(null);
    setOpenError("");
    catalogFormSyncKeyRef.current = "";
  }, [canCreate, creatableFields, setSubmitError]);

  const openCard = useCallback(
    async (entityId, options = {}) => {
      if (!enabled) {
        return;
      }

      const normalizedId = String(entityId || "").trim();

      if (!normalizedId) {
        return;
      }

      setOpenError("");

      const resolvedObjectTypeKey = String(
        options.objectTypeKey || objectTypeKey || "",
      ).trim();

      const preferRuntimeReload = options.forceLoadEntity === true;

      let entity =
        !preferRuntimeReload && Array.isArray(listItems)
          ? listItems.find((item) => String(item?.id) === normalizedId)
          : null;

      if ((!entity || preferRuntimeReload) && tenantId && resolvedObjectTypeKey) {
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

      setCardMode("edit");
      setOpenEntityId(normalizedId);
      setLocalEntity(entity);
      catalogFormSyncKeyRef.current = "";
      setFormValues(model.formValues);
      setFieldErrors({});
      setSubmitError("");
      setInitialContext(options.initialContext || null);
    },
    [
      enabled,
      listItems,
      catalog,
      objectTypeKey,
      tenantId,
      titleFieldKey,
      setSubmitError,
    ],
  );

  const closeCard = useCallback(() => {
    if (submitting || createSubmitting) {
      return;
    }

    setCardMode("edit");
    setOpenEntityId(null);
    setLocalEntity(null);
    catalogFormSyncKeyRef.current = "";
    setFormValues({});
    setFieldErrors({});
    setSubmitError("");
    setInitialContext(null);
    setOpenError("");
  }, [submitting, createSubmitting, setSubmitError]);

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

  const updateFieldValue = useCallback(
    async (fieldKey, nextValue) => {
      const normalizedKey = String(fieldKey || "").trim();

      if (!normalizedKey) {
        return { ok: false };
      }

      if (cardMode === "create") {
        setFieldValue(normalizedKey, nextValue);
        return { ok: true };
      }

      if (!cardModel?.entityId) {
        return { ok: false };
      }

      const previousValue = formValues[normalizedKey];

      setFieldValue(normalizedKey, nextValue);

      const nextFormValues = {
        ...formValues,
        [normalizedKey]: nextValue,
      };

      const result = await submitUpdate({
        entityId: cardModel.entityId,
        formValues: nextFormValues,
        editableFields: cardModel.editableFields,
      });

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setFieldValue(normalizedKey, previousValue);
        return result;
      }

      if (!result.ok) {
        setFieldValue(normalizedKey, previousValue);
        return result;
      }

      if (result.entity) {
        const model = mapRuntimeEntityToCardModel({
          entity: result.entity,
          catalog,
          objectTypeKey,
          tenantId,
          titleFieldKey,
        });
        setFormValues(model.formValues);
        setLocalEntity(result.entity);
        await onSaved?.(result.entity, { created: false });
      }

      return result;
    },
    [
      cardMode,
      cardModel,
      catalog,
      formValues,
      objectTypeKey,
      onSaved,
      setFieldValue,
      submitUpdate,
      tenantId,
      titleFieldKey,
    ],
  );

  const saveCreate = useCallback(async () => {
    if (!tenantId || !objectTypeKey || !cardModel?.editableFields) {
      setSubmitError("Не задан object type");
      return { ok: false };
    }

    const { values, fieldErrors: nextFieldErrors } = buildCreateEntityPayload(
      formValues,
      cardModel.editableFields,
    );

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return { ok: false };
    }

    setSubmitError("");
    setFieldErrors({});
    setCreateSubmitting(true);

    try {
      const entity = await runtimeWriteGateway.createEntity({
        tenantId,
        objectTypeKey,
        values,
      });

      const normalizedId = String(entity?.id || "").trim();

      if (!normalizedId) {
        setSubmitError("Запись создана, но не получен ID");
        return { ok: false };
      }

      setLocalEntity(entity);
      setOpenEntityId(normalizedId);
      setCardMode("edit");

      const model = mapRuntimeEntityToCardModel({
        entity,
        catalog,
        objectTypeKey,
        tenantId,
        titleFieldKey,
      });

      setFormValues(model.formValues);
      await onSaved?.(entity, { created: true });

      return { ok: true, entity };
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Не удалось создать объект"));
      return { ok: false };
    } finally {
      setCreateSubmitting(false);
    }
  }, [
    tenantId,
    objectTypeKey,
    cardModel,
    formValues,
    catalog,
    titleFieldKey,
    onSaved,
    setSubmitError,
  ]);

  const save = useCallback(async () => {
    if (cardMode === "create") {
      return saveCreate();
    }

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
    cardMode,
    cardModel,
    formValues,
    submitUpdate,
    saveCreate,
    catalog,
    objectTypeKey,
    tenantId,
    titleFieldKey,
  ]);

  return {
    cardMode,
    isCreateMode: cardMode === "create",
    canCreate,
    isOpen,
    openCard,
    openCreateCard,
    closeCard,
    cardModel,
    formValues,
    setFieldValue,
    updateFieldValue,
    fieldErrors,
    save,
    submitting: submitting || createSubmitting,
    submitError,
    initialContext,
    openError,
    clearOpenError: () => setOpenError(""),
    refreshEntity: handleEntityUpdated,
  };
}
