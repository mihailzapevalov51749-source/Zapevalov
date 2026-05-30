import { normalizeFieldType } from "../../../../../shared/fieldTypes/fieldTypeRegistry";

/**
 * Maps a published-catalog or designer field definition to ViewEngineFieldDef.
 *
 * @param {Record<string, unknown> | null | undefined} field
 * @returns {import("../../../../../shared/viewEngine/contracts").ViewEngineFieldDef | null}
 */
export function catalogFieldToFieldDef(field) {
  if (!field || typeof field !== "object") {
    return null;
  }

  const key = String(field.key || "").trim();

  if (!key) {
    return null;
  }

  const rawType = String(field.field_type || field.type || "text").trim();
  const settings =
    field.settings_json && typeof field.settings_json === "object"
      ? field.settings_json
      : field.settings && typeof field.settings === "object"
        ? field.settings
        : {};

  const isMultiChoice = rawType === "multi_choice";
  const type = isMultiChoice ? "choice" : normalizeFieldType(rawType);

  const options = Array.isArray(settings.options) ? settings.options : [];

  return {
    key,
    type,
    label: String(field.name || field.label || key),
    settings,
    options,
    align: typeof settings.align === "string" ? settings.align : "left",
    multiple: isMultiChoice || Boolean(settings.multiple),
    isRequired: Boolean(field.is_required ?? field.isRequired),
    isSystem: Boolean(field.is_system ?? field.isSystem),
  };
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} fields
 * @returns {Map<string, import("../../../../../shared/viewEngine/contracts").ViewEngineFieldDef>}
 */
export function catalogFieldsToFieldDefMap(fields) {
  const map = new Map();

  if (!Array.isArray(fields)) {
    return map;
  }

  for (const field of fields) {
    const fieldDef = catalogFieldToFieldDef(field);

    if (fieldDef) {
      map.set(fieldDef.key, fieldDef);
    }
  }

  return map;
}
