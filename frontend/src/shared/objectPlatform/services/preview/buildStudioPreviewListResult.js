import { hasHierarchySubtasksFeature } from "../../../relation/hierarchyRelationProfile.js";
import { contractToDisplayProjection } from "../../../../modules/objectViews/services/columnPresentationUtils.js";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../../../../modules/objectViews/table/services/adapters/ObjectTypeTableAdapter.js";
import { resolveProjectionFieldKeys } from "../../../../modules/objectViews/table/services/adapters/projectionToColumns.js";
import { buildObjectTabPreviewMockRows } from "./buildObjectTabPreviewMockRows.js";

/**
 * @param {{
 *   catalog?: object | null,
 *   objectTypeKey?: string | null,
 *   contract?: object | null,
 *   runtimeProjection?: object | null,
 *   hierarchyEnabled?: boolean,
 *   viewKey?: string | null,
 * }} params
 */
export function buildStudioPreviewListResult({
  catalog = null,
  objectTypeKey = null,
  contract = null,
  runtimeProjection = null,
  viewKey = null,
} = {}) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const hierarchyEnabled = hasHierarchySubtasksFeature(catalog, objectTypeKey);
  const fields = getObjectTypeFields(objectType);
  const displayProjection = contract
    ? contractToDisplayProjection(contract, runtimeProjection, {
        objectType,
        catalog,
        objectTypeKey,
        publishedViewKey: String(viewKey || "").trim() || null,
      })
    : runtimeProjection;

  const visibleFieldKeys = resolveProjectionFieldKeys(
    displayProjection,
    fields.map((field) => String(field?.key || "").trim()).filter(Boolean),
  );

  const titleFieldKey =
    typeof displayProjection?.title_field === "string"
      ? displayProjection.title_field
      : null;

  const mock = buildObjectTabPreviewMockRows({
    fields,
    visibleFieldKeys,
    titleFieldKey,
    objectTypeName: String(objectType?.name || "").trim(),
    hierarchyEnabled,
  });

  return {
    listResult: {
      items: mock.items,
      pagination: mock.pagination,
      viewKey,
      view_key: viewKey,
      __previewMock: true,
    },
    hierarchyInstances: mock.hierarchyInstances,
  };
}
