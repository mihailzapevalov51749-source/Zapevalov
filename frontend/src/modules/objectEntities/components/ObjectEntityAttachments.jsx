import EntityAttachmentsPanel from "../../../shared/files/attachments/EntityAttachmentsPanel";
import { resolveRuntimeEntityCommunicationIdentity } from "../../../shared/entityIdentity";
import useObjectEntityAttachments from "../hooks/useObjectEntityAttachments";

function buildPublishedRuntimeRef({
  runtimeEntityId,
  objectTypeKey,
  tenantId,
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
    catalog_version: null,
    runtime_route: `/portal/${tenant}/object-types/${encodeURIComponent(key)}`,
  };
}

/**
 * Runtime Entity attachments adapter (file fields in entity.values).
 */
export default function ObjectEntityAttachments({
  runtimeEntityId = null,
  objectTypeKey = null,
  tenantId = null,
  catalog = null,
  entity = null,
  initialContext = null,
  onEntityUpdated = null,
}) {
  const identity = resolveRuntimeEntityCommunicationIdentity(runtimeEntityId);

  const {
    attachments,
    canUpload,
    uploadDisabledHint,
    submitting,
    uploadAttachments,
    deleteAttachment,
  } = useObjectEntityAttachments({
    tenantId,
    objectTypeKey,
    catalog,
    entity,
    onEntityUpdated,
  });

  if (!identity) {
    return null;
  }

  const publishedRuntimeRef = buildPublishedRuntimeRef({
    runtimeEntityId: identity.entityId,
    objectTypeKey,
    tenantId,
  });

  return (
    <EntityAttachmentsPanel
      attachments={attachments}
      ownerIdentity={{
        entityType: identity.entityType,
        entityId: identity.entityId,
      }}
      publishedRuntimeRef={publishedRuntimeRef}
      initialContext={initialContext}
      onUpload={() => {
        void uploadAttachments();
      }}
      onDeleteAttachment={(file) => {
        void deleteAttachment(file);
      }}
      uploadDisabled={!canUpload || submitting}
      uploadDisabledHint={uploadDisabledHint}
      fileViewerFallbackContext={{
        entity_type: identity.entityType,
        entity_id: identity.entityId,
        owner_entity_type: identity.entityType,
        owner_entity_id: identity.entityId,
        published_runtime_ref: publishedRuntimeRef,
        tab: "comments",
      }}
    />
  );
}
