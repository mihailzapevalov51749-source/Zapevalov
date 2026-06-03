import { buildInitialCreateFormValues } from "../../objectViews/entity/buildCreateEntityPayload";
import { getCreatableFields } from "../../objectViews/entity/getCreatableFields";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";
import { buildInitialFormValuesFromEntity } from "./buildEntityUpdatePayload";
import { resolveEntityTitle } from "./resolveEntityTitle";

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
  const editableFields = getCreatableFields(catalog, objectTypeKey);

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
    editableFields,
    formValues: buildInitialCreateFormValues(editableFields),
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

  const editableFields = getCreatableFields(catalog, objectTypeKey);

  const title =
    resolveEntityTitle(entityValues, titleFieldKey) ||
    String(objectTypeKey || "Объект");

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
    systemFields: [
      {
        key: "id",
        label: "ID",
        value: entityId || "—",
      },
      {
        key: "status",
        label: "Статус",
        value: status,
      },
      {
        key: "created_at",
        label: "Создан",
        value: formatTimestamp(entity?.created_at ?? entity?.createdAt),
      },
      {
        key: "updated_at",
        label: "Изменён",
        value: formatTimestamp(entity?.updated_at ?? entity?.updatedAt),
      },
    ],
    editableFields,
    formValues: buildInitialFormValuesFromEntity(entity, editableFields),
    rawEntity: entity,
  };
}
