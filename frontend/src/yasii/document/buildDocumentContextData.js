import { EMBEDDED_SURFACE_IDS } from "../embedded/embeddedSurfaceTypes.js";

function resolveFileExtension(fileName, documentType) {
  const name = String(fileName ?? "").trim();
  if (name.includes(".")) {
    return name.split(".").pop().toLowerCase();
  }

  const normalizedType = String(documentType ?? "").trim().toLowerCase();
  if (["docx", "doc", "word"].includes(normalizedType)) {
    return "docx";
  }
  if (["xlsx", "xls", "excel"].includes(normalizedType)) {
    return "xlsx";
  }
  if (normalizedType === "pdf") {
    return "pdf";
  }

  return normalizedType;
}

export function resolveDocumentTypeLabel(documentRecord, preview = null) {
  const fileName =
    preview?.fileName
    || documentRecord?.original_filename
    || documentRecord?.originalFilename
    || documentRecord?.title
    || "";
  const extension = resolveFileExtension(fileName, documentRecord?.document_type || preview?.fileType);
  const normalizedType = String(documentRecord?.document_type || preview?.fileType || extension)
    .trim()
    .toLowerCase();

  if (
    ["docx", "doc", "word"].includes(normalizedType)
    || extension === "docx"
    || extension === "doc"
  ) {
    return "DOCX";
  }

  if (
    ["xlsx", "xls", "excel"].includes(normalizedType)
    || extension === "xlsx"
    || extension === "xls"
  ) {
    return "XLSX";
  }

  if (normalizedType === "pdf" || extension === "pdf") {
    return "PDF";
  }

  if (extension) {
    return extension.toUpperCase();
  }

  return normalizedType ? normalizedType.toUpperCase() : "ФАЙЛ";
}

export function resolveDocumentDisplayName(documentRecord, preview = null) {
  const raw =
    preview?.fileName
    || documentRecord?.title
    || documentRecord?.original_filename
    || documentRecord?.originalFilename
    || "Документ";
  const normalized = String(raw).trim() || "Документ";

  if (!normalized.includes(".")) {
    return normalized;
  }

  const withoutExtension = normalized.replace(/\.[^.]+$/, "").trim();
  return withoutExtension || normalized;
}

function formatFolderPath(folderPath = []) {
  const segments = Array.isArray(folderPath)
    ? folderPath
        .map((item) => String(item?.title ?? item?.name ?? item?.label ?? "").trim())
        .filter(Boolean)
    : [];

  return segments.join(" / ");
}

function resolveDocumentPath(documentRecord, folderPath = []) {
  const filePath = String(documentRecord?.file_path ?? documentRecord?.filePath ?? "").trim();
  const folderLabel = formatFolderPath(folderPath);

  if (folderLabel && filePath) {
    return `${folderLabel} / ${filePath}`;
  }

  if (folderLabel) {
    return folderLabel;
  }

  return filePath;
}

/**
 * Build document surface contextData from loaded library document (no YASII logic).
 */
export function buildDocumentContextData({
  tenantId,
  userId,
  libraryId,
  libraryName,
  documentRecord,
  folderPath = [],
  viewerType = "file_viewer",
}) {
  if (!documentRecord || documentRecord.is_folder) {
    return null;
  }

  const preview = {
    fileName:
      documentRecord.original_filename
      || documentRecord.originalFilename
      || documentRecord.title
      || "Документ",
    fileType: documentRecord.document_type,
  };

  const documentId = String(documentRecord.id ?? "").trim();
  if (!documentId) {
    return null;
  }

  const documentName = resolveDocumentDisplayName(documentRecord, preview);
  const documentType = resolveDocumentTypeLabel(documentRecord, preview);
  const normalizedLibraryId = String(libraryId ?? documentRecord.library_id ?? "").trim();
  const normalizedLibraryName = String(libraryName ?? "").trim() || "Библиотека документов";
  const fileExtension = resolveFileExtension(preview.fileName, documentRecord.document_type);
  const fileSizeRaw = documentRecord.file_size ?? documentRecord.fileSize ?? "";
  const fileSize = fileSizeRaw != null && String(fileSizeRaw).trim() ? String(fileSizeRaw).trim() : "";
  const documentPath = resolveDocumentPath(documentRecord, folderPath);
  const documentStatus = String(
    documentRecord.status ?? documentRecord.document_status ?? documentRecord.lifecycle_status ?? "open",
  ).trim();
  const normalizedViewerType = String(viewerType ?? "").trim() || "file_viewer";
  const selectedScope = [
    "document",
    normalizedLibraryId || "library",
    documentId,
  ]
    .filter(Boolean)
    .join(":");

  return {
    tenantId: String(tenantId ?? documentRecord.tenant_id ?? "0"),
    userId: String(userId ?? "").trim(),
    documentId,
    documentName,
    documentType,
    documentLibraryId: normalizedLibraryId,
    documentLibraryName: normalizedLibraryName,
    selectedScope,
    widgetId: `document-${documentId}`,
    metadata: {
      fileExtension,
      fileSize,
      documentPath,
      documentStatus,
      viewerType: normalizedViewerType,
      documentName,
      documentType,
      documentLibraryId: normalizedLibraryId,
      documentLibraryName: normalizedLibraryName,
    },
  };
}

export function buildDocumentYasiiSurfaceValue(input) {
  const contextData = buildDocumentContextData(input);
  if (!contextData) {
    return null;
  }

  return {
    surfaceId: EMBEDDED_SURFACE_IDS.DOCUMENT,
    contextData,
    inputPlaceholder: "Спросите ЯСИИ об открытом документе...",
  };
}
