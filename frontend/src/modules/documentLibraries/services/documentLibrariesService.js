const API_BASE_URL = "http://127.0.0.1:8010";

export function getFileUrl(document) {
  if (!document?.file_path) return "#";
  return `${API_BASE_URL}${document.file_path}`;
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

export async function getLibraryDocument(documentId) {
  const response = await fetch(
    `${API_BASE_URL}/document-libraries/documents/${documentId}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(error?.detail || "Не удалось загрузить документ");
  }

  return response.json();
}

export async function getLibraryDocumentByFileKey(fileKey) {
  const encodedFileKey = encodeURIComponent(String(fileKey || ""));

  const response = await fetch(
    `${API_BASE_URL}/document-libraries/documents/by-file/${encodedFileKey}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(error?.detail || "Не удалось загрузить документ по ключу файла");
  }

  return response.json();
}

export async function moveLibraryDocument(documentId, parentId) {
  const response = await fetch(
    `${API_BASE_URL}/document-libraries/documents/${documentId}/move`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent_id: parentId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "Не удалось переместить документ");
  }

  return response.json();
}