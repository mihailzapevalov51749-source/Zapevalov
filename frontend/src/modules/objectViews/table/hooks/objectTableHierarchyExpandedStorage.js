export function buildObjectTableHierarchyExpandedStorageKey({
  tenantId,
  objectTypeKey,
  viewKey,
}) {
  const tenant = String(tenantId ?? "").trim() || "0";
  const objectType = String(objectTypeKey ?? "").trim() || "unknown";
  const view = String(viewKey ?? "").trim() || "default";

  return `object-table-hierarchy-expanded-${tenant}-${objectType}-${view}`;
}

export function readExpandedRowIdsFromStorage(storageKey) {
  try {
    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      return new Set();
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
}

export function writeExpandedRowIdsToStorage(storageKey, expandedRowIds) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(expandedRowIds)),
    );
  } catch {
    // localStorage may be unavailable
  }
}
