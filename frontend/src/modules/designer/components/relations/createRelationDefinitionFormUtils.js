import { generateFieldKey } from "../fields/fieldFormUtils";

const KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const BACKEND_RELATION_KEY_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

export const RELATION_DEFINITION_TYPE_OPTIONS = [
  { value: "one_to_many", label: "Один ко многим" },
  { value: "many_to_many", label: "Многие ко многим" },
  { value: "one_to_one", label: "Один к одному" },
];

export const INITIAL_RELATION_DEFINITION_FORM = {
  name: "",
  key: "",
  key_is_manual: false,
  target_object_type_id: "",
  relation_type: "one_to_many",
  description: "",
  bidirectional: true,
  reverse_name: "",
};

/**
 * @param {Record<string, string>} form
 * @param {string[]} reservedKeys
 */
export function validateRelationDefinitionForm(form, reservedKeys = []) {
  const errors = {};
  const name = String(form.name || "").trim();
  const key = String(form.key || "").trim();
  const targetId = String(form.target_object_type_id || "").trim();
  const relationType = String(form.relation_type || "").trim();
  const bidirectional = form.bidirectional !== false;
  const reverseName = String(form.reverse_name || "").trim();

  if (!name) {
    errors.name = "Укажите название связи";
  }

  if (!key) {
    errors.key = "Укажите key связи";
  } else if (!KEY_PATTERN.test(key)) {
    errors.key =
      "Key может содержать только латиницу, цифры и _, и начинаться с буквы или _";
  } else {
    const normalizedKey = key.toLowerCase();

    if (!BACKEND_RELATION_KEY_PATTERN.test(normalizedKey)) {
      errors.key =
        "Key должен начинаться с латинской буквы, быть от 3 до 64 символов (a-z, 0-9, _)";
    }

    if (reservedKeys.includes(normalizedKey)) {
      errors.key = "Связь с таким key уже существует";
    }
  }

  if (!targetId) {
    errors.target_object_type_id = "Выберите связанный тип объекта";
  }

  if (
    !relationType ||
    !RELATION_DEFINITION_TYPE_OPTIONS.some((item) => item.value === relationType)
  ) {
    errors.relation_type = "Выберите тип связи";
  }

  if (bidirectional && !reverseName) {
    errors.reverse_name = "Укажите обратное название";
  }

  return errors;
}

/**
 * @param {Record<string, string>} form
 * @param {string} sourceObjectTypeId
 */
export function buildRelationDefinitionCreatePayload(form, sourceObjectTypeId) {
  return {
    name: String(form.name || "").trim(),
    key: String(form.key || "").trim().toLowerCase(),
    description: String(form.description || "").trim() || undefined,
    source_object_type_id: sourceObjectTypeId,
    target_object_type_id: String(form.target_object_type_id || "").trim(),
    relation_type: String(form.relation_type || "one_to_many").trim(),
    is_active: true,
    bidirectional: form.bidirectional !== false,
    reverse_name: String(form.reverse_name || "").trim(),
  };
}

/**
 * @param {string} name
 * @param {string[]} reservedKeys
 */
export function generateRelationDefinitionKey(name, reservedKeys = []) {
  return generateFieldKey(name, reservedKeys);
}
