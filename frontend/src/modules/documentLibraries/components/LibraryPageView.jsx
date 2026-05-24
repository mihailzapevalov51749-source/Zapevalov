import { useMemo, useRef, useState } from "react";

import {
  getFileUrl,
  getTypeLabel,
  getIcon,
  formatDocumentDate,
  moveLibraryDocument,
} from "../services/documentLibrariesService";

import useLibraryDocuments from "../hooks/useLibraryDocuments";

import LibraryToolbar from "./LibraryToolbar";
import LibraryBreadcrumbs from "./LibraryBreadcrumbs";
import LibraryTable from "./LibraryTable";
import LibraryGrid from "./LibraryGrid";
import DeleteFolderModal from "./DeleteFolderModal";
import MoveDocumentModal from "./MoveDocumentModal";

import FileViewerModal from "../../../shared/files/components/FileViewerModal";

import * as styles from "./libraryStyles";

export default function LibraryPageView({
  libraryId,
  title = "Библиотека документов",
}) {
  const fileInputRef = useRef(null);

  const [moveTarget, setMoveTarget] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("table");
  const [previewFile, setPreviewFile] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    field: "title",
    direction: "asc",
  });

  const {
    filteredDocuments,
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
    handleOpenFolder,
    handleGoRoot,
    handleGoBack,
    handleGoToBreadcrumb,
    handleCreateDocument,
    handleCreateFolder,
    handleUploadFile,
    handleRenameDocument,
    requestDeleteDocument,
    handleDeleteFolder,
    closeDeleteModal,
    loadDocuments,
  } = useLibraryDocuments({ libraryId });

  const currentParentId =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1].id
      : null;

  const currentFolderTitle =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1].title
      : title;

  const start = pagination.offset + 1;

  const end = Math.min(
    pagination.offset + pagination.limit,
    pagination.total
  );

  const sortedDocuments = useMemo(() => {
    const parseDateValue = (document) => {
      const raw =
        document.updated_at ||
        document.updatedAt ||
        document.created_at ||
        document.createdAt ||
        "";

      if (!raw) return 0;

      const parsed = new Date(raw).getTime();

      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const getValue = (document) => {
      switch (sortConfig.field) {
        case "title":
          return document.title || "";

        case "date":
          return parseDateValue(document);

        case "author":
          return document.created_by || "";

        case "type":
          return (
            getTypeLabel(
              document.document_type,
              Boolean(document.is_folder)
            ) || ""
          );

        default:
          return document.title || "";
      }
    };

    return [...filteredDocuments].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      let result = 0;

      if (sortConfig.field === "date") {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue), "ru-RU", {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortConfig.direction === "asc" ? result : -result;
    });
  }, [filteredDocuments, sortConfig]);

  const handleChangeSortField = (field) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field ? prev.direction : "asc",
    }));
  };

  const handleToggleSortDirection = () => {
    setSortConfig((prev) => ({
      ...prev,
      direction: prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const reloadDocuments = async () => {
    if (typeof loadDocuments === "function") {
      await loadDocuments();
      return;
    }

    goToPage(currentPage);
  };

  const toggleSelectDocument = (documentId) => {
    setSelectedIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handlePreviewFile = (file, initialContext = null) => {
    if (!file?.fileUrl) return;

    setOpenedMenuId(null);

    setPreviewFile({
      ...file,
      initialContext,
    });
  };

  const handleClosePreviewFile = () => {
    setPreviewFile(null);
  };

  const handleOpenMoveModal = (document) => {
    setMoveError("");
    setOpenedMenuId(null);
    setMoveTarget(document);
  };

  const handleCloseMoveModal = () => {
    if (isMoving) return;

    setMoveTarget(null);
    setMoveError("");
  };

  const handleMoveDocument = async (document, targetParentId) => {
    try {
      setIsMoving(true);
      setMoveError("");

      await moveLibraryDocument(document.id, targetParentId);

      setMoveTarget(null);
      clearSelection();

      await reloadDocuments();
    } catch (err) {
      setMoveError(err?.message || "Не удалось переместить документ");
    } finally {
      setIsMoving(false);
    }
  };

  const handleDropMoveDocuments = async (documents, targetParentId) => {
    try {
      if (!Array.isArray(documents) || documents.length === 0) return;

      setMoveError("");

      const uniqueDocuments = documents.filter(
        (document, index, array) =>
          document?.id &&
          array.findIndex((item) => item.id === document.id) === index
      );

      for (const document of uniqueDocuments) {
        if (document.id === targetParentId) continue;

        await moveLibraryDocument(document.id, targetParentId);
      }

      clearSelection();

      await reloadDocuments();
    } catch (err) {
      setMoveError(err?.message || "Не удалось переместить документы");
    }
  };

  const handleDropMoveDocument = async (document, targetParentId) => {
    if (!document?.id) return;

    await handleDropMoveDocuments([document], targetParentId);
  };

  const handleDropToRoot = async (draggedDocuments) => {
    await handleDropMoveDocuments(draggedDocuments, null);
  };

  const handleDropToBreadcrumb = async (draggedDocuments, folder) => {
    if (!folder?.id) return;

    const documentsToMove = Array.isArray(draggedDocuments)
      ? draggedDocuments.filter((document) => document.id !== folder.id)
      : [];

    await handleDropMoveDocuments(documentsToMove, folder.id);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitleRow}>
            {folderPath.length > 0 && (
              <button
                type="button"
                onClick={handleGoBack}
                style={styles.headerBackButton}
                title="Назад"
              >
                ←
              </button>
            )}

            <h1 style={styles.titleStyle}>{currentFolderTitle}</h1>
          </div>

          <LibraryBreadcrumbs
            title={title}
            folderPath={folderPath}
            onGoRoot={handleGoRoot}
            onGoToBreadcrumb={handleGoToBreadcrumb}
            onDropToRoot={handleDropToRoot}
            onDropToBreadcrumb={handleDropToBreadcrumb}
            styles={styles}
          />
        </div>
      </div>

      <LibraryToolbar
        folderPath={folderPath}
        documentTitle={documentTitle}
        setDocumentTitle={setDocumentTitle}
        documentType={documentType}
        setDocumentType={setDocumentType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortConfig={sortConfig}
        onChangeSortField={handleChangeSortField}
        onToggleSortDirection={handleToggleSortDirection}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        isCreating={isCreating}
        isCreatingFolder={isCreatingFolder}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onCreateDocument={handleCreateDocument}
        onCreateFolder={handleCreateFolder}
        onUploadFile={(file) => handleUploadFile(file, fileInputRef)}
        styles={styles}
      />

      {error && <div style={styles.errorBox}>{error}</div>}
      {moveError && <div style={styles.errorBox}>{moveError}</div>}

      <div style={styles.documentsScrollArea}>
        {viewMode === "table" && (
          <LibraryTable
            documents={sortedDocuments}
            isLoading={isLoading}
            searchQuery={searchQuery}
            openedMenuId={openedMenuId}
            setOpenedMenuId={setOpenedMenuId}
            selectedIds={selectedIds}
            onToggleSelectDocument={toggleSelectDocument}
            onOpenFolder={handleOpenFolder}
            onRenameDocument={handleRenameDocument}
            onDeleteDocument={requestDeleteDocument}
            onMoveDocument={handleOpenMoveModal}
            onPreviewFile={handlePreviewFile}
            onDropMoveDocument={handleDropMoveDocument}
            onDropMoveDocuments={handleDropMoveDocuments}
            getFileUrl={getFileUrl}
            getTypeLabel={getTypeLabel}
            getIcon={getIcon}
            formatDocumentDate={formatDocumentDate}
            styles={styles}
          />
        )}

        {viewMode === "grid" && (
          <LibraryGrid
            documents={sortedDocuments}
            isLoading={isLoading}
            searchQuery={searchQuery}
            openedMenuId={openedMenuId}
            setOpenedMenuId={setOpenedMenuId}
            selectedIds={selectedIds}
            onToggleSelectDocument={toggleSelectDocument}
            onOpenFolder={handleOpenFolder}
            onRenameDocument={handleRenameDocument}
            onDeleteDocument={requestDeleteDocument}
            onMoveDocument={handleOpenMoveModal}
            onPreviewFile={handlePreviewFile}
            onDropMoveDocument={handleDropMoveDocument}
            onDropMoveDocuments={handleDropMoveDocuments}
            getFileUrl={getFileUrl}
            getTypeLabel={getTypeLabel}
            getIcon={getIcon}
            formatDocumentDate={formatDocumentDate}
            styles={styles}
          />
        )}
      </div>

      <div style={styles.pagination}>
        <span>
          {pagination.total === 0 ? "0" : `${start}–${end}`} из{" "}
          {pagination.total}
        </span>

        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
          style={styles.pageButton}
        >
          ‹
        </button>

        <span style={styles.pageInfo}>
          {currentPage} / {totalPages || 1}
        </span>

        <button
          type="button"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => goToPage(currentPage + 1)}
          style={styles.pageButton}
        >
          ›
        </button>
      </div>

      <FileViewerModal
        isOpen={Boolean(previewFile)}
        fileUrl={previewFile?.fileUrl}
        fileName={previewFile?.fileName}
        fileType={previewFile?.fileType}
        fileId={previewFile?.raw?.id}
        initialContext={previewFile?.initialContext}
        userId="1"
        userName="Михаил"
        mode="view"
        onClose={handleClosePreviewFile}
      />

      <DeleteFolderModal
        folder={deleteTarget}
        isDeleting={isDeleting}
        onDeleteWithChildren={() => handleDeleteFolder("with_children")}
        onDeleteOnlyFolder={() => handleDeleteFolder("folder_only")}
        onClose={closeDeleteModal}
        styles={styles}
      />

      <MoveDocumentModal
        isOpen={Boolean(moveTarget)}
        document={moveTarget}
        folders={filteredDocuments}
        currentParentId={currentParentId}
        isMoving={isMoving}
        onClose={handleCloseMoveModal}
        onMove={handleMoveDocument}
      />
    </div>
  );
}