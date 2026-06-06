import {
  createEmptyObjectViewContract,
  DEFAULT_OBJECT_VIEW_QUERY,
  DEFAULT_TABLE_PRESENTATION,
} from "../../services/objectViewContract";
import { ensureTableRowNumberPresentationFieldKey } from "../../../../shared/runtime/systemEntityFields";
import {
  orderAllModeTableFieldKeys,
  resolveObjectTypeTitleFieldKey,
} from "../../services/tableColumnOrder";
import {
  findCatalogObjectType,
  getObjectTypeFields,
} from "../services/adapters/ObjectTypeTableAdapter";

/** Virtual key — base table mode «Все» (not a saved representation). */
export const TABLE_BASE_STATE_KEY = "__table_all__";

export const TABLE_BASE_STATE_NAME = "Все";

export function isTableBaseStateKey(viewKey) {
  return String(viewKey || "").trim() === TABLE_BASE_STATE_KEY;
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 */
export function getAllObjectTableFieldKeys(catalog, objectTypeKey, options = {}) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = getObjectTypeFields(objectType);

  return orderAllModeTableFieldKeys(fields, {
    objectType,
    publishedViewKey: options.publishedViewKey,
    runtimeProjection: options.runtimeProjection,
  });
}

/**
 * Dynamic read-only contract: all object fields, no filters/sort.
 *
 * @param {Record<string, unknown> | null | undefined} catalog
 * @param {string | null | undefined} objectTypeKey
 * @param {number} [pageSize]
 */
export function buildTableBaseStateContract(
  catalog,
  objectTypeKey,
  pageSize = 20,
  options = {},
) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fieldKeys = getAllObjectTableFieldKeys(catalog, objectTypeKey, options);
  const titleFieldKey = resolveObjectTypeTitleFieldKey(objectType, fieldKeys, options);

  return createEmptyObjectViewContract({
    key: TABLE_BASE_STATE_KEY,
    name: TABLE_BASE_STATE_NAME,
    projection: {
      fieldKeys: [...fieldKeys],
      fieldOrder: [...fieldKeys],
      titleFieldKey,
    },
    query: {
      ...DEFAULT_OBJECT_VIEW_QUERY,
      filters: {
        conditions: [],
        savedFilters: [],
        quickFilters: [],
        defaultQuickFilterId: null,
      },
      sort: {
        rules: [],
      },
      pagination: {
        defaultPageSize: Number(pageSize) || 20,
      },
    },
    presentation: {
      table: {
        ...DEFAULT_TABLE_PRESENTATION,
        hiddenFieldKeys: [],
        columnOrder: ensureTableRowNumberPresentationFieldKey([...fieldKeys]),
      },
      card: null,
    },
    meta: {
      isSystem: true,
      isDefault: false,
      isPublished: true,
      isBaseState: true,
      isUserView: false,
      viewId: null,
      userViewId: null,
      draftRevision: null,
    },
  });
}

/**
 * @param {import('../../services/objectViewContract').ObjectViewContract | null | undefined} contract
 * @param {{ officeMode?: boolean }} [options]
 */
export function canOccupyRepresentationSlot(contract, { officeMode = false } = {}) {
  if (!contract) {
    return false;
  }

  if (isTableBaseStateKey(contract.key)) {
    return false;
  }

  if (contract.meta?.isBaseState === true) {
    return false;
  }

  if (officeMode) {
    return contract.meta?.isUserView === true;
  }

  if (contract.meta?.isSystem === true) {
    return false;
  }

  return Boolean(contract.meta?.viewId) || contract.meta?.isUserView === true;
}

/**
 * @param {Array<{ contract?: import('../../services/objectViewContract').ObjectViewContract }>} views
 * @param {{ officeMode?: boolean }} [options]
 */
export function filterRepresentationSlotViews(views, options = {}) {
  return (Array.isArray(views) ? views : []).filter((item) =>
    canOccupyRepresentationSlot(item?.contract, options),
  );
}
