import { mergeImportValueMappingRules } from "./applyImportValueMappings.js";
import { collectUnresolvedImportValues } from "./collectUnresolvedImportValues.js";

/**
 * @param {Parameters<typeof collectUnresolvedImportValues>} args
 */
export function buildImportValueMappings(...args) {
  const collected = collectUnresolvedImportValues(...args);

  return {
    ...collected,
    mappings: mergeImportValueMappingRules(collected.rules),
  };
}
