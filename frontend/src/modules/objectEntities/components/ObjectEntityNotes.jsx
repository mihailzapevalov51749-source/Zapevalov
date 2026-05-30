import EntityNotesEditor from "../../../shared/notes/editor/EntityNotesEditor";
import { resolveRuntimeEntityCommunicationIdentity } from "../../../shared/entityIdentity";

function buildPublishedRuntimeRef({
  runtimeEntityId,
  objectTypeKey,
  tenantId,
  catalogVersion = null,
}) {
  const entityId = String(runtimeEntityId ?? "").trim();
  const key = String(objectTypeKey ?? "").trim();

  if (!entityId || !key) {
    return null;
  }

  const tenant = Number(tenantId) || 1;

  return {
    object_type_key: key,
    runtime_entity_id: entityId,
    view_key: null,
    catalog_version:
      catalogVersion != null && catalogVersion !== ""
        ? String(catalogVersion)
        : null,
    runtime_route: `/portal/${tenant}/object-types/${encodeURIComponent(key)}`,
  };
}

/**
 * Runtime Entity notes adapter (object-centric writes).
 */
export default function ObjectEntityNotes({
  runtimeEntityId = null,
  objectTypeKey = null,
  tenantId = null,
  catalogVersion = null,
  initialContext = null,
  onCountChange = null,
}) {
  const identity = resolveRuntimeEntityCommunicationIdentity(runtimeEntityId);

  if (!identity) {
    return null;
  }

  const publishedRuntimeRef = buildPublishedRuntimeRef({
    runtimeEntityId: identity.entityId,
    objectTypeKey,
    tenantId,
    catalogVersion,
  });

  return (
    <EntityNotesEditor
      entityType={identity.entityType}
      entityId={identity.entityId}
      publishedRuntimeRef={publishedRuntimeRef}
      initialContext={initialContext}
      onCountChange={onCountChange}
      warnOnMissingPublishedRuntimeRef={!publishedRuntimeRef}
    />
  );
}
