import {
  filterRelationCreateFields,
  normalizeRelationFormValue,
} from "./relationFormValueUtils.js";

/**
 * @typedef {Object} RelationLinkFailure
 * @property {string} fieldKey
 * @property {string} fieldLabel
 * @property {string} targetEntityId
 * @property {string} message
 */

/**
 * @param {{
 *   tenantId: number,
 *   entityId: string,
 *   fields?: Array<Record<string, unknown>>,
 *   formValues?: Record<string, unknown>,
 *   createRelationFieldLink: (
 *     tenantId: number,
 *     entityId: string,
 *     fieldKey: string,
 *     payload: { target_entity_id: string },
 *   ) => Promise<unknown>,
 *   mapError?: (error: unknown, fallback: string) => string,
 * }} params
 * @returns {Promise<RelationLinkFailure[]>}
 */
export async function submitPendingRelationLinksCore({
  tenantId,
  entityId,
  fields = [],
  formValues = {},
  createRelationFieldLink,
  mapError = (error, fallback) =>
    error instanceof Error && error.message ? error.message : fallback,
}) {
  const normalizedEntityId = String(entityId ?? "").trim();
  const relationFields = filterRelationCreateFields(fields);
  /** @type {RelationLinkFailure[]} */
  const failures = [];

  if (!normalizedEntityId || !relationFields.length) {
    return failures;
  }

  for (const field of relationFields) {
    const fieldKey = String(field.key || "").trim();

    if (!fieldKey) {
      continue;
    }

    const targetIds = normalizeRelationFormValue(formValues[fieldKey]);

    for (const targetEntityId of targetIds) {
      try {
        await createRelationFieldLink(tenantId, normalizedEntityId, fieldKey, {
          target_entity_id: targetEntityId,
        });
      } catch (error) {
        failures.push({
          fieldKey,
          fieldLabel: String(field.label || fieldKey).trim(),
          targetEntityId,
          message: mapError(error, "Не удалось установить связь"),
        });
      }
    }
  }

  return failures;
}

/**
 * @param {RelationLinkFailure[]} failures
 * @returns {string}
 */
export function formatRelationLinkFailuresMessage(failures = []) {
  if (!Array.isArray(failures) || failures.length === 0) {
    return "";
  }

  const details = failures
    .map((failure) => {
      const label = failure.fieldLabel || failure.fieldKey;
      return `${label}: ${failure.message}`;
    })
    .join("\n");

  return `Запись создана, но часть связей не была установлена.\n${details}`;
}
