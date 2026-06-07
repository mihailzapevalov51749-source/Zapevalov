/**
 * Builds Studio draft projection (legacy snake_case) from settings_json.
 * Merges legacy settings.projection with objectView.projection when needed.
 *
 * @param {Record<string, unknown> | null | undefined} settingsJson
 * @param {Array<{ key: string }>} fieldOptions
 */
export function resolveStudioDraftProjection(settingsJson, fieldOptions = []) {
  const catalogKeys = (fieldOptions || [])
    .map((field) => String(field?.key || "").trim())
    .filter(Boolean);

  const legacy =
    settingsJson?.projection && typeof settingsJson.projection === "object"
      ? settingsJson.projection
      : {};

  const objectViewProjection =
    settingsJson?.objectView?.projection &&
    typeof settingsJson.objectView.projection === "object"
      ? settingsJson.objectView.projection
      : {};

  const ovFieldKeys = Array.isArray(objectViewProjection.fieldKeys)
    ? objectViewProjection.fieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
    : [];
  const ovFieldOrder = Array.isArray(objectViewProjection.fieldOrder)
    ? objectViewProjection.fieldOrder.map((key) => String(key || "").trim()).filter(Boolean)
    : ovFieldKeys;

  const legacyVisible = Array.isArray(legacy.visible_fields)
    ? legacy.visible_fields.map((key) => String(key || "").trim()).filter(Boolean)
    : [];
  const legacyOrder = Array.isArray(legacy.field_order)
    ? legacy.field_order.map((key) => String(key || "").trim()).filter(Boolean)
    : [];

  const hasObjectViewProjection = ovFieldKeys.length > 0;
  const hasLegacyProjection = legacyVisible.length > 0 || legacyOrder.length > 0;

  let visible_fields = legacyVisible.length ? legacyVisible : catalogKeys;
  let field_order = legacyOrder.length ? legacyOrder : visible_fields;

  if (hasObjectViewProjection && !hasLegacyProjection) {
    visible_fields = [...ovFieldKeys];
    field_order = ovFieldOrder.length ? [...ovFieldOrder] : [...ovFieldKeys];
  } else if (hasObjectViewProjection && hasLegacyProjection) {
    const visibleSet = new Set(visible_fields);
    for (const key of ovFieldKeys) {
      if (!visibleSet.has(key)) {
        visible_fields.push(key);
        visibleSet.add(key);
      }
    }
    if (!field_order.length) {
      field_order = ovFieldOrder.length ? ovFieldOrder : visible_fields;
    }
  }

  const visibleSet = new Set(visible_fields);
  field_order = field_order.filter((key) => visibleSet.has(key));

  const title_field =
    typeof legacy.title_field === "string" && legacy.title_field.trim()
      ? legacy.title_field.trim()
      : typeof objectViewProjection.titleFieldKey === "string" &&
          objectViewProjection.titleFieldKey.trim()
        ? objectViewProjection.titleFieldKey.trim()
        : null;

  const default_sort =
    legacy.default_sort && typeof legacy.default_sort === "object"
      ? legacy.default_sort
      : {};

  const order =
    default_sort.order === "asc" || default_sort.order === "desc"
      ? default_sort.order
      : "desc";

  const default_sort_field =
    typeof default_sort.field === "string" ? default_sort.field : null;

  const ovInfoFieldKeys = Array.isArray(objectViewProjection.infoFieldKeys)
    ? objectViewProjection.infoFieldKeys.map((key) => String(key || "").trim()).filter(Boolean)
    : null;
  const legacyInfoFieldKeys = Array.isArray(legacy.info_field_keys)
    ? legacy.info_field_keys.map((key) => String(key || "").trim()).filter(Boolean)
    : null;

  let info_field_keys;

  // objectView.infoFieldKeys is the canonical contract when explicitly set.
  if (ovInfoFieldKeys !== null) {
    info_field_keys = ovInfoFieldKeys;
  } else if (legacyInfoFieldKeys !== null) {
    info_field_keys = legacyInfoFieldKeys;
  } else {
    const roleMapping =
      settingsJson?.objectView?.roleMapping &&
      typeof settingsJson.objectView.roleMapping === "object"
        ? settingsJson.objectView.roleMapping
        : {};
    const excluded = new Set(
      [
        roleMapping.nodeTitle,
        roleMapping.nodeStatus,
        roleMapping.nodeDescription,
        roleMapping.nextSteps,
        title_field,
      ]
        .map((key) => String(key || "").trim())
        .filter(Boolean),
    );
    info_field_keys = visible_fields.filter((key) => !excluded.has(key));
  }

  info_field_keys = info_field_keys.filter((key) => visibleSet.has(key));

  return {
    visible_fields,
    field_order: field_order.length ? field_order : visible_fields,
    title_field,
    info_field_keys,
    default_sort: {
      field: default_sort_field,
      order,
    },
  };
}
