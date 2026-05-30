import { collectAttachmentFiles } from "../../../shared/files/attachments/utils/collectAttachmentFiles";
import { getFileFieldsFromCatalog } from "../services/getFileFieldsFromCatalog";

/**
 * Counts file field values on the entity (no network).
 * Uses the same normalization as EntityAttachmentsPanel.
 */
export function countEntityAttachmentFiles(entity, catalog, objectTypeKey) {
  const fileFields = getFileFieldsFromCatalog(catalog, objectTypeKey);
  const values =
    entity?.values && typeof entity.values === "object" ? entity.values : {};

  return collectAttachmentFiles(values, fileFields).length;
}
