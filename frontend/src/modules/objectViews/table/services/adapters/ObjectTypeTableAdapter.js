import { projectionToColumns } from "./projectionToColumns";
import { mapEntitiesToRows } from "./mapEntityToRow";

/**
 * @param {unknown} pagination
 * @returns {import("../../../../../shared/viewEngine/contracts").ViewEnginePagination}
 */
export function normalizeViewEnginePagination(pagination) {
  const source =
    pagination && typeof pagination === "object" ? pagination : {};

  return {
    limit: Number(source.limit ?? 0),
    offset: Number(source.offset ?? 0),
    total: Number(source.total ?? 0),
    hasMore: Boolean(source.has_more ?? source.hasMore ?? false),
  };
}

/**
 * @param {unknown} sort
 * @param {import("../../../../../shared/viewEngine/contracts").ViewEngineProjection | null | undefined} [projection]
 * @returns {import("../../../../../shared/viewEngine/contracts").ViewEngineSortState}
 */
export function normalizeViewEngineSort(sort, projection) {
  const source = sort && typeof sort === "object" ? sort : {};
  const defaultSort = projection?.default_sort;

  const order =
    source.order === "asc" || source.order === "desc"
      ? source.order
      : defaultSort?.order === "asc" || defaultSort?.order === "desc"
        ? defaultSort.order
        : "desc";

  const field =
    typeof source.field === "string" && source.field.trim()
      ? source.field.trim()
      : typeof source.sort === "string" && source.sort.trim()
        ? source.sort.trim()
        : typeof defaultSort?.field === "string" && defaultSort.field.trim()
          ? defaultSort.field.trim()
          : "created_at";

  return { field, order };
}

/**
 * @param {{
 *   objectType?: Record<string, unknown> | null,
 *   objectTypeKey?: string | null,
 *   fields?: Array<Record<string, unknown>>,
 *   projection?: import("../../../../../shared/viewEngine/contracts").ViewEngineProjection | null,
 *   entities?: Array<Record<string, unknown>>,
 *   pagination?: Record<string, unknown> | null,
 *   sort?: Record<string, unknown> | null,
 *   viewKey?: string | null,
 *   catalogVersion?: number | null,
 *   schemaVersion?: number | null,
 *   warnings?: string[],
 *   columnOptions?: Parameters<typeof projectionToColumns>[0]["options"],
 * }} params
 */
export function buildObjectTypeTableModel({
  objectType = null,
  objectTypeKey = null,
  fields = [],
  projection = null,
  entities = [],
  pagination = null,
  sort = null,
  viewKey = null,
  catalogVersion = null,
  schemaVersion = null,
  warnings = [],
  columnOptions = undefined,
}) {
  const resolvedObjectTypeKey = String(
    objectTypeKey ||
      objectType?.key ||
      objectType?.object_type_key ||
      "",
  ).trim();

  const columns = projectionToColumns({
    projection,
    fields,
    options: columnOptions,
  });

  const rows = mapEntitiesToRows(entities, columns);
  const normalizedSort = normalizeViewEngineSort(sort, projection);

  const titleFieldKey =
    typeof projection?.title_field === "string"
      ? projection.title_field
      : columns.find((column) => column.isTitle)?.key || null;

  return {
    objectTypeKey: resolvedObjectTypeKey,
    viewKey: viewKey ?? null,
    titleFieldKey,
    columns,
    rows,
    pagination: normalizeViewEnginePagination(pagination),
    sort: normalizedSort,
    catalogVersion:
      catalogVersion != null
        ? Number(catalogVersion)
        : objectType?.catalog_version != null
          ? Number(objectType.catalog_version)
          : null,
    schemaVersion:
      schemaVersion != null
        ? Number(schemaVersion)
        : objectType?.schema_version != null
          ? Number(objectType.schema_version)
          : null,
    warnings: Array.isArray(warnings)
      ? warnings.filter((item) => typeof item === "string" && item.trim())
      : [],
  };
}

export function findCatalogObjectType(catalog, objectTypeKey) {
  const key = String(objectTypeKey || "").trim();

  if (!key || !catalog || typeof catalog !== "object") {
    return null;
  }

  const objectTypes = Array.isArray(catalog.object_types)
    ? catalog.object_types
    : [];

  return (
    objectTypes.find(
      (item) =>
        item &&
        typeof item === "object" &&
        String(item.key || "") === key,
    ) || null
  );
}

export function getObjectTypeFields(objectType) {
  if (!objectType || typeof objectType !== "object") {
    return [];
  }

  return Array.isArray(objectType.fields) ? objectType.fields : [];
}

export function buildObjectTypeTableModelFromCatalog({
  catalog = null,
  objectTypeKey,
  projection = null,
  listResult = null,
  viewKey = null,
  sort = null,
  warnings = [],
  columnOptions = undefined,
}) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = getObjectTypeFields(objectType);

  return buildObjectTypeTableModel({
    objectType,
    objectTypeKey,
    fields,
    projection,
    entities: listResult?.items,
    pagination: listResult?.pagination,
    sort,
    viewKey: viewKey ?? listResult?.viewKey ?? listResult?.view_key ?? null,
    catalogVersion:
      listResult?.catalogVersion ?? listResult?.catalog_version ?? null,
    schemaVersion:
      listResult?.schemaVersion ?? listResult?.schema_version ?? null,
    warnings,
    columnOptions,
  });
}
