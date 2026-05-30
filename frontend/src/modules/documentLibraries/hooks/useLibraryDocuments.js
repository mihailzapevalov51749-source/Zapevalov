import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  getLibraryDocumentById,
  getLibraryDocuments,
  createLibraryDocument,
  createLibraryFolder,
  uploadLibraryDocument,
  renameLibraryDocument,
  deleteLibraryDocument,
  searchLibraryDocuments,
} from "../api/documentLibrariesApi";

import { filterDocuments, buildWorkspacePreviewPayload } from "../services/documentLibrariesService";
import {
  buildLibraryDeepLinkSearchParams,
  LIBRARY_OPEN_DOCUMENT,
  parseLibraryDeepLink,
  resolveDeepLinkFolderTarget,
} from "../utils/libraryDeepLink";
import { resolveFolderPath } from "../utils/libraryFolderPath";

export default function useLibraryDocuments({
  libraryId,
  enableDeepLinkUrl = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkAppliedRef = useRef(false);
  const skipNextDeepLinkApplyRef = useRef(false);

  const [documents, setDocuments] = useState([]);

  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  });

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [highlightDocumentId, setHighlightDocumentId] = useState(null);
  const [pendingWorkspaceDocument, setPendingWorkspaceDocument] = useState(null);

  const [isDeepLinkReady, setIsDeepLinkReady] = useState(() => {
    if (!enableDeepLinkUrl) {
      return true;
    }
    return !parseLibraryDeepLink(searchParams).hasDeepLink;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [documentTitle, setDocumentTitle] = useState("");
  const [documentType, setDocumentType] = useState("word");
  const [searchQuery, setSearchQuery] = useState("");
  const [openedMenuId, setOpenedMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");

  const syncDeepLinkUrl = useCallback(
    ({ folderId = null, documentId = null, open = null } = {}) => {
      if (!enableDeepLinkUrl) {
        return;
      }

      skipNextDeepLinkApplyRef.current = true;
      setSearchParams(
        buildLibraryDeepLinkSearchParams({ folderId, documentId, open }),
        {
          replace: true,
        },
      );
    },
    [enableDeepLinkUrl, setSearchParams],
  );

  const loadDocuments = async (parentId = currentFolderId) => {
    if (!libraryId) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await getLibraryDocuments(libraryId, parentId);

      setDocuments(data.items || []);

      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (loadError) {
      console.error(loadError);
      setError("Не удалось загрузить документы");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGlobalSearch = async () => {
    if (!libraryId || !searchQuery.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await searchLibraryDocuments(libraryId, searchQuery);

      setDocuments(data.items || []);

      setPagination({
        total: data.total || 0,
        limit: data.limit || 200,
        offset: 0,
      });
    } catch (searchError) {
      console.error(searchError);
      setError("Ошибка поиска");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setDocuments([]);
    setCurrentFolderId(null);
    setFolderPath([]);
    setHighlightDocumentId(null);
    setPendingWorkspaceDocument(null);
    setOpenedMenuId(null);
    setDeleteTarget(null);
    setSearchQuery("");
    setError("");
    setPagination({
      total: 0,
      limit: 50,
      offset: 0,
    });
    deepLinkAppliedRef.current = false;
    skipNextDeepLinkApplyRef.current = false;
    setIsDeepLinkReady(
      !enableDeepLinkUrl || !parseLibraryDeepLink(searchParams).hasDeepLink,
    );
  }, [libraryId, enableDeepLinkUrl]);

  useEffect(() => {
    if (!enableDeepLinkUrl || !libraryId) {
      return;
    }

    if (skipNextDeepLinkApplyRef.current) {
      skipNextDeepLinkApplyRef.current = false;
      deepLinkAppliedRef.current = true;
      setIsDeepLinkReady(true);
      return;
    }

    deepLinkAppliedRef.current = false;
    setIsDeepLinkReady(!parseLibraryDeepLink(searchParams).hasDeepLink);
  }, [enableDeepLinkUrl, libraryId, searchParams]);

  useEffect(() => {
    if (!enableDeepLinkUrl || !libraryId || deepLinkAppliedRef.current) {
      return;
    }

    const deepLink = parseLibraryDeepLink(searchParams);
    if (!deepLink.hasDeepLink) {
      deepLinkAppliedRef.current = true;
      setIsDeepLinkReady(true);
      return;
    }

    let cancelled = false;

    const applyDeepLink = async () => {
      try {
        let documentRecord = null;

        if (deepLink.documentId) {
          documentRecord = await getLibraryDocumentById(deepLink.documentId);
          if (Number(documentRecord.library_id) !== Number(libraryId)) {
            throw new Error("Документ не принадлежит этой библиотеке");
          }
        }

        const { targetFolderId, openDocumentId, highlightDocumentId: nextHighlightId } =
          resolveDeepLinkFolderTarget({
            folderId: deepLink.folderId,
            documentId: deepLink.documentId,
            documentRecord,
            shouldOpenDocument: deepLink.shouldOpenDocument,
          });

        if (
          targetFolderId == null &&
          deepLink.documentId == null &&
          openDocumentId == null
        ) {
          throw new Error("Не удалось определить папку для deep-link");
        }

        if (targetFolderId != null) {
          const resolved = await resolveFolderPath({
            libraryId,
            targetFolderId,
            getDocumentById: getLibraryDocumentById,
          });

          if (cancelled) {
            return;
          }

          setFolderPath(resolved.folderPath);
          setCurrentFolderId(resolved.currentFolderId);
        } else {
          setFolderPath([]);
          setCurrentFolderId(null);
        }

        setHighlightDocumentId(nextHighlightId);

        if (
          openDocumentId != null &&
          documentRecord &&
          !documentRecord.is_folder &&
          !deepLink.shouldOpenDocument
        ) {
          setPendingWorkspaceDocument(documentRecord);
        }
      } catch (deepLinkError) {
        console.error(deepLinkError);
        if (!cancelled) {
          setError("Не удалось открыть ссылку на папку или документ");
        }
      } finally {
        if (!cancelled) {
          deepLinkAppliedRef.current = true;
          setIsDeepLinkReady(true);
        }
      }
    };

    applyDeepLink();

    return () => {
      cancelled = true;
    };
  }, [enableDeepLinkUrl, libraryId, searchParams]);

  useEffect(() => {
    if (!isDeepLinkReady) {
      return;
    }

    if (searchQuery && searchQuery.trim()) {
      handleGlobalSearch();
    } else {
      loadDocuments(currentFolderId);
    }
  }, [libraryId, currentFolderId, pagination.offset, searchQuery, isDeepLinkReady]);

  const filteredDocuments = useMemo(() => {
    return filterDocuments(documents, searchQuery);
  }, [documents, searchQuery]);

  const goToPage = (page) => {
    const newOffset = (page - 1) * pagination.limit;

    setPagination((prev) => ({
      ...prev,
      offset: newOffset,
    }));
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const handleOpenFolder = (document) => {
    if (!document?.is_folder) return;

    setCurrentFolderId(document.id);
    setFolderPath((prev) => [
      ...prev,
      { id: document.id, title: document.title },
    ]);

    setPagination((prev) => ({ ...prev, offset: 0 }));
    setOpenedMenuId(null);
    setSearchQuery("");
    setHighlightDocumentId(null);
    setPendingWorkspaceDocument(null);
    syncDeepLinkUrl({ folderId: document.id, documentId: null, open: null });
  };

  const handleGoRoot = () => {
    setCurrentFolderId(null);
    setFolderPath([]);
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setOpenedMenuId(null);
    setSearchQuery("");
    setHighlightDocumentId(null);
    setPendingWorkspaceDocument(null);
    syncDeepLinkUrl({ folderId: null, documentId: null, open: null });
  };

  const handleGoBack = () => {
    if (folderPath.length === 0) return;

    const nextPath = folderPath.slice(0, -1);
    const previousFolder = nextPath[nextPath.length - 1];

    setFolderPath(nextPath);
    setCurrentFolderId(previousFolder ? previousFolder.id : null);
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setOpenedMenuId(null);
    setSearchQuery("");
    setHighlightDocumentId(null);
    setPendingWorkspaceDocument(null);
    syncDeepLinkUrl({
      folderId: previousFolder ? previousFolder.id : null,
      documentId: null,
      open: null,
    });
  };

  const handleGoToBreadcrumb = (index) => {
    const nextPath = folderPath.slice(0, index + 1);
    const folder = nextPath[nextPath.length - 1];

    setFolderPath(nextPath);
    setCurrentFolderId(folder ? folder.id : null);
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setOpenedMenuId(null);
    setSearchQuery("");
    setHighlightDocumentId(null);
    setPendingWorkspaceDocument(null);
    syncDeepLinkUrl({
      folderId: folder ? folder.id : null,
      documentId: null,
      open: null,
    });
  };

  const handleCreateDocument = async () => {
    if (!documentTitle.trim()) return;

    setIsCreating(true);
    setError("");

    try {
      await createLibraryDocument(libraryId, {
        title: documentTitle.trim(),
        document_type: documentType,
        parent_id: currentFolderId,
      });

      setDocumentTitle("");
      setDocumentType("word");

      await loadDocuments(currentFolderId);
    } catch (createError) {
      console.error(createError);
      setError("Не удалось создать документ");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderTitle = window.prompt("Название папки");

    if (!folderTitle || !folderTitle.trim()) return;

    setIsCreatingFolder(true);
    setError("");

    try {
      await createLibraryFolder(libraryId, {
        title: folderTitle.trim(),
        parent_id: currentFolderId,
      });

      await loadDocuments(currentFolderId);
    } catch (createFolderError) {
      console.error(createFolderError);
      setError("Не удалось создать папку");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async (file, fileInputRef = null) => {
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      await uploadLibraryDocument(libraryId, file, currentFolderId);

      if (fileInputRef?.current) {
        fileInputRef.current.value = "";
      }

      await loadDocuments(currentFolderId);
    } catch (uploadError) {
      console.error(uploadError);
      setError("Не удалось загрузить файл");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRenameDocument = async (document) => {
    const nextTitle = window.prompt("Новое название", document.title);

    if (!nextTitle || !nextTitle.trim()) return;

    setError("");

    try {
      await renameLibraryDocument(document.id, nextTitle.trim());

      setOpenedMenuId(null);

      setFolderPath((prev) =>
        prev.map((folder) =>
          folder.id === document.id
            ? { ...folder, title: nextTitle.trim() }
            : folder,
        ),
      );

      await loadDocuments(currentFolderId);
    } catch (renameError) {
      console.error(renameError);
      setError("Ошибка переименования");
    }
  };

  const handleDeleteFile = async (document) => {
    const confirmed = window.confirm(`Удалить "${document.title}"?`);

    if (!confirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      await deleteLibraryDocument(document.id);
      setOpenedMenuId(null);

      await loadDocuments(currentFolderId);
    } catch (deleteError) {
      console.error(deleteError);
      setError("Ошибка удаления");
    } finally {
      setIsDeleting(false);
    }
  };

  const requestDeleteDocument = (document) => {
    setOpenedMenuId(null);
    setError("");

    if (document.is_folder) {
      setDeleteTarget(document);
      return;
    }

    handleDeleteFile(document);
  };

  const handleDeleteFolder = async (mode) => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setError("");

    try {
      await deleteLibraryDocument(deleteTarget.id, mode);

      setDeleteTarget(null);
      setOpenedMenuId(null);

      await loadDocuments(currentFolderId);
    } catch (deleteFolderError) {
      console.error(deleteFolderError);
      setError("Ошибка удаления папки");
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  const clearPendingWorkspaceDocument = useCallback(() => {
    setPendingWorkspaceDocument(null);
  }, []);

  const openWorkspaceDocument = useCallback(
    (document, { syncUrl = true } = {}) => {
      if (!document || document.is_folder) {
        return buildWorkspacePreviewPayload(document);
      }

      const payload = buildWorkspacePreviewPayload(document);
      if (!payload) {
        setHighlightDocumentId(document.id);
        return null;
      }

      setHighlightDocumentId(null);

      if (syncUrl && enableDeepLinkUrl) {
        syncDeepLinkUrl({
          folderId: currentFolderId,
          documentId: document.id,
          open: LIBRARY_OPEN_DOCUMENT,
        });
        return payload;
      }

      setPendingWorkspaceDocument(document);
      return payload;
    },
    [currentFolderId, enableDeepLinkUrl, syncDeepLinkUrl],
  );

  const closeWorkspaceDocumentUrl = useCallback(() => {
    setPendingWorkspaceDocument(null);
    setHighlightDocumentId(null);
    syncDeepLinkUrl({
      folderId: currentFolderId,
      documentId: null,
      open: null,
    });
  }, [currentFolderId, syncDeepLinkUrl]);

  return {
    documents,
    filteredDocuments,

    currentFolderId,
    folderPath,
    highlightDocumentId,
    pendingWorkspaceDocument,
    clearPendingWorkspaceDocument,
    openWorkspaceDocument,
    closeWorkspaceDocumentUrl,
    syncDeepLinkUrl,
    isDeepLinkReady,

    pagination,
    currentPage,
    totalPages,
    goToPage,

    isLoading,
    isCreating,
    isCreatingFolder,
    isUploading,
    isDeleting,

    documentTitle,
    setDocumentTitle,
    documentType,
    setDocumentType,
    searchQuery,
    setSearchQuery,
    openedMenuId,
    setOpenedMenuId,
    deleteTarget,
    error,

    loadDocuments,
    handleOpenFolder,
    handleGoRoot,
    handleGoBack,
    handleGoToBreadcrumb,
    handleCreateDocument,
    handleCreateFolder,
    handleUploadFile,
    handleRenameDocument,
    requestDeleteDocument,
    handleDeleteFile,
    handleDeleteFolder,
    closeDeleteModal,
  };
}
