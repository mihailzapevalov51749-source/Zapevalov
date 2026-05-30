import TextValueRenderer from "./text/TextValueRenderer";
import NumberValueRenderer from "./number/NumberValueRenderer";
import DateValueRenderer from "./date/DateValueRenderer";
import ChoiceValueRenderer from "./choice/ChoiceValueRenderer";
import UserValueRenderer from "./user/UserValueRenderer";
import FileValueRenderer from "./file/FileValueRenderer";
import LinkValueRenderer from "./link/LinkValueRenderer";
import LookupValueRenderer from "./lookup/LookupValueRenderer";
import BooleanValueRenderer from "./boolean/BooleanValueRenderer";
import TableValueRenderer from "./table/TableValueRenderer";

export const FIELD_TYPE_TEXT = "text";
export const FIELD_TYPE_NUMBER = "number";
export const FIELD_TYPE_DATE = "date";
export const FIELD_TYPE_CHOICE = "choice";
export const FIELD_TYPE_USER = "user";
export const FIELD_TYPE_FILE = "file";
export const FIELD_TYPE_LINK = "link";
export const FIELD_TYPE_LOOKUP = "lookup";
export const FIELD_TYPE_BOOLEAN = "boolean";
export const FIELD_TYPE_TABLE = "table";

export const fieldTypeRegistry = {
  [FIELD_TYPE_TEXT]: {
    type: FIELD_TYPE_TEXT,
    renderer: TextValueRenderer,
  },

  [FIELD_TYPE_NUMBER]: {
    type: FIELD_TYPE_NUMBER,
    renderer: NumberValueRenderer,
  },

  [FIELD_TYPE_DATE]: {
    type: FIELD_TYPE_DATE,
    renderer: DateValueRenderer,
  },

  [FIELD_TYPE_CHOICE]: {
    type: FIELD_TYPE_CHOICE,
    renderer: ChoiceValueRenderer,
  },

  [FIELD_TYPE_USER]: {
    type: FIELD_TYPE_USER,
    renderer: UserValueRenderer,
  },

  [FIELD_TYPE_FILE]: {
    type: FIELD_TYPE_FILE,
    renderer: FileValueRenderer,
  },

  [FIELD_TYPE_LINK]: {
    type: FIELD_TYPE_LINK,
    renderer: LinkValueRenderer,
  },

  [FIELD_TYPE_LOOKUP]: {
    type: FIELD_TYPE_LOOKUP,
    renderer: LookupValueRenderer,
  },

  [FIELD_TYPE_BOOLEAN]: {
    type: FIELD_TYPE_BOOLEAN,
    renderer: BooleanValueRenderer,
  },

  [FIELD_TYPE_TABLE]: {
    type: FIELD_TYPE_TABLE,
    renderer: TableValueRenderer,
  },
};

export function normalizeFieldType(type) {
  const normalizedType = String(type || FIELD_TYPE_TEXT).trim();

  if (fieldTypeRegistry[normalizedType]) {
    return normalizedType;
  }

  return FIELD_TYPE_TEXT;
}

export function getFieldTypeConfig(type) {
  return fieldTypeRegistry[normalizeFieldType(type)];
}

export function getFieldValueRenderer(type) {
  return getFieldTypeConfig(type)?.renderer || TextValueRenderer;
}