import * as runtimeQueryApi from "../../designer/api/runtimeQueryApi";
import {
  createObjectListResult,
  createProjectionResult,
} from "../contracts/runtimeReadContracts";

export const queryReadProvider = {
  async getObjectList(params) {
    const {
      tenantId,
      objectTypeKey,
      viewKey = null,
      limit = 20,
      offset = 0,
      sort = "created_at",
      order = "desc",
      filters = {},
    } = params;

    const response = await runtimeQueryApi.queryRuntimeEntities(tenantId, objectTypeKey, {
      limit,
      offset,
      sort,
      order,
      ...(filters && typeof filters === "object" ? filters : {}),
    });

    return createObjectListResult({
      source: "query",
      tenantId: response?.tenant_id ?? tenantId,
      objectTypeKey: response?.object_type_key ?? objectTypeKey,
      viewKey,
      items: response?.items || [],
      pagination: response?.pagination || {},
      projection: null,
      warnings: [],
      catalogVersion: response?.catalog_version ?? null,
      schemaVersion: response?.schema_version ?? null,
    });
  },

  async getProjection(params) {
    const { tenantId, objectTypeKey, viewKey = null } = params;
    const response = await runtimeQueryApi.getViewProjectionMetadata(
      tenantId,
      objectTypeKey,
      viewKey,
    );

    return createProjectionResult({
      source: "query",
      tenantId: response?.tenant_id ?? tenantId,
      objectTypeKey: response?.object_type_key ?? objectTypeKey,
      viewKey: response?.view_key ?? viewKey,
      projection: response?.projection || {},
      objectView: response?.object_view ?? response?.objectView ?? null,
      filtersJson: response?.filters_json ?? response?.filtersJson ?? null,
      publishedView: response?.view ?? null,
      warnings: [],
    });
  },
};
