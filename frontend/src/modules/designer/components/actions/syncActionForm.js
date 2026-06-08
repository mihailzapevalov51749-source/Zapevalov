function normalizeId(value) {
  return String(value || "").trim();
}

function buildSavedFieldMap(savedFields = []) {
  const map = new Map();

  for (const field of savedFields) {
    const fieldDefinitionId = normalizeId(field?.field_definition_id);

    if (fieldDefinitionId) {
      map.set(fieldDefinitionId, field);
    }
  }

  return map;
}

export function buildActionFormFieldsDraft(objectFields = [], savedFields = []) {
  const savedByFieldId = buildSavedFieldMap(savedFields);

  return (Array.isArray(objectFields) ? objectFields : [])
    .map((field, index) => {
      const fieldDefinitionId = normalizeId(field?.id);
      const saved = savedByFieldId.get(fieldDefinitionId);

      return {
        field_definition_id: fieldDefinitionId,
        field_key: String(field?.key || "").trim(),
        field_name: String(field?.name || field?.key || "").trim(),
        enabled: Boolean(saved),
        required: Boolean(saved?.required),
        sort_order: Number.isFinite(Number(saved?.sort_order))
          ? Number(saved.sort_order)
          : Number.isFinite(Number(field?.sort_order))
            ? Number(field.sort_order)
            : (index + 1) * 10,
        form_field_id: saved?.id ? String(saved.id) : null,
      };
    })
    .filter((field) => field.field_definition_id);
}

export function buildActionFormDraft(savedForm, objectFields = []) {
  const savedFields = Array.isArray(savedForm?.fields) ? savedForm.fields : [];

  return {
    enabled: Boolean(savedForm),
    title: String(savedForm?.title || "").trim(),
    description: String(savedForm?.description || "").trim(),
    submit_label: String(savedForm?.submit_label || "Создать").trim() || "Создать",
    cancel_label: String(savedForm?.cancel_label || "Отмена").trim() || "Отмена",
    is_active: savedForm?.is_active !== false,
    fieldsDraft: buildActionFormFieldsDraft(objectFields, savedFields),
  };
}

export function hasActionFormChanges(formDraft, savedForm, objectFields = []) {
  const baseline = buildActionFormDraft(savedForm, objectFields);

  if (Boolean(formDraft?.enabled) !== baseline.enabled) {
    return true;
  }

  if (!formDraft?.enabled) {
    return false;
  }

  if (
    String(formDraft?.title || "").trim() !== baseline.title ||
    String(formDraft?.description || "").trim() !== baseline.description ||
    String(formDraft?.submit_label || "").trim() !== baseline.submit_label ||
    String(formDraft?.cancel_label || "").trim() !== baseline.cancel_label
  ) {
    return true;
  }

  const serialize = (fields) =>
    JSON.stringify(
      (fields || [])
        .filter((field) => field.enabled)
        .map((field) => ({
          field_definition_id: field.field_definition_id,
          required: Boolean(field.required),
          sort_order: Number(field.sort_order) || 100,
        }))
        .sort((left, right) => left.sort_order - right.sort_order),
    );

  return serialize(formDraft?.fieldsDraft) !== serialize(baseline.fieldsDraft);
}

export async function syncActionForm({
  tenantId,
  objectTypeId,
  actionDefinitionId,
  formDraft,
  savedForm = null,
  api,
}) {
  const enabledFields = (formDraft?.fieldsDraft || [])
    .filter((field) => field.enabled)
    .sort((left, right) => (left.sort_order || 100) - (right.sort_order || 100));

  if (!formDraft?.enabled || enabledFields.length === 0) {
    if (savedForm?.id) {
      await api.deleteActionForm(tenantId, objectTypeId, actionDefinitionId);
    }

    return null;
  }

  const formPayload = {
    title: String(formDraft.title || "").trim(),
    description: String(formDraft.description || "").trim() || null,
    submit_label: String(formDraft.submit_label || "Создать").trim() || "Создать",
    cancel_label: String(formDraft.cancel_label || "Отмена").trim() || "Отмена",
    is_active: formDraft.is_active !== false,
  };

  let nextForm = savedForm;

  if (!nextForm?.id) {
    nextForm = await api.createActionForm(
      tenantId,
      objectTypeId,
      actionDefinitionId,
      formPayload,
    );
  } else {
    nextForm = await api.updateActionForm(
      tenantId,
      objectTypeId,
      actionDefinitionId,
      formPayload,
    );
  }

  const savedFields = Array.isArray(nextForm?.fields) ? nextForm.fields : [];
  const savedByFieldDefinitionId = buildSavedFieldMap(savedFields);
  const enabledFieldIds = new Set(
    enabledFields.map((field) => normalizeId(field.field_definition_id)),
  );

  for (const savedField of savedFields) {
    const fieldDefinitionId = normalizeId(savedField?.field_definition_id);

    if (!enabledFieldIds.has(fieldDefinitionId) && savedField?.id) {
      await api.deleteActionFormField(
        tenantId,
        objectTypeId,
        actionDefinitionId,
        savedField.id,
      );
    }
  }

  for (const field of enabledFields) {
    const fieldDefinitionId = normalizeId(field.field_definition_id);
    const savedField = savedByFieldDefinitionId.get(fieldDefinitionId);
    const payload = {
      required: Boolean(field.required),
      sort_order: Number(field.sort_order) || 100,
      is_visible: true,
    };

    if (!savedField?.id) {
      await api.createActionFormField(tenantId, objectTypeId, actionDefinitionId, {
        field_definition_id: fieldDefinitionId,
        ...payload,
      });
      continue;
    }

    await api.updateActionFormField(
      tenantId,
      objectTypeId,
      actionDefinitionId,
      savedField.id,
      payload,
    );
  }

  return api.getActionForm(tenantId, objectTypeId, actionDefinitionId);
}
