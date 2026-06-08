export const AUTO_LINK_PARTIAL_SUCCESS_WARNING =
  "Запись создана, но связь не была создана.";

/**
 * @param {{
 *   tenantId: number,
 *   action: Record<string, unknown> | null | undefined,
 *   sourceEntityId: string | null | undefined,
 *   targetEntityId: string | null | undefined,
 *   createRelation?: (tenantId: number, relationKey: string, payload: {
 *     source_entity_id: string,
 *     target_entity_id: string,
 *   }) => Promise<unknown>,
 * }} params
 */
export async function submitAutoLinkRelation({
  tenantId,
  action,
  sourceEntityId,
  targetEntityId,
  createRelation,
}) {
  if (!action?.auto_link_enabled || !action?.auto_link_relation_key) {
    return { linked: false, skipped: true };
  }

  const normalizedSourceEntityId = String(sourceEntityId || "").trim();
  const normalizedTargetEntityId = String(targetEntityId || "").trim();
  const relationKey = String(action.auto_link_relation_key || "").trim();

  if (!normalizedSourceEntityId) {
    return { linked: false, skipped: true };
  }

  if (!tenantId || !relationKey || !normalizedTargetEntityId) {
    return {
      linked: false,
      skipped: false,
      warning: AUTO_LINK_PARTIAL_SUCCESS_WARNING,
    };
  }

  if (!createRelation) {
    return {
      linked: false,
      skipped: false,
      warning: AUTO_LINK_PARTIAL_SUCCESS_WARNING,
    };
  }

  try {
    await createRelation(tenantId, relationKey, {
      source_entity_id: normalizedSourceEntityId,
      target_entity_id: normalizedTargetEntityId,
    });

    return { linked: true, skipped: false };
  } catch {
    return {
      linked: false,
      skipped: false,
      warning: AUTO_LINK_PARTIAL_SUCCESS_WARNING,
    };
  }
}
