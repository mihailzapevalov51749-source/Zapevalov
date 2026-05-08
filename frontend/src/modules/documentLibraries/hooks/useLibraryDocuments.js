import { useEffect, useMemo, useState } from "react";

import {
  getLibraryDocuments,
  createLibraryDocument,
  createLibraryFolder,
  uploadLibraryDocument,
  renameLibraryDocument,
  deleteLibraryDocument,
  searchLibraryDocuments, // 🔴 добавлено
} from "../api/documentLibrariesApi";

import { filterDocuments } from "../services/documentLibrariesService";

export default function useLibraryDocuments({ libraryId }) {
  const [documents, setDocuments] = useState([]);

  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  });

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);

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

  // 📄 обычная загрузка
  const loadDocuments = async (parentId = currentFolderId) => {
    if (!libraryId) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await getLibraryDocuments(
        libraryId,
        parentId,
        pagination.limit,
        pagination.offset
      );

      setDocuments(data.items || []);

      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (error) {
      console.error(error);
      setError("Не удалось загрузить документы");
    } finally {
      setIsLoading(false);
    }
  };

  // 🔍 глобальный поиск
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
    } catch (error) {
      console.error(error);
      setError("Ошибка поиска");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setDocuments([]);
    setCurrentFolderId(null);
    setFolderPath([]);
    setOpenedMenuId(null);
    setDeleteTarget(null);
    setSearchQuery("");
    setError("");
    setPagination({
      total: 0,
      limit: 50,
      offset: 0,
    });
  }, [libraryId]);

  // 🔴 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      handleGlobalSearch();
    } else {
      loadDocuments(currentFolderId);
    }
  }, [libraryId, currentFolderId, pagination.offset, searchQuery]);

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
    setSearchQuery(""); // 🔴 сброс поиска
  };

  const handleGoRoot = () => {
    setCurrentFolderId(null);
    setFolderPath([]);
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setOpenedMenuId(null);
    setSearchQuery("");
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
  };

  const handleGoToBreadcrumb = (index) => {
    const nextPath = folderPath.slice(0, index + 1);
    const folder = nextPath[nextPath.length - 1];

    setFolderPath(nextPath);
    setCurrentFolderId(folder ? folder.id : null);
    setPagination((prev) => ({ ...prev, offset: 0 }));
    setOpenedMenuId(null);
    setSearchQuery("");
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
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
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
            : folder
        )
      );

      await loadDocuments(currentFolderId);
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
      setError("Ошибка удаления папки");
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  return {
    documents,
    filteredDocuments,

    currentFolderId,
    folderPath,

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