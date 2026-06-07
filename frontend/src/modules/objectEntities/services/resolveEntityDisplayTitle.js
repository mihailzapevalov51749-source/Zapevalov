import { resolveObjectTypeTitleFieldKey } from "../../objectViews/services/tableColumnOrder.js";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter.js";
import { resolveEntityTitle } from "./resolveEntityTitle.js";

/**
 * @param {Record<string, unknown> | null | undefined} objectType
 */
function readIsTitleFieldKey(objectType) {
  const fields = Array.isArray(objectType?.fields) ? objectType.fields : [];
  const titleField = fields.find((field) => field?.is_title || field?.isTitle);

  return String(titleField?.key || titleField?.field_key || "").trim() || null;
}

/**
 * Resolve title field key: projection.titleFieldKey → object type title field.
 *
 * @param {{
 *   objectType?: Record<string, unknown> | null,
 *   projection?: Record<string, unknown> | null,
 *   catalog?: Record<string, unknown> | null,
 *   objectTypeKey?: string | null,
 *   titleFieldKey?: string | null,
 * }} params
 * @returns {string | null}
 */
export function resolveEntityTitleFieldKey({
  objectType = null,
  projection = null,
  catalog = null,
  objectTypeKey = null,
  titleFieldKey = null,
} = {}) {
  const explicit = String(titleFieldKey || "").trim();
  if (explicit) {
    return explicit;
  }

  const resolvedObjectType =
    objectType ||
    (objectTypeKey ? findCatalogObjectType(catalog, objectTypeKey) : null);

  const fieldKeys = Array.isArray(resolvedObjectType?.fields)
    ? resolvedObjectType.fields
        .map((field) => String(field?.key || field?.field_key || "").trim())
        .filter(Boolean)
    : [];

  const projectionTitle = String(
    projection?.titleFieldKey ||
      projection?.title_field ||
      projection?.title_field_key ||
      "",
  ).trim();

  if (projectionTitle && (!fieldKeys.length || fieldKeys.includes(projectionTitle))) {
    return projectionTitle;
  }

  if (resolvedObjectType) {
    const fromObjectType = resolveObjectTypeTitleFieldKey(
      resolvedObjectType,
      fieldKeys,
    );
    if (fromObjectType) {
      return fromObjectType;
    }
  }

  return readIsTitleFieldKey(resolvedObjectType);
}

/**
 * Platform entity display title: Title Field → [id].
 *
 * @param {{
 *   entity?: Record<string, unknown> | null,
 *   objectType?: Record<string, unknown> | null,
 *   projection?: Record<string, unknown> | null,
 *   catalog?: Record<string, unknown> | null,
 *   objectTypeKey?: string | null,
 *   titleFieldKey?: string | null,
 * }} params
 * @returns {string}
 */
export function resolveEntityDisplayTitle({
  entity = null,
  objectType = null,
  projection = null,
  catalog = null,
  objectTypeKey = null,
  titleFieldKey = null,
} = {}) {
  const resolvedTitleFieldKey = resolveEntityTitleFieldKey({
    objectType,
    projection,
    catalog,
    objectTypeKey,
    titleFieldKey,
  });

  const values =
    entity?.values && typeof entity.values === "object"
      ? entity.values
      : entity && typeof entity === "object"
        ? entity
        : {};

  const fromField = resolveEntityTitle(values, resolvedTitleFieldKey);
  if (fromField) {
    return fromField;
  }

  const id = entity?.id ?? entity?.entity_id;
  return id ? `[${String(id)}]` : "—";
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {Record<string, unknown> | null | undefined} entity
 * @param {Record<string, unknown> | null | undefined} [projection]
 */
export function resolvePeerEntityLabel(
  catalog,
  objectTypeKey,
  entity,
  projection = null,
) {
  return resolveEntityDisplayTitle({
    entity,
    catalog,
    objectTypeKey,
    projection,
  });
}
