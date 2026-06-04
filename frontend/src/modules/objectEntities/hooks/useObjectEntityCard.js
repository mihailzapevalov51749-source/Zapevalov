import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createRelation } from "../../../api/runtimeRelationsApi";
import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { getQuickCreateFields } from "../../objectViews/entity/getQuickCreateFields";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";
import {
  buildCreateEntityPayload,
  buildInitialCreateFormValues,
} from "../../objectViews/entity/buildCreateEntityPayload";
import { getRuntimeEntity } from "../../runtimeWriteGateway/api/runtimeEntitiesApi";
import { runtimeWriteGateway } from "../../runtimeWriteGateway";
import {
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
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateTitle, setQuickCreateTitle] = useState("Новая запись");
  const [quickCreateSubmitLabel, setQuickCreateSubmitLabel] = useState("Создать");
  const [quickCreateFormValues, setQuickCreateFormValues] = useState({});
  const [quickCreateFieldErrors, setQuickCreateFieldErrors] = useState({});
  const [quickCreateSubmitError, setQuickCreateSubmitError] = useState("");
  const [subtasksReloadToken, setSubtasksReloadToken] = useState(0);
  const pendingSubtaskLinkRef = useRef(null);
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

  const quickCreateFields = useMemo(() => {
    if (!enabled) {
      return [];
    }

    return getQuickCreateFields(catalog, objectTypeKey);
  }, [catalog, objectTypeKey, enabled]);

  const canCreate = Boolean(
    enabled && tenantId && objectTypeKey && quickCreateFields.length > 0,
  );

  const objectTypeLabel = useMemo(() => {
    const objectType = findCatalogObjectType(catalog, objectTypeKey);

    return String(objectType?.name || objectType?.key || objectTypeKey || "").trim();
  }, [catalog, objectTypeKey]);

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
    if (!enabled || !localEntity || !catalog || !openEntityId) {
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
    catalog,
    localEntity,
    openEntityId,
    objectTypeKey,
    tenantId,
    titleFieldKey,
  ]);

  const cardModel = useMemo(() => {
    if (!enabled || !activeEntity) {
      return null;
    }

    return mapRuntimeEntityToCardModel({
      entity: activeEntity,
      catalog,
      objectTypeKey,
      tenantId,
      titleFieldKey,
    });
  }, [activeEntity, catalog, objectTypeKey, tenantId, titleFieldKey, enabled]);

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

  const isOpen = Boolean(cardModel && openEntityId);

  const openQuickCreate = useCallback(
    ({ submitLabel } = {}) => {
      if (!canCreate) {
        return false;
      }

      setQuickCreateTitle("Новая запись");
      setQuickCreateSubmitLabel(String(submitLabel || "").trim() || "Создать");
      setQuickCreateFormValues(buildInitialCreateFormValues(quickCreateFields));
      setQuickCreateFieldErrors({});
      setQuickCreateSubmitError("");
      setQuickCreateOpen(true);

      return true;
    },
    [canCreate, quickCreateFields],
  );

  const closeQuickCreate = useCallback(() => {
    if (createSubmitting) {
      return;
    }

    setQuickCreateOpen(false);
    setQuickCreateFieldErrors({});
    setQuickCreateSubmitError("");
    pendingSubtaskLinkRef.current = null;
  }, [createSubmitting]);

  const setQuickCreateFieldValue = useCallback((fieldKey, nextValue) => {
    const normalizedKey = String(fieldKey || "").trim();

    if (!normalizedKey) {
      return;
    }

    setQuickCreateFormValues((current) => ({
      ...current,
      [normalizedKey]: nextValue,
    }));

    setQuickCreateFieldErrors((current) => {
      if (!current[normalizedKey]) {
        return current;
      }

      const next = { ...current };
      delete next[normalizedKey];
      return next;
    });
  }, []);

  const beginCreateSubtask = useCallback(
    (relationKey) => {
      const parentEntityId = String(openEntityId || "").trim();
      const normalizedRelationKey = String(relationKey || "").trim();

      if (!canCreate || !parentEntityId || !normalizedRelationKey) {
        return false;
      }

      pendingSubtaskLinkRef.current = {
        parentEntityId,
        relationKey: normalizedRelationKey,
      };

      return openQuickCreate({
        submitLabel: "Создать",
      });
    },
    [canCreate, openEntityId, openQuickCreate],
  );

  const openCreateCard = useCallback(() => {
    pendingSubtaskLinkRef.current = null;

    return openQuickCreate({
      submitLabel: "Создать",
    });
  }, [openQuickCreate]);

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
    pendingSubtaskLinkRef.current = null;
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

  const submitQuickCreate = useCallback(async () => {
    if (!tenantId || !objectTypeKey) {
      setQuickCreateSubmitError("Не задан object type");
      return { ok: false };
    }

    const { values, fieldErrors: nextFieldErrors } = buildCreateEntityPayload(
      quickCreateFormValues,
      quickCreateFields,
    );

    if (Object.keys(nextFieldErrors).length > 0) {
      setQuickCreateFieldErrors(nextFieldErrors);
      return { ok: false };
    }

    setQuickCreateSubmitError("");
    setQuickCreateFieldErrors({});
    setCreateSubmitting(true);

    try {
      const entity = await runtimeWriteGateway.createEntity({
        tenantId,
        objectTypeKey,
        values,
      });

      const normalizedId = String(entity?.id || "").trim();

      if (!normalizedId) {
        setQuickCreateSubmitError("Запись создана, но не получен ID");
        return { ok: false };
      }

      const pendingSubtaskLink = pendingSubtaskLinkRef.current;
      let subtaskLinkFailed = false;

      if (pendingSubtaskLink?.parentEntityId && pendingSubtaskLink?.relationKey) {
        try {
          await createRelation(tenantId, pendingSubtaskLink.relationKey, {
            source_entity_id: pendingSubtaskLink.parentEntityId,
            target_entity_id: normalizedId,
          });
          setSubtasksReloadToken((value) => value + 1);
        } catch (linkError) {
          subtaskLinkFailed = true;
          setQuickCreateSubmitError(
            getApiErrorMessage(
              linkError,
              "Запись создана, но не удалось связать её как подзадачу",
            ),
          );
        } finally {
          pendingSubtaskLinkRef.current = null;
        }
      } else {
        pendingSubtaskLinkRef.current = null;
      }

      if (!subtaskLinkFailed) {
        setQuickCreateSubmitError("");
        setQuickCreateFieldErrors({});
        setQuickCreateFormValues(buildInitialCreateFormValues(quickCreateFields));
      }

      setQuickCreateOpen(false);

      await onSaved?.(entity, {
        created: true,
        quickCreate: true,
        subtaskLinked: Boolean(pendingSubtaskLink && !subtaskLinkFailed),
        subtaskLinkFailed,
        parentEntityId: pendingSubtaskLink?.parentEntityId || null,
      });

      return { ok: true, entity, subtaskLinkFailed };
    } catch (error) {
      setQuickCreateSubmitError(
        getApiErrorMessage(error, "Не удалось создать запись"),
      );
      return { ok: false };
    } finally {
      setCreateSubmitting(false);
    }
  }, [
    tenantId,
    objectTypeKey,
    quickCreateFormValues,
    quickCreateFields,
    catalog,
    titleFieldKey,
    onSaved,
  ]);

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
    cardMode,
    cardModel,
    formValues,
    submitUpdate,
    catalog,
    objectTypeKey,
    tenantId,
    titleFieldKey,
  ]);

  return {
    cardMode,
    isCreateMode: false,
    canCreate,
    isOpen,
    openCard,
    openCreateCard,
    beginCreateSubtask,
    subtasksReloadToken,
    closeCard,
    cardModel,
    formValues,
    setFieldValue,
    updateFieldValue,
    fieldErrors,
    save,
    submitting,
    submitError,
    initialContext,
    openError,
    clearOpenError: () => setOpenError(""),
    refreshEntity: handleEntityUpdated,
    quickCreate: {
      open: quickCreateOpen,
      title: quickCreateTitle,
      objectTypeLabel,
      submitLabel: quickCreateSubmitLabel,
      fields: quickCreateFields,
      formValues: quickCreateFormValues,
      fieldErrors: quickCreateFieldErrors,
      submitError: quickCreateSubmitError,
      submitting: createSubmitting,
      modalKey: `platform_quick_create_v2_${String(objectTypeKey || "object")}`,
      close: closeQuickCreate,
      setFieldValue: setQuickCreateFieldValue,
      submit: submitQuickCreate,
    },
  };
}
