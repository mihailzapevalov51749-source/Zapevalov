const API_BASE_URL = "http://127.0.0.1:8010";

export async function getLibraryDocuments(libraryId, parentId = null) {
  const query = parentId ? `?parent_id=${parentId}` : "";

  const response = await fetch(
    `${API_BASE_URL}/document-libraries/${libraryId}/documents${query}`
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить документы библиотеки");
  }

  return await response.json();
}

/* 🔍 ГЛОБАЛЬНЫЙ ПОИСК */
export async function searchLibraryDocuments(libraryId, searchQuery) {
  const response = await fetch(
    `${API_BASE_URL}/document-libraries/${libraryId}/documents/search?query=${encodeURIComponent(
      searchQuery
    )}`
  );

  if (!response.ok) {
    throw new Error("Не удалось выполнить поиск");
  }

  return await response.json();
}

export async function createLibraryDocument(libraryId, data) {
  const response = await fetch(
    `${API_BASE_URL}/document-libraries/${libraryId}/documents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось создать документ");
  }

  return await response.json();
}

export async function createLibraryFolder(libraryId, data) {
  const response = await fetch(
    `${API_BASE_URL}/document-libraries/${libraryId}/folders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось создать папку");
  }

  return await response.json();
}

export async function uploadLibraryDocument(libraryId, file, parentId = null) {
  const formData = new FormData();
  formData.append("file", file);

  if (parentId) {
    formData.append("parent_id", parentId);
  }

  const response = await fetch(
    `${API_BASE_URL}/document-libraries/${libraryId}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить файл");
  }

  return await response.json();
}

export async function renameLibraryDocument(documentId, title) {
  const response = await fetch(
    `${API_BASE_URL}/document-libraries/documents/${documentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось переименовать документ");
  }

  return await response.json();
}

export async function deleteLibraryDocument(
  documentId,
  mode = "folder_only"
) {
  const response = await fetch(
    `${API_BASE_URL}/document-libraries/documents/${documentId}?mode=${mode}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось удалить документ");
  }

  return await response.json();
}