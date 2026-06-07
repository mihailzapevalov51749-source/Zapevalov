import { buildInitialCreateFormValues } from "../../objectViews/entity/buildCreateEntityPayload";
import { getCreatableFields } from "../../objectViews/entity/getCreatableFields";
import { getEntityCardLayoutFields } from "../../objectViews/entity/getEntityCardLayoutFields";
import { getReadableSystemFields } from "../../objectViews/entity/getReadableSystemFields";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";
import { buildInitialFormValuesFromEntity } from "./buildEntityUpdatePayload";
import { resolveEntityDisplayTitle } from "./resolveEntityDisplayTitle.js";

function formatTimestamp(value) {
  if (value == null || value === "") {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ru-RU");
}

/**
 * Card model for create session (no persisted entity yet).
 */
export function buildCreateCardModel({
  catalog,
  objectTypeKey,
  tenantId,
  titleFieldKey = null,
}) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const objectTypeName = String(objectType?.name || objectTypeKey || "запись").trim();
  const layoutFields = getEntityCardLayoutFields(catalog, objectTypeKey);
  const creatableFields = getCreatableFields(catalog, objectTypeKey);

  return {
    entityId: null,
    isCreate: true,
    createTitle: `Новая ${objectTypeName}`,
    tenantId,
    objectTypeKey,
    title: `Новая ${objectTypeName}`,
    status: "—",
    createdAt: null,
    updatedAt: null,
    titleFieldKey: titleFieldKey || null,
    systemFields: [],
    readOnlyFields: [],
    editableFields: layoutFields,
    formValues: buildInitialCreateFormValues(creatableFields),
    rawEntity: null,
  };
}

/**
 * @param {{
 *   entity: Record<string, unknown>,
 *   catalog: Record<string, unknown> | null | undefined,
 *   objectTypeKey: string,
 *   tenantId: number | null,
 *   titleFieldKey?: string | null,
 * }} params
 */
export function mapRuntimeEntityToCardModel({
  entity,
  catalog,
  objectTypeKey,
  tenantId,
  titleFieldKey = null,
}) {
  const entityValues =
    entity?.values && typeof entity.values === "object" ? entity.values : {};

  const layoutFields = getEntityCardLayoutFields(catalog, objectTypeKey);
  const creatableFields = getCreatableFields(catalog, objectTypeKey);
  const readOnlyFields = getReadableSystemFields(catalog, objectTypeKey);

  const title = resolveEntityDisplayTitle({
    entity,
    catalog,
    objectTypeKey,
    titleFieldKey,
  });

  const entityId = String(entity?.id || "");
  const status = String(entity?.status || "—");

  return {
    entityId,
    isCreate: false,
    createTitle: null,
    tenantId,
    objectTypeKey,
    title,
    status,
    createdAt: entity?.created_at ?? entity?.createdAt ?? null,
    updatedAt: entity?.updated_at ?? entity?.updatedAt ?? null,
    titleFieldKey: titleFieldKey || null,
    systemFields: [],
    readOnlyFields,
    editableFields: layoutFields,
    formValues: buildInitialFormValuesFromEntity(entity, creatableFields),
    rawEntity: entity,
  };
}
