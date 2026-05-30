/**
 * Legacy Universal Table row → notes communication identity.
 */

export function getEntityIdFromRow(row) {
  return row?.id || row?.row_id || row?.rowId || "";
}

export function getTableIdFromRow(row) {
  return (
    row?.table_id ||
    row?.tableId ||
    row?.table?.id ||
    row?.source_table_id ||
    row?.sourceTableId ||
    row?.values?.table_id ||
    row?.values?.tableId ||
    ""
  );
}

export function resolvePublishedRuntimeRefFromRow({ row, publishedRuntimeRef }) {
  if (
    publishedRuntimeRef &&
    typeof publishedRuntimeRef === "object" &&
    typeof publishedRuntimeRef.object_type_key === "string" &&
    typeof publishedRuntimeRef.runtime_entity_id === "string"
  ) {
    return {
      object_type_key: publishedRuntimeRef.object_type_key,
      runtime_entity_id: publishedRuntimeRef.runtime_entity_id,
      view_key:
        typeof publishedRuntimeRef.view_key === "string"
          ? publishedRuntimeRef.view_key
          : null,
      catalog_version:
        typeof publishedRuntimeRef.catalog_version === "string"
          ? publishedRuntimeRef.catalog_version
          : null,
      runtime_route:
        typeof publishedRuntimeRef.runtime_route === "string"
          ? publishedRuntimeRef.runtime_route
          : null,
    };
  }

  const rowRef = row && typeof row === "object" ? row : {};
  const objectTypeKey =
    typeof rowRef.object_type_key === "string"
      ? rowRef.object_type_key
      : typeof rowRef.objectTypeKey === "string"
        ? rowRef.objectTypeKey
        : null;
  const runtimeEntityId =
    typeof rowRef.runtime_entity_id === "string"
      ? rowRef.runtime_entity_id
      : typeof rowRef.runtimeEntityId === "string"
        ? rowRef.runtimeEntityId
        : null;
  const viewKey =
    typeof rowRef.view_key === "string"
      ? rowRef.view_key
      : typeof rowRef.viewKey === "string"
        ? rowRef.viewKey
        : null;
  const catalogVersion =
    typeof rowRef.catalog_version === "string"
      ? rowRef.catalog_version
      : typeof rowRef.catalogVersion === "string"
        ? rowRef.catalogVersion
        : null;
  const runtimeRoute =
    typeof rowRef.runtime_route === "string"
      ? rowRef.runtime_route
      : typeof rowRef.runtimeRoute === "string"
        ? rowRef.runtimeRoute
        : null;

  if (!objectTypeKey || !runtimeEntityId) {
    return null;
  }

  return {
    object_type_key: objectTypeKey,
    runtime_entity_id: runtimeEntityId,
    view_key: viewKey,
    catalog_version: catalogVersion,
    runtime_route: runtimeRoute,
  };
}
