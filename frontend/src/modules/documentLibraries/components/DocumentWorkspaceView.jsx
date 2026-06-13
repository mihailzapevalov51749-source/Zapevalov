import { useEffect, useMemo, useRef, useState } from "react";

import {
  getLibraryDocumentById,
} from "../api/documentLibrariesApi";
import {
  buildWorkspacePreviewPayload,
} from "../services/documentLibrariesService";
import { resolveFolderPath } from "../utils/libraryFolderPath";
import FileViewerWorkspace from "../../../shared/files/components/FileViewerWorkspace";
import { YasiiSurfaceContextProvider } from "../../../yasii/context/YasiiSurfaceContext.jsx";
import { buildDocumentYasiiSurfaceValue } from "../../../yasii/document/buildDocumentContextData.js";
import { resolvePlatformDashboardUserId } from "../../../yasii/hostContextBuilders.js";

import "./documentWorkspaceView.css";

function getDocumentTitle(documentRecord, preview) {
  return (
    preview?.fileName ||
    documentRecord?.title ||
    documentRecord?.original_filename ||
    documentRecord?.originalFilename ||
    "Документ"
  );
}

export default function DocumentWorkspaceView({
  documentId,
  libraryId,
  libraryName = "",
  tenantId = null,
  userId = null,
  folderId = null,
  onDocumentLoaded,
  onClose,
}) {
  const [documentRecord, setDocumentRecord] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const onDocumentLoadedRef = useRef(onDocumentLoaded);

  useEffect(() => {
    onDocumentLoadedRef.current = onDocumentLoaded;
  }, [onDocumentLoaded]);

  useEffect(() => {
    let cancelled = false;
    let blobUrlToRevoke = null;

    const loadDocument = async () => {
      setIsLoading(true);
      setError("");
      setPreview(null);

      try {
        const record = await getLibraryDocumentById(
          tenantId,
          libraryId,
          documentId,
        );
        if (cancelled) {
          return;
        }

        if (Number(record.library_id) !== Number(libraryId)) {
          throw new Error("Документ не принадлежит этой библиотеке");
        }

        if (record.is_folder) {
          throw new Error("Нельзя открыть папку как документ");
        }

        const targetFolderId =
          folderId != null ? folderId : record.parent_id ?? null;

        let resolvedFolderPath = [];
        if (targetFolderId != null) {
          const resolved = await resolveFolderPath({
            libraryId,
            targetFolderId,
            getDocumentById: (targetDocumentId) =>
              getLibraryDocumentById(tenantId, libraryId, targetDocumentId),
          });
          resolvedFolderPath = resolved.folderPath;
        }

        if (cancelled) {
          return;
        }

        const nextPreview = await buildWorkspacePreviewPayload(record, tenantId);
        if (nextPreview?.revokeOnCleanup) {
          blobUrlToRevoke = nextPreview.fileUrl;
        }

        setDocumentRecord(record);
        setFolderPath(resolvedFolderPath);
        setPreview(nextPreview);

        if (typeof onDocumentLoadedRef.current === "function") {
          onDocumentLoadedRef.current({
            documentRecord: record,
            folderPath: resolvedFolderPath,
            documentTitle: getDocumentTitle(record, nextPreview),
          });
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("Не удалось загрузить документ");
          setDocumentRecord(null);
          setFolderPath([]);
          setPreview(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
      }
    };
  }, [documentId, libraryId, tenantId, folderId]);

  const yasiiSurfaceValue = useMemo(
    () =>
      buildDocumentYasiiSurfaceValue({
        tenantId: tenantId ?? "",
        userId: userId ?? resolvePlatformDashboardUserId(),
        libraryId,
        libraryName,
        documentRecord,
        folderPath,
        viewerType: "file_viewer",
      }),
    [tenantId, userId, libraryId, libraryName, documentRecord, folderPath],
  );

  return (
    <YasiiSurfaceContextProvider value={yasiiSurfaceValue}>
    <div className="document-workspace-view">
      <div className="document-workspace-view__body">
        {isLoading ? (
          <div className="document-workspace-view__state">Загрузка документа...</div>
        ) : error ? (
          <div className="document-workspace-view__state is-error">{error}</div>
        ) : !preview ? (
          <div className="document-workspace-view__state">
            Документ нельзя открыть для просмотра
          </div>
        ) : (
          <FileViewerWorkspace
            fileUrl={preview.fileUrl}
            fileName={preview.fileName}
            fileType={preview.fileType}
            fileId={documentRecord?.id}
            documentRecord={documentRecord}
            userId="1"
            userName="Михаил"
            mode="view"
            onClose={onClose}
            showClose={typeof onClose === "function"}
          />
        )}
      </div>
    </div>
    </YasiiSurfaceContextProvider>
  );
}
