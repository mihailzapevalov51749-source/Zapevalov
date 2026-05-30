import { useEffect, useRef, useState } from "react";

import { getLibraryDocumentById } from "../api/documentLibrariesApi";
import { buildWorkspacePreviewPayload } from "../services/documentLibrariesService";
import { resolveFolderPath } from "../utils/libraryFolderPath";
import FileViewerWorkspace from "../../../shared/files/components/FileViewerWorkspace";

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
  folderId = null,
  onDocumentLoaded,
  onClose,
}) {
  const [documentRecord, setDocumentRecord] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const onDocumentLoadedRef = useRef(onDocumentLoaded);

  useEffect(() => {
    onDocumentLoadedRef.current = onDocumentLoaded;
  }, [onDocumentLoaded]);

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      setIsLoading(true);
      setError("");

      try {
        const record = await getLibraryDocumentById(documentId);
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
            getDocumentById: getLibraryDocumentById,
          });
          resolvedFolderPath = resolved.folderPath;
        }

        if (cancelled) {
          return;
        }

        setDocumentRecord(record);

        if (typeof onDocumentLoadedRef.current === "function") {
          onDocumentLoadedRef.current({
            documentRecord: record,
            folderPath: resolvedFolderPath,
            documentTitle: getDocumentTitle(
              record,
              buildWorkspacePreviewPayload(record),
            ),
          });
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("Не удалось загрузить документ");
          setDocumentRecord(null);
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
    };
  }, [documentId, libraryId, folderId]);

  const preview = buildWorkspacePreviewPayload(documentRecord);

  return (
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
  );
}
