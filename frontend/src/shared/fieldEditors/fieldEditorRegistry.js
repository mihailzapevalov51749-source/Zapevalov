import BooleanFieldEditor from "./editors/BooleanFieldEditor";
import ChoiceFieldEditor from "./editors/ChoiceFieldEditor";
import DateFieldEditor from "./editors/DateFieldEditor";
import NumberFieldEditor from "./editors/NumberFieldEditor";
import TextFieldEditor from "./editors/TextFieldEditor";
import RelationFieldEditor from "./editors/RelationFieldEditor";
import UserFieldEditor from "./editors/UserFieldEditor";
import LinkFieldEditor from "./editors/LinkFieldEditor";

export const FIELD_EDITOR_TYPE_TEXT = "text";
export const FIELD_EDITOR_TYPE_TEXTAREA = "textarea";
export const FIELD_EDITOR_TYPE_NUMBER = "number";
export const FIELD_EDITOR_TYPE_BOOLEAN = "boolean";
export const FIELD_EDITOR_TYPE_DATE = "date";
export const FIELD_EDITOR_TYPE_DATETIME = "datetime";
export const FIELD_EDITOR_TYPE_CHOICE = "choice";
export const FIELD_EDITOR_TYPE_MULTI_CHOICE = "multi_choice";
export const FIELD_EDITOR_TYPE_USER = "user";
export const FIELD_EDITOR_TYPE_RELATION = "relation";
export const FIELD_EDITOR_TYPE_LINK = "link";

export const MVP_CREATABLE_FIELD_TYPES = [
  FIELD_EDITOR_TYPE_TEXT,
  FIELD_EDITOR_TYPE_TEXTAREA,
  FIELD_EDITOR_TYPE_NUMBER,
  FIELD_EDITOR_TYPE_BOOLEAN,
  FIELD_EDITOR_TYPE_DATE,
  FIELD_EDITOR_TYPE_DATETIME,
  FIELD_EDITOR_TYPE_CHOICE,
  FIELD_EDITOR_TYPE_MULTI_CHOICE,
  FIELD_EDITOR_TYPE_USER,
  FIELD_EDITOR_TYPE_LINK,
  FIELD_EDITOR_TYPE_RELATION,
];

const fieldEditorRegistry = {
  [FIELD_EDITOR_TYPE_TEXT]: TextFieldEditor,
  [FIELD_EDITOR_TYPE_TEXTAREA]: TextFieldEditor,
  [FIELD_EDITOR_TYPE_NUMBER]: NumberFieldEditor,
  [FIELD_EDITOR_TYPE_BOOLEAN]: BooleanFieldEditor,
  [FIELD_EDITOR_TYPE_DATE]: DateFieldEditor,
  [FIELD_EDITOR_TYPE_DATETIME]: DateFieldEditor,
  [FIELD_EDITOR_TYPE_CHOICE]: ChoiceFieldEditor,
  [FIELD_EDITOR_TYPE_MULTI_CHOICE]: ChoiceFieldEditor,
  [FIELD_EDITOR_TYPE_USER]: UserFieldEditor,
  [FIELD_EDITOR_TYPE_RELATION]: RelationFieldEditor,
  [FIELD_EDITOR_TYPE_LINK]: LinkFieldEditor,
};

/**
 * @param {string | null | undefined} rawType
 * @returns {string}
 */
export function normalizeFieldEditorType(rawType) {
  const normalized = String(rawType || FIELD_EDITOR_TYPE_TEXT)
    .trim()
    .toLowerCase();

  if (fieldEditorRegistry[normalized]) {
    return normalized;
  }

  return FIELD_EDITOR_TYPE_TEXT;
}

/**
 * @param {string | null | undefined} type
 */
export function getFieldEditorComponent(type) {
  return fieldEditorRegistry[normalizeFieldEditorType(type)] || TextFieldEditor;
}

/**
 * @param {string | null | undefined} type
 */
export function isCreatableFieldType(type) {
  const normalized = String(type || "").trim().toLowerCase();

  return MVP_CREATABLE_FIELD_TYPES.includes(normalizeFieldEditorType(type));
}
