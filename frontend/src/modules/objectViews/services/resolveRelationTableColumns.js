import {
  isRelationFieldType,
  normalizeRelationSettingsFromField,
} from "../../designer/components/fields/relationFieldFormUtils";
import { resolveRelationFieldPeerObjectTypeKey } from "../../objectEntities/services/resolveRelationFieldPeerObjectType";
import { findCatalogObjectType } from "../table/services/adapters/ObjectTypeTableAdapter";

/**
 * @param {import("../../../shared/viewEngine/contracts").ViewEngineColumn[]} columns
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function resolveRelationTableColumns(columns = [], catalog = null, objectTypeKey = null) {
  const anchorKey = String(objectTypeKey ?? "").trim();

  return (Array.isArray(columns) ? columns : [])
    .filter((column) => {
      const fieldDef = column?.fieldDef;
      const rawType = String(
        fieldDef?.rawFieldType || fieldDef?.type || column?.type || "",
      ).toLowerCase();

      return isRelationFieldType(rawType);
    })
    .map((column) => {
      const fieldDef = column.fieldDef || {};
      const settings =
        fieldDef.settings && typeof fieldDef.settings === "object"
          ? fieldDef.settings
          : {};

      const normalizedSettings = normalizeRelationSettingsFromField(settings);
      const objectType = findCatalogObjectType(catalog, anchorKey);
      const catalogField = (objectType?.fields || []).find(
        (field) => String(field?.key || "").trim() === String(column.key || "").trim(),
      );

      const peerObjectTypeKey = resolveRelationFieldPeerObjectTypeKey(
        catalog,
        anchorKey,
        catalogField || { settings_json: normalizedSettings },
      );

      return {
        key: String(column.key || "").trim(),
        label: String(column.label || column.key || "").trim(),
        cardinality: normalizedSettings.cardinality || "one",
        relation_key: normalizedSettings.relation_key,
        role: normalizedSettings.role,
        peerObjectTypeKey,
      };
    })
    .filter((column) => column.key);
}
