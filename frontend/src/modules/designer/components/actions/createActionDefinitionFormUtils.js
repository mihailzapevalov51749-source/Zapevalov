import { generateFieldKey } from "../fields/fieldFormUtils";

const ACTION_DEFINITION_KEY_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

export const CREATE_RECORD_ACTION_TYPE = "create_record";

export const INITIAL_ACTION_DEFINITION_FORM = {
  name: "",
  key: "",
  key_is_manual: false,
  description: "",
  action_type_key: "",
  target_object_type_id: "",
  is_active: true,
};

export function buildActionDefinitionCreatePayload(form) {
  const actionTypeKey = String(form.action_type_key || "").trim();
  const targetObjectTypeId = String(form.target_object_type_id || "").trim();

  return {
    key: String(form.key || "").trim(),
    name: String(form.name || "").trim(),
    description: String(form.description || "").trim() || null,
    action_type_key: actionTypeKey,
    target_object_type_id:
      actionTypeKey === CREATE_RECORD_ACTION_TYPE
        ? targetObjectTypeId || null
        : null,
    is_active: form.is_active !== false,
  };
}

export function validateActionDefinitionForm(form, existingKeys = []) {
  const errors = {};
  const name = String(form.name || "").trim();
  const key = String(form.key || "").trim();
  const actionTypeKey = String(form.action_type_key || "").trim();

  if (!actionTypeKey) {
    errors.action_type_key = "Выберите тип действия";
  }

  if (
    actionTypeKey === CREATE_RECORD_ACTION_TYPE &&
    !String(form.target_object_type_id || "").trim()
  ) {
    errors.target_object_type_id = "Выберите целевой объект";
  }

  if (!name) {
    errors.name = "Укажите название действия";
  }

  if (!key) {
    errors.key = "Укажите ключ действия";
  } else if (!ACTION_DEFINITION_KEY_PATTERN.test(key)) {
    errors.key = "Ключ: латиница, цифры, _, от 3 символов, начинается с буквы";
  } else if (existingKeys.includes(key)) {
    errors.key = "Действие с таким ключом уже существует";
  }

  return errors;
}

export function suggestActionDefinitionKey(name, reservedKeys = []) {
  return generateFieldKey(name, reservedKeys);
}

export function resolveActionTypeLabel(actionTypes, actionTypeKey) {
  const normalizedKey = String(actionTypeKey || "").trim();
  if (!normalizedKey) {
    return "";
  }

  const match = (actionTypes || []).find(
    (item) => String(item?.key || "").trim() === normalizedKey,
  );

  return match?.name || normalizedKey;
}
