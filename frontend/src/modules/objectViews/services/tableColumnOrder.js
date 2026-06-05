import {
  excludeTableDedicatedRecordNumberFieldKeys,
  isRuntimeSystemFieldKey,
  isTableRowNumberPresentationFieldKey,
  orderUserThenSystemFieldKeys,
  peelTableRowNumberPresentationFieldKey,
  TABLE_PROJECTION_SYSTEM_FIELD_ORDER,
  TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY,
} from "../../../shared/runtime/systemEntityFields";
import { isTableBaseStateKey } from "../table/preferences/tableBaseState";

/**
 * Title field is always the first data column (immediately after «№»).
 *
 * @param {string[]} fieldKeys
 * @param {string | null | undefined} titleFieldKey
 * @returns {string[]}
 */
export function enforceTitleFieldFirstInColumnOrder(fieldKeys, titleFieldKey) {
  const order = Array.isArray(fieldKeys) ? [...fieldKeys] : [];
  const title = String(titleFieldKey || "").trim();

  if (!title) {
    return order;
  }

  const withoutTitle = order.filter((key) => key !== title);

  if (!order.includes(title)) {
    return order;
  }

  return [title, ...withoutTitle];
}

/**
 * Final column order applied immediately before table render.
 *
 * @param {string[]} rawKeys
 * @param {{
 *   titleFieldKey?: string | null,
 *   isAllMode?: boolean,
 * }} [options]
 * @returns {string[]}
 */
export function normalizeTableDisplayFieldKeys(rawKeys, options = {}) {
  const title = String(options.titleFieldKey || "").trim();
  const isAllMode = options.isAllMode === true;
  const deduped = excludeTableDedicatedRecordNumberFieldKeys(dedupeFieldKeys(rawKeys));
  const rowNumberIndex = deduped.findIndex(isTableRowNumberPresentationFieldKey);
  const { rowNumberIncluded, keys } = peelTableRowNumberPresentationFieldKey(deduped);

  if (!keys.length && !rowNumberIncluded) {
    return [];
  }

  const userKeys = [];
  const systemKeys = [];

  for (const key of keys) {
    if (isRuntimeSystemFieldKey(key)) {
      systemKeys.push(key);
    } else {
      userKeys.push(key);
    }
  }

  const orderedUser = enforceTitleFieldFirstInColumnOrder(userKeys, title);

  if (isAllMode) {
    const systemSet = new Set(systemKeys);
    const orderedSystem = [];

    for (const systemKey of TABLE_PROJECTION_SYSTEM_FIELD_ORDER) {
      if (systemSet.has(systemKey)) {
        orderedSystem.push(systemKey);
      }
    }

    for (const systemKey of systemKeys) {
      if (!orderedSystem.includes(systemKey)) {
        orderedSystem.push(systemKey);
      }
    }

    return attachTableRowNumberPresentationFieldKey(
      [...orderedUser, ...orderedSystem],
      rowNumberIncluded,
      rowNumberIndex,
    );
  }

  const result = [];
  const seen = new Set();

  if (title && keys.includes(title)) {
    result.push(title);
    seen.add(title);
  }

  for (const key of keys) {
    if (!seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  return attachTableRowNumberPresentationFieldKey(
    result,
    rowNumberIncluded,
    rowNumberIndex,
  );
}

/**
 * @param {string[]} keys
 * @param {boolean} rowNumberIncluded
 * @param {number} rowNumberIndex
 * @returns {string[]}
 */
function attachTableRowNumberPresentationFieldKey(
  keys,
  rowNumberIncluded,
  rowNumberIndex,
) {
  if (!rowNumberIncluded) {
    return keys;
  }

  const insertAt =
    rowNumberIndex >= 0 ? Math.min(rowNumberIndex, keys.length) : 0;

  return [
    ...keys.slice(0, insertAt),
    TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY,
    ...keys.slice(insertAt),
  ];
}

/**
 * @param {string | null | undefined} fieldKey
 * @param {"up" | "down"} direction
 * @param {string[]} columnOrder
 * @param {string | null | undefined} titleFieldKey
 * @param {{ preserveExactOrder?: boolean }} [options]
 */
export function canMoveTableColumn(
  fieldKey,
  direction,
  columnOrder,
  titleFieldKey,
  options = {},
) {
  const normalized = String(fieldKey || "").trim();
  const title = String(titleFieldKey || "").trim();
  const order = Array.isArray(columnOrder) ? columnOrder : [];
  const index = order.indexOf(normalized);

  if (index < 0) {
    return false;
  }

  const offset = direction === "up" ? -1 : 1;
  const targetIndex = index + offset;

  if (targetIndex < 0 || targetIndex >= order.length) {
    return false;
  }

  if (options.preserveExactOrder === true) {
    return true;
  }

  if (title && normalized === title) {
    return false;
  }

  if (title && targetIndex === 0) {
    return false;
  }

  return true;
}

/**
 * Keeps user-defined column order for Office user views (no title/system reordering).
 *
 * @param {string[]} rawKeys
 * @param {string[]} projectionFieldKeys
 */
export function preserveUserViewColumnOrder(rawKeys, projectionFieldKeys = []) {
  const projectionSet = new Set(
    (Array.isArray(projectionFieldKeys) ? projectionFieldKeys : [])
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );
  const order = dedupeFieldKeys(rawKeys).filter((key) => projectionSet.has(key));

  if (
    projectionSet.has(TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY) &&
    !order.includes(TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY)
  ) {
    order.unshift(TABLE_ROW_NUMBER_PRESENTATION_FIELD_KEY);
  }

  for (const key of projectionFieldKeys) {
    if (!order.includes(key) && !isTableRowNumberPresentationFieldKey(key)) {
      order.push(key);
    }
  }

  return order;
}

/**
 * @param {Record<string, unknown> | null | undefined} view
 */
function readViewProjection(view) {
  if (!view || typeof view !== "object") {
    return null;
  }

  if (view.projection && typeof view.projection === "object") {
    return view.projection;
  }

  const settings =
    view.settings_json && typeof view.settings_json === "object"
      ? view.settings_json
      : null;

  if (settings?.projection && typeof settings.projection === "object") {
    return settings.projection;
  }

  const objectView = settings?.objectView;

  if (objectView?.projection && typeof objectView.projection === "object") {
    const ovProjection = objectView.projection;

    return {
      visible_fields: ovProjection.fieldKeys || ovProjection.field_keys || [],
      field_order: ovProjection.fieldOrder || ovProjection.field_order || [],
      title_field:
        ovProjection.titleFieldKey || ovProjection.title_field_key || null,
    };
  }

  if (
    view.config &&
    typeof view.config === "object" &&
    view.config.projection &&
    typeof view.config.projection === "object"
  ) {
    return view.config.projection;
  }

  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} objectType
 * @param {string[]} [fieldKeys]
 * @param {{
 *   publishedViewKey?: string | null,
 *   runtimeProjection?: Record<string, unknown> | null,
 * }} [options]
 * @returns {string | null}
 */
export function resolveObjectTypeTitleFieldKey(objectType, fieldKeys = [], options = {}) {
  const keys = (Array.isArray(fieldKeys) ? fieldKeys : [])
    .map((key) => String(key || "").trim())
    .filter(Boolean);

  const runtimeTitle = String(options.runtimeProjection?.title_field || "").trim();

  if (runtimeTitle && (!keys.length || keys.includes(runtimeTitle))) {
    return runtimeTitle;
  }

  const views = Array.isArray(objectType?.views) ? objectType.views : [];
  const publishedViewKey = String(options.publishedViewKey || "default_table").trim();

  const preferredView =
    views.find((view) => String(view?.key || "").trim() === publishedViewKey) ||
    views.find((view) => view?.is_default === true || view?.isDefault === true) ||
    views[0] ||
    null;

  if (preferredView) {
    const projection = readViewProjection(preferredView);
    const candidate = String(
      projection?.title_field || projection?.titleFieldKey || "",
    ).trim();

    if (candidate && (!keys.length || keys.includes(candidate))) {
      return candidate;
    }
  }

  for (const view of views) {
    if (view === preferredView) {
      continue;
    }

    const projection = readViewProjection(view);
    const candidate = String(
      projection?.title_field || projection?.titleFieldKey || "",
    ).trim();

    if (candidate && (!keys.length || keys.includes(candidate))) {
      return candidate;
    }
  }

  const fallback =
    keys.find((key) => !isRuntimeSystemFieldKey(key)) ||
    keys[0] ||
    null;

  return fallback ? String(fallback) : null;
}

/**
 * Field keys for table mode «Все»: user fields (title first), then system fields.
 *
 * @param {Array<Record<string, unknown>> | null | undefined} fields
 * @param {{
 *   titleFieldKey?: string | null,
 *   objectType?: Record<string, unknown> | null,
 *   publishedViewKey?: string | null,
 *   runtimeProjection?: Record<string, unknown> | null,
 * }} [options]
 */
export function orderAllModeTableFieldKeys(fields, options = {}) {
  const fieldList = Array.isArray(fields) ? fields : [];

  const catalogKeys = fieldList
    .map((field) => String(field?.key || "").trim())
    .filter(Boolean);

  const resolvedTitle =
    String(options.titleFieldKey || "").trim() ||
    resolveObjectTypeTitleFieldKey(options.objectType, catalogKeys, {
      publishedViewKey: options.publishedViewKey,
      runtimeProjection: options.runtimeProjection,
    });

  const ordered = orderUserThenSystemFieldKeys(fieldList, resolvedTitle || null);

  return normalizeTableDisplayFieldKeys(ordered, {
    titleFieldKey: resolvedTitle,
    isAllMode: true,
  });
}

/**
 * @param {import('./objectViewContract').ObjectViewContract | null | undefined} contract
 * @param {Record<string, unknown> | null | undefined} [runtimeProjection]
 */
export function resolveTableDisplayContext(
  contract,
  runtimeProjection = null,
  options = {},
) {
  const runtimeTitle = String(runtimeProjection?.title_field || "").trim();
  const fieldKeys = contract?.projection?.fieldKeys || [];
  const catalogTitle = resolveObjectTypeTitleFieldKey(options.objectType, fieldKeys, {
    publishedViewKey: options.publishedViewKey,
    runtimeProjection,
  });
  const contractTitle = String(contract?.projection?.titleFieldKey || "").trim();

  const titleFieldKey = runtimeTitle || catalogTitle || contractTitle || null;

  return {
    titleFieldKey,
    isAllMode: isTableBaseStateKey(contract?.key),
  };
}

/**
 * @param {string[]} keys
 * @returns {string[]}
 */
function dedupeFieldKeys(keys) {
  const seen = new Set();
  const result = [];

  for (const key of keys) {
    const normalized = String(key || "").trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
