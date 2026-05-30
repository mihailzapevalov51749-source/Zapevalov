export const LIBRARY_OPEN_DOCUMENT = "document";

export function parseLibraryDeepLink(searchParams) {
  const source =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(String(searchParams ?? ""));

  const folderRaw = source.get("folderId");
  const documentRaw = source.get("documentId");
  const open = String(source.get("open") ?? "").trim().toLowerCase();

  const folderId =
    folderRaw != null && String(folderRaw).trim() !== ""
      ? Number(folderRaw)
      : null;
  const documentId =
    documentRaw != null && String(documentRaw).trim() !== ""
      ? Number(documentRaw)
      : null;

  const normalizedFolderId =
    Number.isFinite(folderId) && folderId > 0 ? folderId : null;
  const normalizedDocumentId =
    Number.isFinite(documentId) && documentId > 0 ? documentId : null;

  return {
    folderId: normalizedFolderId,
    documentId: normalizedDocumentId,
    shouldOpenDocument: open === LIBRARY_OPEN_DOCUMENT,
    hasDeepLink: normalizedFolderId != null || normalizedDocumentId != null,
  };
}

export function buildLibraryDeepLinkSearchParams({
  folderId = null,
  documentId = null,
  open = null,
} = {}) {
  const params = new URLSearchParams();

  if (folderId != null && Number(folderId) > 0) {
    params.set("folderId", String(folderId));
  }

  if (documentId != null && Number(documentId) > 0) {
    params.set("documentId", String(documentId));
  }

  if (open === LIBRARY_OPEN_DOCUMENT) {
    params.set("open", LIBRARY_OPEN_DOCUMENT);
  }

  return params;
}

export function resolveDeepLinkFolderTarget({
  folderId,
  documentId,
  documentRecord,
  shouldOpenDocument = false,
}) {
  if (documentId != null) {
    const parentFolderId =
      folderId != null ? folderId : documentRecord?.parent_id ?? null;

    return {
      targetFolderId: parentFolderId,
      openDocumentId: shouldOpenDocument ? documentId : null,
      highlightDocumentId: shouldOpenDocument ? null : documentId,
    };
  }

  return {
    targetFolderId: folderId,
    openDocumentId: null,
    highlightDocumentId: null,
  };
}
