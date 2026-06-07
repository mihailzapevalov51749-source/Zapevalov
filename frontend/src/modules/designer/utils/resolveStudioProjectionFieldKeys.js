/**
 * Derives projection.fieldKeys equivalent from Studio draft projection.
 *
 * @param {Record<string, unknown> | null | undefined} draftProjection
 */
export function resolveStudioProjectionFieldKeys(draftProjection) {
  if (!draftProjection || typeof draftProjection !== "object") {
    return [];
  }

  const visibleFields = Array.isArray(draftProjection.visible_fields)
    ? draftProjection.visible_fields.map((key) => String(key || "").trim()).filter(Boolean)
    : [];
  const fieldOrder = Array.isArray(draftProjection.field_order)
    ? draftProjection.field_order.map((key) => String(key || "").trim()).filter(Boolean)
    : [];

  if (fieldOrder.length) {
    if (!visibleFields.length) {
      return fieldOrder;
    }

    const visibleSet = new Set(visibleFields);
    const orderedVisible = fieldOrder.filter((key) => visibleSet.has(key));
    return orderedVisible.length ? orderedVisible : visibleFields;
  }

  return visibleFields;
}
