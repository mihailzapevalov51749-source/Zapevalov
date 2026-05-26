const DEFAULT_PAGINATION = {
  limit: 0,
  offset: 0,
  total: 0,
  has_more: false,
};

function normalizePagination(pagination = {}) {
  return {
    limit: Number(pagination.limit ?? DEFAULT_PAGINATION.limit),
    offset: Number(pagination.offset ?? DEFAULT_PAGINATION.offset),
    total: Number(pagination.total ?? DEFAULT_PAGINATION.total),
    has_more: Boolean(pagination.has_more ?? DEFAULT_PAGINATION.has_more),
  };
}

function normalizeWarnings(warnings) {
  if (!Array.isArray(warnings)) {
    return [];
  }
  return warnings.filter((item) => typeof item === "string" && item.trim());
}

export function createObjectListResult({
  source,
  tenantId,
  objectTypeKey,
  viewKey = null,
  items = [],
  pagination = DEFAULT_PAGINATION,
  projection = null,
  warnings = [],
  catalogVersion = null,
  schemaVersion = null,
}) {
  return {
    source,
    tenantId,
    objectTypeKey,
    viewKey,
    items: Array.isArray(items) ? items : [],
    pagination: normalizePagination(pagination),
    projection,
    warnings: normalizeWarnings(warnings),
    catalogVersion,
    schemaVersion,
    // Compatibility fields for existing consumers.
    tenant_id: tenantId,
    object_type_key: objectTypeKey,
    catalog_version: catalogVersion,
    schema_version: schemaVersion,
  };
}

export function createProjectionResult({
  source,
  tenantId,
  objectTypeKey,
  viewKey = null,
  projection = {},
  warnings = [],
}) {
  return {
    source,
    tenantId,
    objectTypeKey,
    viewKey,
    projection: projection && typeof projection === "object" ? projection : {},
    warnings: normalizeWarnings(warnings),
    // Compatibility fields for existing consumers.
    tenant_id: tenantId,
    object_type_key: objectTypeKey,
    view_key: viewKey,
  };
}
