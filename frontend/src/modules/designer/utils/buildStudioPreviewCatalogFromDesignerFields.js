/**
 * Builds a runtime-catalog-shaped object from Studio designer field definitions.
 * Used by Studio Preview instead of getPublishedCatalog() for field labels/types.
 *
 * @param {{
 *   objectTypeKey?: string | null,
 *   objectTypeName?: string | null,
 *   fields?: Array<Record<string, unknown>> | null,
 * }} params
 */
export function buildStudioPreviewCatalogFromDesignerFields({
  objectTypeKey = null,
  objectTypeName = null,
  fields = null,
} = {}) {
  const normalizedKey = String(objectTypeKey || "").trim();

  if (!normalizedKey) {
    return null;
  }

  const designerFields = Array.isArray(fields) ? fields : [];

  return {
    object_types: [
      {
        key: normalizedKey,
        name: String(objectTypeName || normalizedKey).trim() || normalizedKey,
        fields: designerFields
          .map((field) => {
            const key = String(field?.key || "").trim();

            if (!key) {
              return null;
            }

            const fieldType = String(field?.field_type || field?.type || "text").trim();

            return {
              key,
              name: String(field?.name || key).trim() || key,
              field_type: fieldType,
              type: fieldType,
              is_system: Boolean(field?.is_system ?? field?.isSystem),
              is_required: Boolean(field?.is_required ?? field?.isRequired),
              settings_json:
                field?.settings_json && typeof field.settings_json === "object"
                  ? field.settings_json
                  : field?.settings && typeof field.settings === "object"
                    ? field.settings
                    : {},
            };
          })
          .filter(Boolean),
      },
    ],
  };
}
