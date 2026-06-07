/**
 * Keeps legacy settings.projection and objectView.projection in sync on Studio save.
 *
 * @param {Record<string, unknown> | null | undefined} settingsJson
 * @param {Record<string, unknown> | null | undefined} draftProjection
 */
export function syncViewSettingsFromDraftProjection(settingsJson, draftProjection) {
  const settings =
    settingsJson && typeof settingsJson === "object" ? { ...settingsJson } : {};
  const projection =
    draftProjection && typeof draftProjection === "object"
      ? { ...draftProjection }
      : null;

  if (!projection) {
    return settings;
  }

  const visibleFields = Array.isArray(projection.visible_fields)
    ? projection.visible_fields.map((key) => String(key || "").trim()).filter(Boolean)
    : [];
  const fieldOrder = Array.isArray(projection.field_order)
    ? projection.field_order.map((key) => String(key || "").trim()).filter(Boolean)
    : visibleFields;
  const titleField = String(projection.title_field || "").trim() || null;
  const infoFieldKeys = Array.isArray(projection.info_field_keys)
    ? projection.info_field_keys.map((key) => String(key || "").trim()).filter(Boolean)
    : [];
  const visibleSet = new Set(visibleFields);
  const orderedVisibleKeys = (fieldOrder.length ? fieldOrder : visibleFields).filter((key) =>
    visibleSet.has(key),
  );
  const resolvedFieldKeys = orderedVisibleKeys.length ? orderedVisibleKeys : visibleFields;

  const nextSettings = {
    ...settings,
    projection,
  };

  const objectView = settings.objectView;

  if (!objectView || typeof objectView !== "object") {
    return nextSettings;
  }

  const ovProjection =
    objectView.projection && typeof objectView.projection === "object"
      ? { ...objectView.projection }
      : {};

  nextSettings.objectView = {
    ...objectView,
    projection: {
      ...ovProjection,
      fieldKeys: resolvedFieldKeys,
      fieldOrder: resolvedFieldKeys,
      titleFieldKey: titleField,
      infoFieldKeys: infoFieldKeys.filter((key) => visibleSet.has(key)),
    },
  };

  return nextSettings;
}
