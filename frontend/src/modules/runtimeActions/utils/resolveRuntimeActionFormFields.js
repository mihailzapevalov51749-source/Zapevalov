import { mapFieldForCreateForm } from "../../objectViews/entity/mapFieldForCreateForm.js";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter.js";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

export function resolveRuntimeActionFormFields(
  catalog,
  objectTypeKey,
  actionForm,
  options = {},
) {
  const fieldsObjectTypeKey =
    String(options?.fieldsObjectTypeKey || "").trim() || objectTypeKey;
  const objectType = findCatalogObjectType(catalog, fieldsObjectTypeKey);

  if (!objectType || !actionForm || !Array.isArray(actionForm.fields)) {
    return [];
  }

  const catalogFields = Array.isArray(objectType.fields) ? objectType.fields : [];
  const catalogFieldByKey = new Map(
    catalogFields
      .map((field) => [normalizeKey(field?.key), field])
      .filter(([key]) => Boolean(key)),
  );

  const result = [];

  for (const formField of actionForm.fields) {
    if (formField?.is_visible === false) {
      continue;
    }

    const fieldKey = normalizeKey(formField?.field_key);
    const catalogField = catalogFieldByKey.get(fieldKey);

    if (!catalogField) {
      continue;
    }

    const mappedField = mapFieldForCreateForm(catalogField, {
      label:
        normalizeKey(formField?.label_override) ||
        String(catalogField.name || catalogField.key || fieldKey),
      placeholder: formField?.placeholder ?? catalogField.placeholder ?? "",
      helpText: formField?.help_text ?? "",
      isRequired: Boolean(formField?.required),
    });

    if (!mappedField) {
      continue;
    }

    result.push(mappedField);
  }

  return result;
}
