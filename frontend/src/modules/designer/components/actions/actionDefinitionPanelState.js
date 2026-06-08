import {
  arePlacementKeysEqual,
  buildPlacementKeysFromPlacements,
} from "./syncActionPlacements.js";
import {
  buildActionFormDraft,
  hasActionFormChanges,
} from "./syncActionForm.js";

export const CREATE_RECORD_ACTION_TYPE = "create_record";

export function buildDraftFromAction(action, placementKeys = []) {
  return {
    id: action.id,
    name: action.name || "",
    key: action.key || "",
    description: action.description || "",
    action_type_key: action.action_type_key || "",
    target_object_type_id: action.target_object_type_id || "",
    auto_link_enabled: action.auto_link_enabled === true,
    auto_link_relation_id: action.auto_link_relation_id || "",
    is_active: action.is_active !== false,
    placementKeysDraft: [...placementKeys],
  };
}

export function filterAutoLinkRelations(
  relations,
  sourceObjectTypeId,
  targetObjectTypeId,
) {
  const sourceId = String(sourceObjectTypeId || "").trim();
  const targetId = String(targetObjectTypeId || "").trim();

  if (!sourceId || !targetId) {
    return [];
  }

  return (relations || []).filter((relation) => {
    if (relation?.is_active === false) {
      return false;
    }

    return (
      String(relation.source_object_type_id || "").trim() === sourceId &&
      String(relation.target_object_type_id || "").trim() === targetId
    );
  });
}

export function resolveFieldsObjectTypeId(draft, action, sourceObjectTypeId) {
  const actionTypeKey = String(
    draft?.action_type_key || action?.action_type_key || "",
  ).trim();

  if (actionTypeKey === CREATE_RECORD_ACTION_TYPE) {
    const targetId = draft?.target_object_type_id || action?.target_object_type_id;
    if (targetId) {
      return targetId;
    }
  }

  return sourceObjectTypeId;
}

export function reconcileFormDraftWithObjectFields(formDraft, objectFields) {
  if (!formDraft) {
    return { formDraft: null, removedEnabledFields: 0 };
  }

  const validFieldIds = new Set(
    (objectFields || [])
      .map((field) => String(field?.id || "").trim())
      .filter(Boolean),
  );

  const previousEnabledCount = (formDraft.fieldsDraft || []).filter(
    (field) => field.enabled,
  ).length;

  const nextFieldsDraft = (formDraft.fieldsDraft || []).map((field) => {
    const fieldDefinitionId = String(field.field_definition_id || "").trim();
    const objectField = (objectFields || []).find(
      (item) => String(item?.id || "").trim() === fieldDefinitionId,
    );

    if (!objectField) {
      return {
        ...field,
        enabled: false,
      };
    }

    return {
      ...field,
      field_key: String(objectField.key || field.field_key || "").trim(),
      field_name: String(objectField.name || objectField.key || field.field_name || "").trim(),
    };
  });

  const nextEnabledCount = nextFieldsDraft.filter((field) => field.enabled).length;

  return {
    formDraft: {
      ...formDraft,
      fieldsDraft: nextFieldsDraft,
    },
    removedEnabledFields: Math.max(0, previousEnabledCount - nextEnabledCount),
  };
}

export function hasDefinitionChanges(draft, action) {
  if (!draft || !action) {
    return false;
  }

  const nextDescription = String(draft.description || "").trim() || null;
  const currentDescription = String(action.description || "").trim() || null;

  const nextTargetId = String(draft.target_object_type_id || "").trim() || null;
  const currentTargetId =
    String(action.target_object_type_id || "").trim() || null;
  const nextAutoLinkEnabled = draft.auto_link_enabled === true;
  const currentAutoLinkEnabled = action.auto_link_enabled === true;
  const nextAutoLinkRelationId =
    String(draft.auto_link_relation_id || "").trim() || null;
  const currentAutoLinkRelationId =
    String(action.auto_link_relation_id || "").trim() || null;

  return (
    String(draft.name || "").trim() !== String(action.name || "").trim() ||
    nextDescription !== currentDescription ||
    (draft.is_active !== false) !== (action.is_active !== false) ||
    nextTargetId !== currentTargetId ||
    nextAutoLinkEnabled !== currentAutoLinkEnabled ||
    nextAutoLinkRelationId !== currentAutoLinkRelationId
  );
}

export function computeActionDefinitionPanelDirty({
  draft,
  action,
  formDraft,
  savedForm,
  objectFields,
  savedPlacementKeys,
  readOnly = false,
}) {
  if (!draft || readOnly) {
    return false;
  }

  const definitionDirty = hasDefinitionChanges(draft, action);
  const placementDirty = !arePlacementKeysEqual(
    draft.placementKeysDraft,
    savedPlacementKeys,
  );
  const formDirty = formDraft
    ? hasActionFormChanges(formDraft, savedForm, objectFields)
    : false;

  return definitionDirty || placementDirty || formDirty;
}

export function shouldApplyLoadedDraftState(draftTouched) {
  return !draftTouched;
}

export function shouldApplyLoadedFormDraftState(formDraftTouched) {
  return !formDraftTouched;
}

export function buildDraftAfterPlacementsLoaded(action, placementItems) {
  const placementKeys = buildPlacementKeysFromPlacements(placementItems);
  return buildDraftFromAction(action, placementKeys);
}

export function buildFormDraftAfterLoad(savedForm, objectFields) {
  return buildActionFormDraft(savedForm, objectFields);
}
