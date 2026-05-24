export function getFileDiscussionEntity(file) {
  if (!file) {
    return null;
  }

  const fileId =
    file.fileId ||
    file.file_id ||
    file.documentId ||
    file.document_id ||
    file.id ||
    file.raw?.fileId ||
    file.raw?.file_id ||
    file.raw?.documentId ||
    file.raw?.document_id ||
    file.raw?.id ||
    null;

  if (!fileId) {
    return null;
  }

  return {
    type: "file",
    id: String(fileId),
  };
}

export function getRelatedRecordEntity(file) {
  if (!file) {
    return null;
  }

  const rowId =
    file.rowId ||
    file.row_id ||
    file.recordId ||
    file.record_id ||
    file.entityId ||
    file.entity_id ||
    file.raw?.rowId ||
    file.raw?.row_id ||
    file.raw?.recordId ||
    file.raw?.record_id ||
    file.raw?.entityId ||
    file.raw?.entity_id ||
    null;

  const rowType =
    file.rowType ||
    file.row_type ||
    file.entityType ||
    file.entity_type ||
    file.raw?.rowType ||
    file.raw?.row_type ||
    file.raw?.entityType ||
    file.raw?.entity_type ||
    "table_row";

  if (!rowId) {
    return null;
  }

  return {
    type: rowType,
    id: String(rowId),
  };
}

export function getRelatedRecordTitle(file) {
  return (
    file?.recordTitle ||
    file?.record_title ||
    file?.entityTitle ||
    file?.entity_title ||
    file?.rowTitle ||
    file?.row_title ||
    file?.raw?.recordTitle ||
    file?.raw?.record_title ||
    file?.raw?.entityTitle ||
    file?.raw?.entity_title ||
    file?.raw?.rowTitle ||
    file?.raw?.row_title ||
    file?.raw?.title ||
    ""
  );
}

export function buildFileDiscussionContext(file) {
  return {
    fileEntity: getFileDiscussionEntity(file),
    relatedEntity: getRelatedRecordEntity(file),
    relatedTitle: getRelatedRecordTitle(file),
  };
}