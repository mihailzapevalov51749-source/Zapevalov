export const DESIGNER_OBJECT_SCHEMA_CHANGED_EVENT =
  "yasnopro:designer-object-schema:changed";

/**
 * Notify Studio surfaces (Preview tab selector, ObjectViewHost) that object schema changed.
 *
 * @param {{ tenantId?: number | string, objectTypeId?: number | string, viewKey?: string | null }} detail
 */
export function dispatchDesignerObjectSchemaChanged(detail = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(DESIGNER_OBJECT_SCHEMA_CHANGED_EVENT, {
      detail: {
        tenantId: detail.tenantId ?? null,
        objectTypeId: detail.objectTypeId ?? null,
        viewKey: detail.viewKey ?? null,
      },
    }),
  );
}

export function matchesDesignerObjectSchemaChangedEvent(detail, tenantId, objectTypeId) {
  if (!detail || typeof detail !== "object") {
    return true;
  }

  if (detail.tenantId != null && String(detail.tenantId) !== String(tenantId)) {
    return false;
  }

  if (detail.objectTypeId != null && String(detail.objectTypeId) !== String(objectTypeId)) {
    return false;
  }

  return true;
}
