export const CREATE_RECORD_ACTION_TYPE = "create_record";

function resolveCreateError(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/**
 * @param {{
 *   tenantId: number,
 *   objectTypeKey: string,
 *   action: Record<string, unknown> | null | undefined,
 *   formValues: Record<string, unknown>,
 *   fields?: Array<Record<string, unknown>>,
 *   buildPayload: (formValues: Record<string, unknown>, fields: Array<Record<string, unknown>>) => {
 *     values: Record<string, unknown>,
 *     fieldErrors: Record<string, string>,
 *   },
 *   createEntity: (params: {
 *     tenantId: number,
 *     objectTypeKey: string,
 *     values: Record<string, unknown>,
 *   }) => Promise<Record<string, unknown>>,
 *   submitRelationLinks: (params: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>,
 *   submitAutoLinkRelation?: (params: Record<string, unknown>) => Promise<{
 *     linked?: boolean,
 *     skipped?: boolean,
 *     warning?: string,
 *   }>,
 *   sourceEntityId?: string | null,
 *   formatRelationFailures?: (failures: Array<Record<string, unknown>>) => string,
 * }} params
 */
export async function executeCreateRecordActionCore({
  tenantId,
  objectTypeKey,
  action,
  formValues,
  fields = [],
  buildPayload,
  createEntity,
  submitRelationLinks,
  submitAutoLinkRelation,
  sourceEntityId = null,
  formatRelationFailures = () => "",
}) {
  if (action?.action_type_key !== CREATE_RECORD_ACTION_TYPE) {
    return {
      success: false,
      entityId: null,
      error: "Действие не поддерживается исполнителем create_record",
    };
  }

  if (!tenantId || !objectTypeKey) {
    return {
      success: false,
      entityId: null,
      error: "Не задан контекст объекта",
    };
  }

  const { values, fieldErrors } = buildPayload(formValues, fields);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      entityId: null,
      fieldErrors,
      error: "Проверьте заполнение полей",
    };
  }

  try {
    const entity = await createEntity({
      tenantId,
      objectTypeKey,
      values,
    });

    const entityId = String(entity?.id || "").trim();

    if (!entityId) {
      return {
        success: false,
        entityId: null,
        error: "Запись создана, но не получен ID",
      };
    }

    const relationLinkFailures = await submitRelationLinks({
      tenantId,
      entityId,
      fields,
      formValues,
    });

    const autoLinkResult = submitAutoLinkRelation
      ? await submitAutoLinkRelation({
          tenantId,
          action,
          sourceEntityId,
          targetEntityId: entityId,
        })
      : { linked: false, skipped: true };

    if (relationLinkFailures.length > 0) {
      return {
        success: true,
        entityId,
        entity,
        relationLinkFailures,
        warning: formatRelationFailures(relationLinkFailures),
      };
    }

    if (autoLinkResult?.warning) {
      return {
        success: true,
        entityId,
        entity,
        warning: autoLinkResult.warning,
      };
    }

    return {
      success: true,
      entityId,
      entity,
    };
  } catch (error) {
    const status = error?.response?.status;
    const fallback =
      status === 403
        ? "Нет доступа для создания записи"
        : "Не удалось создать запись";

    return {
      success: false,
      entityId: null,
      error: resolveCreateError(error, fallback),
    };
  }
}
