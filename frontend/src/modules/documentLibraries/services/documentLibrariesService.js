import { API_BASE_URL } from "../../../config/apiConfig.js";
import {
  fetchLibraryDocumentBlobUrl,
  getLibraryDocumentDownloadPath,
  moveLibraryDocument as moveLibraryDocumentApi,
} from "../api/documentLibrariesApi";
import { platformApiClient } from "../../designer/api/platformApiClient";

export function getFileUrl(document, tenantId) {
  const path = getLibraryDocumentDownloadPath(tenantId, document?.id);
  if (!path) {
    return "#";
  }
  return `${API_BASE_URL}${path}`;
}

export async function downloadLibraryDocument(document, tenantId) {
  const blobUrl = await fetchLibraryDocumentBlobUrl(tenantId, document.id);
  const link = window.document.createElement("a");
  link.href = blobUrl;
  link.download =
    document.original_filename ||
    document.originalFilename ||
    document.title ||
    "document";
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export async function buildWorkspacePreviewPayload(document, tenantId) {
  if (!document?.id || document.is_folder) {
    return null;
  }

  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {
    return null;
  }

  const fileUrl = await fetchLibraryDocumentBlobUrl(
    normalizedTenantId,
    document.id,
  );

  return {
    fileUrl,
    fileName:
      document.original_filename ||
      document.originalFilename ||
      document.title ||
      "Файл",
    fileType: document.document_type,
    raw: document,
    revokeOnCleanup: true,
  };
}

export function getTypeLabel(type, isFolder = false) {
  if (isFolder) return "Папка";

  const value = String(type || "").toLowerCase();

  if (value === "word" || value === "docx" || value === "doc") return "Word";
  if (value === "excel" || value === "xlsx" || value === "xls") return "Excel";
  if (value === "pdf") return "PDF";

  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(value)) {
    return "Изображение";
  }

  return value ? value.toUpperCase() : "Файл";
}

export function getIcon(type, title = "", isFolder = false) {
  if (isFolder) {
    return { text: "□", bg: "#facc15", color: "#78350f" };
  }

  const value = String(type || "").toLowerCase();
  const name = String(title || "").toLowerCase();

  if (
    value === "word" ||
    value === "docx" ||
    value === "doc" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return { text: "W", bg: "#2563eb", color: "#ffffff" };
  }

  if (
    value === "excel" ||
    value === "xlsx" ||
    value === "xls" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    return { text: "X", bg: "#16a34a", color: "#ffffff" };
  }

  if (value === "pdf" || name.endsWith(".pdf")) {
    return { text: "PDF", bg: "#ef4444", color: "#ffffff" };
  }

  if (
    ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(value) ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif") ||
    name.endsWith(".svg")
  ) {
    return { text: "IMG", bg: "#22c55e", color: "#ffffff" };
  }

  return { text: "FILE", bg: "#64748b", color: "#ffffff" };
}

export function formatDocumentDate(document) {
  const rawDate =
    document?.updated_at ||
    document?.updatedAt ||
    document?.created_at ||
    document?.createdAt;

  if (!rawDate) return "—";

  return new Date(rawDate).toLocaleString("ru-RU");
}

export function filterDocuments(documents, searchQuery) {
  const query = String(searchQuery || "").trim().toLowerCase();

  if (!query) return documents;

  return documents.filter((document) => {
    const isFolder = Boolean(document.is_folder);
    const title = String(document.title || "").toLowerCase();
    const typeRaw = String(document.document_type || "").toLowerCase();

    const typeLabel = getTypeLabel(
      document.document_type,
      isFolder
    ).toLowerCase();

    const author = String(document.created_by || "").toLowerCase();

    const createdDateRaw = String(
      document.created_at || document.createdAt || ""
    ).toLowerCase();

    const updatedDateRaw = String(
      document.updated_at || document.updatedAt || ""
    ).toLowerCase();

    const formattedDate = formatDocumentDate(document).toLowerCase();

    const folderWords = isFolder ? "папка folder каталог директория" : "";

    const searchableText = [
      title,
      typeRaw,
      typeLabel,
      author,
      createdDateRaw,
      updatedDateRaw,
      formattedDate,
      folderWords,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });
}

export async function getLibraryDocument(tenantId, libraryId, documentId) {
  const { data } = await platformApiClient.get(
    `/tenants/${tenantId}/document-libraries/${libraryId}/documents/${documentId}`,
  );
  return data;
}

export async function getLibraryDocumentByFileKey(tenantId, libraryId, fileKey) {
  const encodedFileKey = encodeURIComponent(String(fileKey || ""));
  const { data } = await platformApiClient.get(
    `/tenants/${tenantId}/document-libraries/${libraryId}/documents/by-file/${encodedFileKey}`,
  );
  return data;
}

export async function moveLibraryDocument(
  tenantId,
  libraryId,
  documentId,
  parentId,
) {
  return moveLibraryDocumentApi(tenantId, libraryId, documentId, parentId);
}
