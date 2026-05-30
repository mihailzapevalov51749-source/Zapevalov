/**
 * Maps ViewEngineFieldDef to the column shape expected by FieldValueRenderer / choiceUtils.
 *
 * @param {import("../contracts").ViewEngineFieldDef | null | undefined} fieldDef
 * @returns {Record<string, unknown>}
 */
export function fieldDefToRendererColumn(fieldDef) {
  if (!fieldDef) {
    return {
      id: "",
      key: "",
      type: "text",
      title: "",
      options: [],
      settings: {},
    };
  }

  return {
    id: fieldDef.key,
    key: fieldDef.key,
    type: fieldDef.type,
    title: fieldDef.label,
    label: fieldDef.label,
    options: fieldDef.options || fieldDef.settings?.options || [],
    settings: fieldDef.settings || {},
    align: fieldDef.align,
    multiple: fieldDef.multiple,
  };
}
