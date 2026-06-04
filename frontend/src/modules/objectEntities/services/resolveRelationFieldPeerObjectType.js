import { normalizeRelationSettingsFromField } from "../../designer/components/fields/relationFieldFormUtils";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";

import { resolvePeerObjectTypeFromRelationDefinition } from "./relationFieldPeerTypeUtils";

function normalizeKey(value) {
  return String(value ?? "").trim();
}

export { resolvePeerObjectTypeFromRelationDefinition } from "./relationFieldPeerTypeUtils";

/**
 * Resolves peer object type key for a relation field from published catalog.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} anchorObjectTypeKey
 * @param {{ settings?: Record<string, unknown>, settings_json?: Record<string, unknown> } | null | undefined} field
 * @returns {string | null}
 */
export function resolveRelationFieldPeerObjectTypeKey(
  catalog,
  anchorObjectTypeKey,
  field,
) {
  const anchorKey = normalizeKey(anchorObjectTypeKey);

  if (!anchorKey || !field) {
    return null;
  }

  const objectType = findCatalogObjectType(catalog, anchorKey);

  if (!objectType) {
    return null;
  }

  const settings =
    field.settings && typeof field.settings === "object"
      ? field.settings
      : field.settings_json && typeof field.settings_json === "object"
        ? field.settings_json
        : {};

  const { relation_key: relationKey, role } = normalizeRelationSettingsFromField(
    settings,
  );

  if (!relationKey || !role) {
    return null;
  }

  const relations = Array.isArray(catalog?.relations) ? catalog.relations : [];
  const relation = relations.find(
    (item) => normalizeKey(item?.key) === relationKey,
  );

  if (!relation) {
    return null;
  }

  return resolvePeerObjectTypeFromRelationDefinition(relation, role);
}
