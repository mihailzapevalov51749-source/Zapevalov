/**
 * Office user view column visibility from settings_json.columns.
 */

/**
 * @param {unknown} columns
 * @returns {string[]}
 */
export function hiddenFieldKeysFromColumnsSettings(columns) {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns
    .filter((column) => {
      const fieldKey = String(column?.fieldKey || "").trim();

      return fieldKey && column.visible === false;
    })
    .map((column) => String(column.fieldKey).trim());
}

/**
 * @param {unknown} columns
 * @returns {string[]}
 */
export function columnOrderFromColumnsSettings(columns) {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns
    .map((column) => String(column?.fieldKey || "").trim())
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown> | null | undefined} settings
 */
export function extractTablePresentationFromColumnsSettings(settings) {
  const columns = settings?.columns;

  if (!Array.isArray(columns) || !columns.length) {
    return null;
  }

  const columnOrder = columnOrderFromColumnsSettings(columns);
  const hiddenFieldKeys = hiddenFieldKeysFromColumnsSettings(columns);
  const columnWidths = {};

  for (const column of columns) {
    const fieldKey = String(column?.fieldKey || "").trim();

    if (!fieldKey || column.width == null) {
      continue;
    }

    const width = Number(column.width);

    if (Number.isFinite(width) && width > 0) {
      columnWidths[fieldKey] = width;
    }
  }

  return {
    columnOrder,
    hiddenFieldKeys,
    columnWidths,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} table
 * @param {Record<string, unknown> | null | undefined} settings
 */
export function mergeTablePresentationWithColumnsSettings(table, settings) {
  const fromColumns = extractTablePresentationFromColumnsSettings(settings);

  if (!fromColumns) {
    return table && typeof table === "object" ? table : {};
  }

  const base = table && typeof table === "object" ? table : {};

  return {
    ...base,
    ...(fromColumns.columnOrder.length
      ? { columnOrder: fromColumns.columnOrder }
      : {}),
    hiddenFieldKeys: fromColumns.hiddenFieldKeys.length
      ? fromColumns.hiddenFieldKeys
      : Array.isArray(base.hiddenFieldKeys)
        ? base.hiddenFieldKeys
        : [],
    columnWidths: {
      ...(base.columnWidths && typeof base.columnWidths === "object"
        ? base.columnWidths
        : {}),
      ...fromColumns.columnWidths,
    },
  };
}

/**
 * @param {string[]} orderedKeys
 * @param {string[]} hiddenFieldKeys
 */
export function filterVisibleColumnKeys(orderedKeys, hiddenFieldKeys = []) {
  const hidden = new Set(
    Array.isArray(hiddenFieldKeys)
      ? hiddenFieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
      : [],
  );

  return (Array.isArray(orderedKeys) ? orderedKeys : []).filter(
    (key) => !hidden.has(String(key || "").trim()),
  );
}
