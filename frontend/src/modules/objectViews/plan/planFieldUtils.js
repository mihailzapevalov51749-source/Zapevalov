import { normalizeChoiceValue, getColumnOptions, getOptionLabel } from "../../../shared/fieldTypes/choice/choiceUtils.js";

import { fieldDefToRendererColumn } from "../../../shared/viewEngine/utils/fieldDefToRendererColumn.js";

import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter.js";



/**

 * @param {Record<string, unknown> | null | undefined} field

 */

export function catalogFieldToRendererColumn(field) {

  if (!field || typeof field !== "object") {

    return fieldDefToRendererColumn(null);

  }



  const settings =

    field.settings_json && typeof field.settings_json === "object"

      ? field.settings_json

      : field.settings && typeof field.settings === "object"

        ? field.settings

        : {};



  return fieldDefToRendererColumn({

    key: String(field.key || "").trim(),

    type: String(field.field_type || field.type || "text").trim(),

    label: String(field.name || field.label || field.key || "").trim(),

    settings,

    options: settings.options || field.options || [],

  });

}



/**

 * Resolves display label/color from runtime value using object field settings (same as Table).

 *

 * @param {unknown} rawValue

 * @param {Record<string, unknown> | null | undefined} field

 * @returns {{ label: string, color: string }}

 */

export function resolvePlanFieldDisplayValue(rawValue, field) {

  if (rawValue == null || rawValue === "") {

    return { label: "—", color: "" };

  }



  if (!field) {

    return { label: String(rawValue), color: "" };

  }



  const column = catalogFieldToRendererColumn(field);

  const normalized = normalizeChoiceValue(rawValue, column);

  const label =

    normalized.label && normalized.label !== "—"

      ? String(normalized.label)

      : String(rawValue);



  return {

    label,

    color: normalized.color || "",

  };

}



/**

 * @param {object | null | undefined} catalog

 * @param {string | null | undefined} objectTypeKey

 * @param {string | null | undefined} statusFieldKey

 */

export function resolvePlanStatusField(catalog, objectTypeKey, statusFieldKey) {

  const key = String(statusFieldKey || "").trim();

  if (!key) {

    return null;

  }

  const objectType = findCatalogObjectType(catalog, objectTypeKey);

  const fields = Array.isArray(objectType?.fields) ? objectType.fields : [];



  return (

    fields.find((field) => String(field?.key ?? "").trim() === key) ||

    fields.find((field) => String(field?.type ?? "").toLowerCase() === "status") ||

    null

  );

}



/**

 * @param {Record<string, unknown> | null | undefined} field

 */

export function resolvePlanStatusOptions(field) {

  const column = catalogFieldToRendererColumn(field);



  return getColumnOptions(column)

    .map((option) => {

      const label = getOptionLabel(option);

      const value = String(

        option?.key ?? option?.value ?? option?.id ?? label ?? "",

      ).trim();



      if (!value) {

        return null;

      }



      return { value, label: label || value };

    })

    .filter(Boolean);

}


