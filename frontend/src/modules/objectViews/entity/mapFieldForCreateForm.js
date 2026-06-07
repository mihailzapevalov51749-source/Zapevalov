import { isRelationFieldType } from "../../designer/components/fields/relationFieldFormUtils.js";
import { catalogFieldToFieldDef } from "../table/services/adapters/catalogFieldToFieldDef.js";

/**
 * Maps published catalog field to runtime create-form field def.
 *
 * @param {Record<string, unknown>} field
 * @param {Record<string, unknown>} [overrides]
 */
export function mapFieldForCreateForm(field, overrides = {}) {
  const rawType = String(field.field_type || field.type || "")
    .trim()
    .toLowerCase();
  const fieldDef = catalogFieldToFieldDef(field);

  if (!fieldDef) {
    return null;
  }

  if (isRelationFieldType(rawType)) {
    return {
      ...fieldDef,
      rawFieldType: "relation",
      type: "relation",
      settings: fieldDef.settings,
      multiple: false,
      ...overrides,
    };
  }

  return {
    ...fieldDef,
    rawFieldType: rawType,
    type: rawType === "multi_choice" ? "choice" : fieldDef.type,
    multiple: rawType === "multi_choice" || fieldDef.multiple,
    ...overrides,
  };
}
