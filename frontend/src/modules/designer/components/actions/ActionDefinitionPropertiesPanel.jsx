import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import { ObjectSettingsButton } from "../../../../shared/objectSettings";
import ActionDefinitionPropertiesForm from "./ActionDefinitionPropertiesForm";
import {
  buildDraftAfterPlacementsLoaded,
  buildDraftFromAction,
  buildFormDraftAfterLoad,
  computeActionDefinitionPanelDirty,
  filterAutoLinkRelations,
  hasDefinitionChanges,
  reconcileFormDraftWithObjectFields,
  resolveFieldsObjectTypeId,
  shouldApplyLoadedDraftState,
  shouldApplyLoadedFormDraftState,
} from "./actionDefinitionPanelState";
import {
  arePlacementKeysEqual,
  buildPlacementKeysFromPlacements,
  syncActionPlacements,
} from "./syncActionPlacements";
import {
  buildActionFormDraft,
  hasActionFormChanges,
  syncActionForm,
} from "./syncActionForm";

import "./actionDefinitionPropertiesPanel.css";

async function fetchActionPlacements(tenantId, objectTypeId, actionId) {
  const items = await designerApi.listActionPlacements(
    tenantId,
    objectTypeId,
    actionId,
  );

  return Array.isArray(items) ? items : [];
}

async function fetchActionFormBundle(
  tenantId,
  objectTypeId,
  actionId,
  fieldsObjectTypeId = objectTypeId,
) {
  const [fields, form] = await Promise.all([
    designerApi.listFields(tenantId, fieldsObjectTypeId),
    designerApi.getActionForm(tenantId, objectTypeId, actionId).catch(() => null),
  ]);
  const objectFields = Array.isArray(fields) ? fields : [];
  const savedForm = form?.id ? form : null;

  return { savedForm, objectFields };
}

export default function ActionDefinitionPropertiesPanel({
  tenantId,
  objectTypeId,
  action,
  actionTypes = [],
  placementCatalog = [],
  placementCatalogError = "",
  onSaved,
  onSchemaChanged = null,
  hideFooter = false,
  onFooterStateChange = null,
}) {
  const [draft, setDraft] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [placementsLoading, setPlacementsLoading] = useState(false);
  const [savedForm, setSavedForm] = useState(null);
  const [formDraft, setFormDraft] = useState(null);
  const [objectFields, setObjectFields] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [objectTypes, setObjectTypes] = useState([]);
  const [objectTypesLoading, setObjectTypesLoading] = useState(false);
  const [targetObjectWarning, setTargetObjectWarning] = useState("");
  const [relations, setRelations] = useState([]);
  const [relationsLoading, setRelationsLoading] = useState(false);

  const loadTokenRef = useRef(0);
  const draftTouchedRef = useRef(false);
  const formDraftTouchedRef = useRef(false);

  const readOnly = Boolean(action?.is_system);
  const savedPlacementKeys = useMemo(
    () => buildPlacementKeysFromPlacements(placements),
    [placements],
  );
  const autoLinkRelations = useMemo(
    () =>
      filterAutoLinkRelations(
        relations,
        objectTypeId,
        draft?.target_object_type_id,
      ),
    [draft?.target_object_type_id, objectTypeId, relations],
  );

  const handleDraftChange = useCallback((updater) => {
    draftTouchedRef.current = true;
    setDraft(updater);
  }, []);

  const handleFormDraftChange = useCallback((updater) => {
    formDraftTouchedRef.current = true;
    setFormDraft(updater);
  }, []);

  const loadPlacements = useCallback(async () => {
    if (!tenantId || !objectTypeId || !action?.id) {
      setPlacements([]);
      return [];
    }

    setPlacementsLoading(true);

    try {
      const nextPlacements = await fetchActionPlacements(
        tenantId,
        objectTypeId,
        action.id,
      );
      setPlacements(nextPlacements);
      return nextPlacements;
    } catch (err) {
      setPlacements([]);
      throw err;
    } finally {
      setPlacementsLoading(false);
    }
  }, [action?.id, objectTypeId, tenantId]);

  const loadActionFormState = useCallback(
    async (fieldsObjectTypeId = resolveFieldsObjectTypeId(draft, action, objectTypeId)) => {
    if (!tenantId || !objectTypeId || !action?.id) {
      setSavedForm(null);
      setFormDraft(buildActionFormDraft(null, []));
      setObjectFields([]);
      return { savedForm: null, objectFields: [] };
    }

    setFormLoading(true);

    try {
      const { savedForm: nextForm, objectFields: nextFields } =
        await fetchActionFormBundle(
          tenantId,
          objectTypeId,
          action.id,
          fieldsObjectTypeId,
        );

      setObjectFields(nextFields);
      setSavedForm(nextForm);

      if (shouldApplyLoadedFormDraftState(formDraftTouchedRef.current)) {
        setFormDraft(buildFormDraftAfterLoad(nextForm, nextFields));
      }

      return { savedForm: nextForm, objectFields: nextFields };
    } catch (err) {
      setObjectFields([]);
      setSavedForm(null);

      if (shouldApplyLoadedFormDraftState(formDraftTouchedRef.current)) {
        setFormDraft(buildActionFormDraft(null, []));
      }

      throw err;
    } finally {
      setFormLoading(false);
    }
  },
    [action, draft, objectTypeId, tenantId],
  );

  useEffect(() => {
    if (!tenantId) {
      setObjectTypes([]);
      return undefined;
    }

    let cancelled = false;
    setObjectTypesLoading(true);

    designerApi
      .listObjectTypes(tenantId)
      .then((items) => {
        if (!cancelled) {
          setObjectTypes(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setObjectTypes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setObjectTypesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !objectTypeId) {
      setRelations([]);
      return undefined;
    }

    let cancelled = false;
    setRelationsLoading(true);

    designerApi
      .listRelations(tenantId, objectTypeId)
      .then((items) => {
        if (!cancelled) {
          setRelations(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRelations([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRelationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [objectTypeId, tenantId]);

  const previousTargetObjectTypeIdRef = useRef(null);

  useEffect(() => {
    if (!draft || !tenantId || !objectTypeId || !action?.id) {
      return undefined;
    }

    const nextTargetId = String(draft.target_object_type_id || "").trim();
    const previousTargetId = previousTargetObjectTypeIdRef.current;

    if (previousTargetId === null) {
      previousTargetObjectTypeIdRef.current = nextTargetId;
      return undefined;
    }

    if (previousTargetId === nextTargetId) {
      return undefined;
    }

    previousTargetObjectTypeIdRef.current = nextTargetId;

    const fieldsObjectTypeId = resolveFieldsObjectTypeId(draft, action, objectTypeId);
    let cancelled = false;

    (async () => {
      setFormLoading(true);
      setTargetObjectWarning("");

      try {
        const nextFields = await designerApi.listFields(tenantId, fieldsObjectTypeId);
        if (cancelled) {
          return;
        }

        const normalizedFields = Array.isArray(nextFields) ? nextFields : [];
        setObjectFields(normalizedFields);

        setFormDraft((currentFormDraft) => {
          if (!currentFormDraft) {
            return buildActionFormDraft(savedForm, normalizedFields);
          }

          const { formDraft: reconciledFormDraft, removedEnabledFields } =
            reconcileFormDraftWithObjectFields(currentFormDraft, normalizedFields);

          if (removedEnabledFields > 0) {
            setTargetObjectWarning(
              "Изменение целевого объекта удалит несовместимые поля формы.",
            );
          }

          return reconciledFormDraft;
        });

        setDraft((currentDraft) => {
          if (!currentDraft) {
            return currentDraft;
          }

          const allowedRelationIds = new Set(
            filterAutoLinkRelations(relations, objectTypeId, nextTargetId).map(
              (relation) => String(relation.id),
            ),
          );

          const currentRelationId = String(
            currentDraft.auto_link_relation_id || "",
          ).trim();

          if (currentRelationId && !allowedRelationIds.has(currentRelationId)) {
            return {
              ...currentDraft,
              auto_link_relation_id: "",
            };
          }

          return currentDraft;
        });
      } catch (err) {
        if (!cancelled) {
          setSaveError(
            getApiErrorMessage(err, "Не удалось загрузить поля целевого объекта"),
          );
        }
      } finally {
        if (!cancelled) {
          setFormLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    action?.id,
    draft?.target_object_type_id,
    objectTypeId,
    savedForm,
    tenantId,
  ]);

  const actionId = action?.id;

  useEffect(() => {
    if (!actionId) {
      setDraft(null);
      setPlacements([]);
      setSavedForm(null);
      setFormDraft(null);
      setObjectFields([]);
      setPlacementsLoading(false);
      setFormLoading(false);
      setSaveError("");
      setSaveMessage("");
      return;
    }

    loadTokenRef.current += 1;
    const token = loadTokenRef.current;
    draftTouchedRef.current = false;
    formDraftTouchedRef.current = false;

    setFormDraft(null);
    setSavedForm(null);
    setPlacements([]);
    setObjectFields([]);
    setPlacementsLoading(true);
    setFormLoading(true);
    setDraft(buildDraftFromAction(action, []));
    setTargetObjectWarning("");
    previousTargetObjectTypeIdRef.current = String(
      action.target_object_type_id || "",
    ).trim();
    setSaveError("");
    setSaveMessage("");

    const fieldsObjectTypeId = resolveFieldsObjectTypeId(null, action, objectTypeId);

    (async () => {
      try {
        const [placementItems, formBundle] = await Promise.all([
          fetchActionPlacements(tenantId, objectTypeId, actionId),
          fetchActionFormBundle(
            tenantId,
            objectTypeId,
            actionId,
            fieldsObjectTypeId,
          ),
        ]);

        if (token !== loadTokenRef.current) {
          return;
        }

        setPlacements(placementItems);
        setPlacementsLoading(false);
        setObjectFields(formBundle.objectFields);
        setSavedForm(formBundle.savedForm);
        setFormLoading(false);

        if (shouldApplyLoadedFormDraftState(formDraftTouchedRef.current)) {
          setFormDraft(
            buildFormDraftAfterLoad(formBundle.savedForm, formBundle.objectFields),
          );
        }

        if (shouldApplyLoadedDraftState(draftTouchedRef.current)) {
          setDraft(buildDraftAfterPlacementsLoaded(action, placementItems));
        }
      } catch (err) {
        if (token !== loadTokenRef.current) {
          return;
        }

        setPlacementsLoading(false);
        setFormLoading(false);
        setSaveError(
          getApiErrorMessage(err, "Не удалось загрузить настройки действия"),
        );
      }
    })();
  }, [actionId, objectTypeId, tenantId]);

  const notifySchemaChangedIfNeeded = useCallback(async () => {
    await onSchemaChanged?.();
  }, [onSchemaChanged]);

  const handleSave = useCallback(async () => {
    if (!draft?.id || !tenantId || !objectTypeId || readOnly) {
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    const definitionChanged = hasDefinitionChanges(draft, action);
    const placementsChanged = !arePlacementKeysEqual(
      draft.placementKeysDraft,
      savedPlacementKeys,
    );
    const formChanged =
      formDraft != null &&
      hasActionFormChanges(formDraft, savedForm, objectFields);

    let updatedAction = action;
    let persistedToBackend = false;

    try {
      if (definitionChanged) {
        const targetObjectTypeId = String(draft.target_object_type_id || "").trim();
        const autoLinkEnabled = draft.auto_link_enabled === true;
        const autoLinkRelationId = String(draft.auto_link_relation_id || "").trim();

        if (autoLinkEnabled && !autoLinkRelationId) {
          setSaveError("Выберите тип связи для автосвязи.");
          return;
        }

        updatedAction = await designerApi.updateActionDefinition(
          tenantId,
          objectTypeId,
          draft.id,
          {
            name: String(draft.name || "").trim(),
            description: String(draft.description || "").trim() || null,
            is_active: draft.is_active !== false,
            target_object_type_id: targetObjectTypeId || null,
            auto_link_enabled: autoLinkEnabled,
            auto_link_relation_id: autoLinkEnabled ? autoLinkRelationId : null,
          },
        );
        onSaved?.(updatedAction);
        persistedToBackend = true;
      }

      if (placementsChanged) {
        try {
          const nextPlacements = await syncActionPlacements({
            tenantId,
            objectTypeId,
            actionDefinitionId: draft.id,
            currentPlacements: placements,
            draftPlacementKeys: draft.placementKeysDraft,
            placementCatalog,
            api: designerApi,
          });
          setPlacements(nextPlacements);
          setDraft(
            buildDraftFromAction(
              updatedAction,
              buildPlacementKeysFromPlacements(nextPlacements),
            ),
          );
          persistedToBackend = true;
        } catch (placementErr) {
          const reloadedPlacements = await loadPlacements().catch(() => placements);
          const reloadedKeys = buildPlacementKeysFromPlacements(reloadedPlacements);
          setDraft(buildDraftFromAction(updatedAction, reloadedKeys));

          if (persistedToBackend) {
            await notifySchemaChangedIfNeeded();
          }

          if (definitionChanged) {
            setSaveError(
              getApiErrorMessage(
                placementErr,
                "Свойства действия сохранены, но размещения сохранить не удалось",
              ),
            );
          } else {
            setSaveError(
              getApiErrorMessage(placementErr, "Не удалось сохранить размещения действия"),
            );
          }
          return;
        }
      } else if (definitionChanged) {
        setDraft(buildDraftFromAction(updatedAction, draft.placementKeysDraft));
      }

      if (formChanged) {
        try {
          const nextForm = await syncActionForm({
            tenantId,
            objectTypeId,
            actionDefinitionId: draft.id,
            formDraft,
            savedForm,
            api: designerApi,
          });
          setSavedForm(nextForm);
          setFormDraft(buildActionFormDraft(nextForm, objectFields));
          persistedToBackend = true;
        } catch (formErr) {
          const reloaded = await loadActionFormState().catch(() => null);
          if (reloaded?.savedForm) {
            setFormDraft(buildActionFormDraft(reloaded.savedForm, reloaded.objectFields));
          }

          if (persistedToBackend) {
            await notifySchemaChangedIfNeeded();
          }

          setSaveError(
            getApiErrorMessage(formErr, "Не удалось сохранить форму действия"),
          );
          return;
        }
      }

      draftTouchedRef.current = false;
      formDraftTouchedRef.current = false;

      if (persistedToBackend) {
        await notifySchemaChangedIfNeeded();
      }

      setSaveMessage("Сохранено");
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Не удалось сохранить действие"));
    } finally {
      setSaving(false);
    }
  }, [
    action,
    draft,
    formDraft,
    loadActionFormState,
    loadPlacements,
    notifySchemaChangedIfNeeded,
    objectFields,
    onSaved,
    placementCatalog,
    placements,
    readOnly,
    savedForm,
    savedPlacementKeys,
    tenantId,
    objectTypeId,
  ]);

  const isDirty = useMemo(
    () =>
      computeActionDefinitionPanelDirty({
        draft,
        action,
        formDraft,
        savedForm,
        objectFields,
        savedPlacementKeys,
        readOnly,
      }),
    [action, draft, formDraft, objectFields, readOnly, savedForm, savedPlacementKeys],
  );

  useEffect(() => {
    if (!hideFooter || typeof onFooterStateChange !== "function") {
      return;
    }

    onFooterStateChange({
      handleSave,
      saving,
      disabled: !draft?.id || readOnly || !isDirty,
    });

    return () => {
      onFooterStateChange(null);
    };
  }, [
    draft?.id,
    handleSave,
    hideFooter,
    isDirty,
    onFooterStateChange,
    readOnly,
    saving,
  ]);

  if (!draft) {
    return null;
  }

  return (
    <div className="designer-action-definition-properties">
      <ActionDefinitionPropertiesForm
        draft={draft}
        formDraft={formDraft}
        objectFields={objectFields}
        formLoading={formLoading}
        actionTypes={actionTypes}
        placementCatalog={placementCatalog}
        objectTypes={objectTypes}
        objectTypesLoading={objectTypesLoading}
        targetObjectWarning={targetObjectWarning}
        autoLinkRelations={autoLinkRelations}
        autoLinkRelationsLoading={relationsLoading}
        placementsLoading={placementsLoading}
        placementsCatalogError={placementCatalogError}
        readOnly={readOnly}
        saveError={saveError}
        saveMessage={saveMessage}
        onDraftChange={handleDraftChange}
        onFormDraftChange={handleFormDraftChange}
      />

      {!hideFooter ? (
        <div className="designer-action-definition-properties__footer">
          <ObjectSettingsButton
            variant="primary"
            onClick={handleSave}
            disabled={saving || readOnly || !isDirty}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </ObjectSettingsButton>
        </div>
      ) : null}
    </div>
  );
}
