import { useCallback, useMemo, useState } from "react";



import { getPublishedCatalog } from "../../designer/api/runtimeCatalogApi";

import { requestRuntimeEntityDataReload } from "../../../shared/objectPlatform/runtimeEntityDataReloadBridge.js";

import { showPlatformNotification } from "../../../shared/platformNotification/PlatformNotification.js";

import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter.js";

import { executeCreateRecordAction } from "../executors/createRecordExecutor.js";

import { resolveRuntimeActionFormFields } from "../utils/resolveRuntimeActionFormFields.js";

import { handleRuntimeActionClick } from "../utils/handleRuntimeActionClick.js";

import {

  isCreateRecordAction,

  resolveTargetObjectTypeKey,

} from "../utils/resolveTargetObjectTypeKey.js";



function buildInitialFormValues(fields = []) {

  return fields.reduce((accumulator, field) => {

    const key = String(field?.key || "").trim();



    if (!key) {

      return accumulator;

    }



    accumulator[key] = field.defaultValue ?? null;

    return accumulator;

  }, {});

}



function validateRequiredFields(fields = [], formValues = {}) {

  const errors = {};



  for (const field of fields) {

    const key = String(field?.key || "").trim();



    if (!key || !field.isRequired) {

      continue;

    }



    const value = formValues[key];



    if (value == null || value === "") {

      errors[key] = "Обязательное поле";

    }

  }



  return errors;

}



function resolveFieldsObjectTypeKey(action, sourceObjectTypeKey, catalog) {

  const targetObjectTypeKey = resolveTargetObjectTypeKey(action, sourceObjectTypeKey);

  if (!targetObjectTypeKey) {

    return "";

  }



  if (isCreateRecordAction(action)) {

    const targetType = findCatalogObjectType(catalog, targetObjectTypeKey);

    if (!targetType) {

      return "";

    }

  }



  return targetObjectTypeKey;

}



export default function useRuntimeActionFormSession({

  tenantId = null,

  objectTypeKey = null,

  catalog = null,

  entityId = null,

}) {

  const [session, setSession] = useState(null);

  const [catalogState, setCatalogState] = useState(catalog);

  const [formValues, setFormValues] = useState({});

  const [fieldErrors, setFieldErrors] = useState({});

  const [submitError, setSubmitError] = useState("");

  const [submitting, setSubmitting] = useState(false);



  const resolvedCatalog = catalogState || catalog;

  const fieldsObjectTypeKey = useMemo(() => {

    if (!session?.action || !objectTypeKey) {

      return "";

    }



    return resolveFieldsObjectTypeKey(

      session.action,

      session.objectTypeKey || objectTypeKey,

      resolvedCatalog,

    );

  }, [objectTypeKey, resolvedCatalog, session?.action, session?.objectTypeKey]);



  const fields = useMemo(() => {

    if (!session?.action?.form || !resolvedCatalog || !objectTypeKey) {

      return [];

    }



    if (isCreateRecordAction(session.action) && !fieldsObjectTypeKey) {

      return [];

    }



    return resolveRuntimeActionFormFields(

      resolvedCatalog,

      objectTypeKey,

      session.action.form,

      { fieldsObjectTypeKey: fieldsObjectTypeKey || objectTypeKey },

    );

  }, [

    fieldsObjectTypeKey,

    objectTypeKey,

    resolvedCatalog,

    session?.action?.form,

    session?.action,

  ]);



  const openActionForm = useCallback(

    async (action, context = {}) => {

      const nextEntityId = context?.entityId ?? entityId ?? null;

      let activeCatalog = catalog || catalogState;



      if (!activeCatalog && tenantId) {

        try {

          activeCatalog = await getPublishedCatalog(tenantId);

          setCatalogState(activeCatalog);

        } catch {

          activeCatalog = null;

        }

      }



      if (isCreateRecordAction(action)) {

        const targetKey = resolveTargetObjectTypeKey(action, objectTypeKey);

        const targetType = findCatalogObjectType(activeCatalog, targetKey);



        if (!targetKey || !targetType) {

          showPlatformNotification({

            message: "Целевой объект действия недоступен.",

            variant: "error",

          });

          return;

        }

      }



      const nextFieldsObjectTypeKey = resolveFieldsObjectTypeKey(

        action,

        objectTypeKey,

        activeCatalog,

      );



      const nextFields = resolveRuntimeActionFormFields(

        activeCatalog,

        objectTypeKey,

        action?.form,

        {

          fieldsObjectTypeKey: nextFieldsObjectTypeKey || objectTypeKey,

        },

      );



      setSession({

        action,

        entityId: nextEntityId,

        tenantId,

        objectTypeKey,

      });

      setFormValues(buildInitialFormValues(nextFields));

      setFieldErrors({});

      setSubmitError("");

    },

    [catalog, catalogState, entityId, objectTypeKey, tenantId],

  );



  const closeActionForm = useCallback(() => {

    setSession(null);

    setFormValues({});

    setFieldErrors({});

    setSubmitError("");

    setSubmitting(false);

  }, []);



  const handleActionClick = useCallback(

    (payload = {}) => {

      handleRuntimeActionClick(

        { action: payload.action },

        {

          openActionForm: (action) =>

            openActionForm(action, { entityId: payload.entityId ?? entityId }),

        },

      );

    },

    [entityId, openActionForm],

  );



  const setFieldValue = useCallback((fieldKey, value) => {

    const normalizedKey = String(fieldKey || "").trim();



    if (!normalizedKey) {

      return;

    }



    setFormValues((current) => ({

      ...current,

      [normalizedKey]: value,

    }));

    setFieldErrors((current) => {

      if (!current[normalizedKey]) {

        return current;

      }



      const next = { ...current };

      delete next[normalizedKey];

      return next;

    });

    setSubmitError("");

  }, []);



  const submitActionForm = useCallback(async () => {

    const validationErrors = validateRequiredFields(fields, formValues);



    if (Object.keys(validationErrors).length > 0) {

      setFieldErrors(validationErrors);

      return;

    }



    const activeTenantId = session?.tenantId ?? tenantId;

    const activeObjectTypeKey = session?.objectTypeKey ?? objectTypeKey;

    const activeAction = session?.action ?? null;

    const targetObjectTypeKey = resolveTargetObjectTypeKey(

      activeAction,

      activeObjectTypeKey,

    );



    setSubmitting(true);

    setSubmitError("");

    setFieldErrors({});



    try {

      const result = await executeCreateRecordAction({

        tenantId: activeTenantId,

        objectTypeKey: activeObjectTypeKey,

        action: activeAction,

        formValues,

        fields,

        sourceEntityId: session?.entityId ?? entityId ?? null,

      });



      if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {

        setFieldErrors(result.fieldErrors);

        setSubmitError(result.error || "Проверьте заполнение полей");

        return;

      }



      if (!result.success) {

        setSubmitError(result.error || "Не удалось создать запись");

        return;

      }



      requestRuntimeEntityDataReload({

        tenantId: activeTenantId,

        objectTypeKey: targetObjectTypeKey || activeObjectTypeKey,

        entityId: result.entityId,

      });



      if (result.warning) {

        showPlatformNotification({

          message: result.warning,

          variant: "warning",

        });

      } else {

        showPlatformNotification({

          message: "Запись успешно создана.",

        });

      }



      closeActionForm();

    } finally {

      setSubmitting(false);

    }

  }, [

    closeActionForm,

    fields,

    formValues,

    objectTypeKey,

    session,

    tenantId,

  ]);



  return {

    session,

    fields,

    formValues,

    fieldErrors,

    submitError,

    submitting,

    open: Boolean(session),

    openActionForm,

    closeActionForm,

    handleActionClick,

    setFieldValue,

    submitActionForm,

    catalog: resolvedCatalog,

  };

}

