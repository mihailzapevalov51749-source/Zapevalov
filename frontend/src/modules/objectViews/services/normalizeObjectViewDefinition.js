import {
  createEmptyObjectViewContract,
  DEFAULT_OBJECT_VIEW_QUERY,
  OBJECT_VIEW_CONTRACT_SCHEMA_VERSION,
} from "./objectViewContract";
import { applyContractGuards, normalizePresentationTable } from "./contractGuards";
import { syncObjectViewContractWithCatalog } from "./syncProjectionWithCatalogFields";

function withCatalogProjectionSync(contract, fallback = {}) {
  if (!contract) {
    return contract;
  }

  if (!fallback.catalog && !fallback.catalogFields?.length) {
    return contract;
  }

  return syncObjectViewContractWithCatalog(
    contract,
    fallback.catalog,
    fallback.objectTypeKey,
  );
}

/**
 * Legacy runtime/catalog projection (snake_case).
 * @param {Record<string, unknown> | null | undefined} projection
 */
export function legacyProjectionToFieldKeys(projection) {
  if (!projection || typeof projection !== "object") {
    return { fieldKeys: [], fieldOrder: [], titleFieldKey: null };
  }

  const fieldOrder = Array.isArray(projection.field_order)
    ? projection.field_order.map(String).filter(Boolean)
    : [];

  const visibleFields = Array.isArray(projection.visible_fields)
    ? projection.visible_fields.map(String).filter(Boolean)
    : [];

  const fieldKeys = fieldOrder.length ? fieldOrder : visibleFields;

  const titleFieldKey =
    typeof projection.title_field === "string" && projection.title_field.trim()
      ? projection.title_field.trim()
      : null;

  return {
    fieldKeys,
    fieldOrder: fieldOrder.length ? fieldOrder : fieldKeys,
    titleFieldKey,
  };
}

function normalizeSortRules(defaultSort) {
  if (!defaultSort || typeof defaultSort !== "object") {
    return [...DEFAULT_OBJECT_VIEW_QUERY.sort.rules];
  }

  const field =
    typeof defaultSort.field === "string" && defaultSort.field.trim()
      ? defaultSort.field.trim()
      : "created_at";

  const order =
    defaultSort.order === "asc" || defaultSort.order === "desc"
      ? defaultSort.order
      : "desc";

  return [{ field, order }];
}

function normalizeFilterConditions(source) {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item, index) => {
      const fieldKey = String(
        item?.fieldKey ?? item?.field_key ?? item?.columnId ?? "",
      ).trim();

      if (!fieldKey) {
        return null;
      }

      return {
        id: String(item?.id || `condition-${index + 1}`),
        fieldKey,
        operator: String(item?.operator || "eq").toLowerCase(),
        value: item?.value ?? "",
      };
    })
    .filter(Boolean);
}

function readFiltersFromRaw(rawView, objectView) {
  const filtersJson =
    rawView?.filters_json && typeof rawView.filters_json === "object"
      ? rawView.filters_json
      : {};

  const filtersObjectView =
    filtersJson.objectView && typeof filtersJson.objectView === "object"
      ? filtersJson.objectView.filters
      : null;

  const source =
    objectView?.query?.filters || filtersObjectView || filtersJson || {};

  const conditions = normalizeFilterConditions(
    source.conditions || source.savedFilters || [],
  );

  const savedFilters = Array.isArray(source.savedFilters)
    ? source.savedFilters
    : [];

  return {
    conditions,
    savedFilters,
    quickFilters: Array.isArray(source.quickFilters) ? source.quickFilters : [],
    defaultQuickFilterId: source.defaultQuickFilterId ?? null,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} rawView
 * @param {{
 *   viewKey?: string | null,
 *   projection?: Record<string, unknown> | null,
 *   pageSize?: number,
 *   isPublished?: boolean,
 *   catalog?: Record<string, unknown> | null,
 *   objectTypeKey?: string | null,
 *   catalogFields?: Array<Record<string, unknown>> | null,
 * }} [fallback]
 */
export function normalizeObjectViewDefinition(rawView, fallback = {}) {
  if (!rawView && fallback.publishedViewRaw) {
    return normalizeObjectViewDefinition(fallback.publishedViewRaw, {
      ...fallback,
      isPublished: true,
    });
  }

  if (!rawView && fallback.projection) {
    const legacyProjection = legacyProjectionToFieldKeys(fallback.projection);
    const viewKey =
      String(fallback.viewKey || "default_table").trim() || "default_table";

    return applyContractGuards(
      withCatalogProjectionSync(
        createEmptyObjectViewContract({
          key: viewKey,
          name: viewKey === "default_table" ? "Таблица" : viewKey,
          projection: legacyProjection,
          query: {
            ...DEFAULT_OBJECT_VIEW_QUERY,
            filters: { ...DEFAULT_OBJECT_VIEW_QUERY.filters },
            sort: {
              rules: normalizeSortRules(fallback.projection?.default_sort),
            },
            pagination: {
              defaultPageSize: Number(fallback.pageSize) || 20,
            },
          },
          meta: {
            isPublished: Boolean(fallback.isPublished),
          },
        }),
        fallback,
      ),
    );
  }

  if (!rawView) {
    const viewKey =
      String(fallback.viewKey || "default_table").trim() || "default_table";

    return applyContractGuards(
      withCatalogProjectionSync(
        createEmptyObjectViewContract({
          key: viewKey,
          name: viewKey === "default_table" ? "Таблица" : viewKey,
          query: {
            ...DEFAULT_OBJECT_VIEW_QUERY,
            filters: { ...DEFAULT_OBJECT_VIEW_QUERY.filters },
            pagination: {
              defaultPageSize: Number(fallback.pageSize) || 20,
            },
          },
          meta: {
            isPublished: Boolean(fallback.isPublished),
          },
        }),
        fallback,
      ),
    );
  }

  const settings =
    rawView?.settings_json && typeof rawView.settings_json === "object"
      ? rawView.settings_json
      : {};

  const objectView =
    settings.objectView && typeof settings.objectView === "object"
      ? settings.objectView
      : null;

  if (
    objectView &&
    Number(objectView.schemaVersion) === OBJECT_VIEW_CONTRACT_SCHEMA_VERSION
  ) {
    return applyContractGuards(
      withCatalogProjectionSync(
        mergeObjectViewContract(
          createEmptyObjectViewContract({
            query: {
              pagination: {
                defaultPageSize: Number(fallback.pageSize) || 20,
              },
            },
          }),
          objectView,
          rawView,
          fallback,
        ),
        fallback,
      ),
    );
  }

  const projectionSource =
    objectView?.projection ||
    settings.projection ||
    fallback.projection ||
    null;

  const legacyProjection = legacyProjectionToFieldKeys(projectionSource);

  const defaultSort =
    projectionSource?.default_sort ||
    objectView?.query?.sort?.rules?.[0] ||
    null;

  const viewKey =
    String(
      rawView?.key || fallback.viewKey || objectView?.key || "default_table",
    ).trim() || "default_table";

  const filters = readFiltersFromRaw(rawView, objectView);

  return applyContractGuards(
    withCatalogProjectionSync(
      createEmptyObjectViewContract({
      schemaVersion: OBJECT_VIEW_CONTRACT_SCHEMA_VERSION,
      viewType: String(rawView?.view_type || rawView?.viewType || "table"),
      key: viewKey,
      name: String(rawView?.name || objectView?.name || viewKey),
      projection: legacyProjection,
      query: {
        ...DEFAULT_OBJECT_VIEW_QUERY,
        filters: {
          conditions: filters.conditions,
          savedFilters: filters.savedFilters,
          quickFilters: filters.quickFilters,
          defaultQuickFilterId: filters.defaultQuickFilterId,
        },
        sort: {
          rules: normalizeSortRules(defaultSort),
        },
        pagination: {
          defaultPageSize: Number(fallback.pageSize) || 20,
        },
      },
      presentation: {
        table: normalizePresentationTable(
          objectView?.presentation?.table,
          legacyProjection.fieldKeys,
        ),
        card: objectView?.presentation?.card || null,
      },
      meta: {
        isSystem: Boolean(rawView?.is_system ?? rawView?.isSystem),
        isDefault: Boolean(rawView?.is_default ?? rawView?.isDefault),
        isPublished: Boolean(fallback.isPublished),
        draftRevision:
          rawView?.draft_revision != null ? Number(rawView.draft_revision) : null,
        viewId: rawView?.id != null ? String(rawView.id) : null,
      },
      }),
      fallback,
    ),
  );
}

function mergeObjectViewContract(base, objectView, rawView, fallback = {}) {
  const projection = { ...(objectView.projection || {}) };
  const filters = readFiltersFromRaw(rawView, objectView);

  if (fallback.projection && !projection.fieldKeys?.length) {
    const runtimeProjection = legacyProjectionToFieldKeys(fallback.projection);
    projection.fieldKeys = runtimeProjection.fieldKeys;
    projection.fieldOrder = runtimeProjection.fieldOrder;
    projection.titleFieldKey = runtimeProjection.titleFieldKey;
  }

  return {
    ...base,
    schemaVersion: OBJECT_VIEW_CONTRACT_SCHEMA_VERSION,
    viewType: String(objectView.viewType || base.viewType),
    key: String(objectView.key || rawView?.key || base.key),
    // ViewDefinition.name is source of truth for tab/breadcrumb label.
    name: String(rawView?.name || objectView.name || base.name),
    projection: {
      fieldKeys: Array.isArray(projection.fieldKeys) ? projection.fieldKeys : [],
      fieldOrder: Array.isArray(projection.fieldOrder)
        ? projection.fieldOrder
        : [],
      titleFieldKey:
        typeof projection.titleFieldKey === "string"
          ? projection.titleFieldKey
          : null,
    },
    query: {
      filters: {
        conditions:
          objectView.query?.filters?.conditions?.length
            ? normalizeFilterConditions(objectView.query.filters.conditions)
            : filters.conditions,
        savedFilters:
          objectView.query?.filters?.savedFilters || filters.savedFilters,
        quickFilters:
          objectView.query?.filters?.quickFilters || filters.quickFilters,
        defaultQuickFilterId:
          objectView.query?.filters?.defaultQuickFilterId ??
          filters.defaultQuickFilterId,
      },
      sort: {
        rules: Array.isArray(objectView.query?.sort?.rules)
          ? objectView.query.sort.rules
          : normalizeSortRules(fallback.projection?.default_sort),
      },
      pagination: {
        defaultPageSize:
          Number(objectView.query?.pagination?.defaultPageSize) ||
          Number(fallback.pageSize) ||
          20,
      },
    },
    presentation: {
      table: normalizePresentationTable(
        {
          ...base.presentation.table,
          ...(objectView.presentation?.table || {}),
        },
        Array.isArray(projection.fieldKeys) ? projection.fieldKeys : [],
      ),
      card: objectView.presentation?.card || base.presentation?.card || null,
    },
    capabilities: {
      ...base.capabilities,
      ...(objectView.capabilities || {}),
    },
    meta: {
      ...base.meta,
      ...(objectView.meta || {}),
      isSystem: Boolean(
        objectView.meta?.isSystem ??
          rawView?.is_system ??
          rawView?.isSystem ??
          base.meta.isSystem,
      ),
      isDefault: Boolean(
        objectView.meta?.isDefault ??
          rawView?.is_default ??
          rawView?.isDefault ??
          base.meta.isDefault,
      ),
      isPublished: Boolean(
        objectView.meta?.isPublished ??
          fallback.isPublished ??
          base.meta.isPublished,
      ),
      viewId: rawView?.id != null ? String(rawView.id) : base.meta.viewId,
      draftRevision:
        rawView?.draft_revision != null
          ? Number(rawView.draft_revision)
          : base.meta.draftRevision,
    },
  };
}

export function objectViewContractToLegacyProjection(contract) {
  return {
    visible_fields: [...(contract.projection.fieldKeys || [])],
    field_order: [...(contract.projection.fieldOrder || [])],
    title_field: contract.projection.titleFieldKey,
    default_sort: contract.query.sort.rules[0]
      ? {
          field: contract.query.sort.rules[0].field,
          order: contract.query.sort.rules[0].order,
        }
      : { field: "created_at", order: "desc" },
  };
}
