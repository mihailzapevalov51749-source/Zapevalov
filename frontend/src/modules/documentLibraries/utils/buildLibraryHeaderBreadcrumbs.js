export function buildLibraryHeaderBreadcrumbItems({
  libraryTitle,
  libraryId,
  portalId,
  folderPath = [],
  documentTitle = null,
}) {
  const basePath = `/portal/${portalId}/library/${libraryId}`;
  const normalizedLibraryTitle = String(libraryTitle || "Библиотека").trim();

  const items = [
    {
      id: "library-root",
      label: normalizedLibraryTitle,
      path: basePath,
      meta: {
        scope: "document-library-root",
        libraryId,
      },
    },
  ];

  if (Array.isArray(folderPath)) {
    folderPath.forEach((folder, index) => {
      const folderId = Number(folder?.id);
      const label = String(folder?.title || "").trim();
      if (!label || !Number.isFinite(folderId)) {
        return;
      }

      items.push({
        id: `library-folder-${folderId}`,
        label,
        path: `${basePath}?folderId=${folderId}`,
        meta: {
          scope: "document-library-folder",
          libraryId,
          folderId,
          index,
        },
      });
    });
  }

  const normalizedDocumentTitle = String(documentTitle || "").trim();
  if (normalizedDocumentTitle) {
    items.push({
      id: "library-document",
      label: normalizedDocumentTitle,
      path: null,
      meta: {
        scope: "document-library-document",
      },
    });
  }

  return items;
}
