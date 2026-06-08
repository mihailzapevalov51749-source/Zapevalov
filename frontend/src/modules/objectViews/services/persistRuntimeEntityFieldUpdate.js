import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { buildEntityUpdatePayload } from "../../objectEntities/services/buildEntityUpdatePayload";
import { runtimeWriteGateway } from "../../runtimeWriteGateway";
import { isCreatableFieldType } from "../../../shared/fieldEditors/fieldEditorRegistry";

/**
 * Shared runtime field update pipeline (Object Table inline edit + Plan inline edit).
 *
 * @param {{
 *   tenantId: number | string,
 *   objectTypeKey: string,
 *   entityId: string,
 *   fieldKey: string,
 *   fieldDef: { key?: string, rawFieldType?: string, type?: string, isRequired?: boolean } | null,
 *   nextValue: unknown,
 * }} params
 */
export async function persistRuntimeEntityFieldUpdate({
  tenantId,
  objectTypeKey,
  entityId,
  fieldKey,
  fieldDef,
  nextValue,
}) {
  if (!tenantId || !objectTypeKey || !entityId || !fieldKey || !fieldDef) {
    throw new Error("Недостаточно данных для сохранения поля");
  }

  if (!isCreatableFieldType(fieldDef.rawFieldType || fieldDef.type)) {
    throw new Error("Поле недоступно для редактирования");
  }

  const key = String(fieldKey).trim();
  const { values, fieldErrors } = buildEntityUpdatePayload(
    { [key]: nextValue },
    [
      {
        key,
        rawFieldType: fieldDef.rawFieldType || fieldDef.type,
        isRequired: fieldDef.isRequired === true,
      },
    ],
  );

  if (Object.keys(fieldErrors).length > 0) {
    throw new Error(fieldErrors[key] || "Некорректное значение");
  }

  try {
    await runtimeWriteGateway.updateEntity({
      tenantId,
      objectTypeKey,
      entityId: String(entityId),
      values,
    });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Не удалось сохранить изменение"));
  }

  return values;
}
