export function isRuntimeProjectionValid(projection) {
  if (!projection || typeof projection !== "object") {
    return false;
  }

  const visibleFields = projection.visible_fields;
  const fieldOrder = projection.field_order;
  const order = projection.default_sort?.order;

  return (
    Array.isArray(visibleFields) &&
    Array.isArray(fieldOrder) &&
    (order === "asc" || order === "desc")
  );
}
