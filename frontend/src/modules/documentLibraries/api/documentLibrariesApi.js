import { platformApiClient } from "../../designer/api/platformApiClient";

function tenantLibrariesBase(tenantId) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {
    throw new Error("tenantId обязателен для Document Libraries API");
  }
  return `/tenants/${normalizedTenantId}/document-libraries`;
}

export function getLibraryDocumentDownloadPath(tenantId, documentId) {
  const normalizedTenantId = Number(tenantId);
  const normalizedDocumentId = Number(documentId);
  if (
    !Number.isFinite(normalizedTenantId) ||
    normalizedTenantId <= 0 ||
    !Number.isFinite(normalizedDocumentId) ||
    normalizedDocumentId <= 0
  ) {
    return null;
  }
  return `/tenants/${normalizedTenantId}/documents/${normalizedDocumentId}/download`;
}

export async function fetchLibraryDocumentBlobUrl(tenantId, documentId) {
  const path = getLibraryDocumentDownloadPath(tenantId, documentId);
  if (!path) {
    throw new Error("Не удалось построить URL загрузки документа");
  }

  const response = await platformApiClient.get(path, {
    responseType: "blob",
  });

  return URL.createObjectURL(response.data);
}

export async function getLibraryDocuments(tenantId, libraryId, parentId = null) {
  const params = {};
  if (parentId != null) {
    params.parent_id = parentId;
  }

  const { data } = await platformApiClient.get(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents`,
    { params },
  );
  return data;
}

export async function getLibraryDocumentById(tenantId, libraryId, documentId) {
  const { data } = await platformApiClient.get(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents/${documentId}`,
  );
  return data;
}

export async function searchLibraryDocuments(tenantId, libraryId, searchQuery) {
  const { data } = await platformApiClient.get(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents/search`,
    {
      params: { query: searchQuery },
    },
  );
  return data;
}

export async function createLibraryDocument(tenantId, libraryId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents`,
    payload,
  );
  return data;
}

export async function createLibraryFolder(tenantId, libraryId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/folders`,
    payload,
  );
  return data;
}

export async function uploadLibraryDocument(tenantId, libraryId, file, parentId = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (parentId != null) {
    formData.append("parent_id", parentId);
  }

  const { data } = await platformApiClient.post(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
}

export async function renameLibraryDocument(tenantId, libraryId, documentId, title) {
  const { data } = await platformApiClient.patch(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents/${documentId}`,
    { title },
  );
  return data;
}

export async function deleteLibraryDocument(
  tenantId,
  libraryId,
  documentId,
  mode = "folder_only",
) {
  const { data } = await platformApiClient.delete(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents/${documentId}`,
    {
      params: { mode },
    },
  );
  return data;
}

export async function moveLibraryDocument(tenantId, libraryId, documentId, parentId) {
  const { data } = await platformApiClient.patch(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents/${documentId}/move`,
    { parent_id: parentId },
  );
  return data;
}

export async function getLibraryDocumentByFileKey(tenantId, libraryId, fileKey) {
  const encodedFileKey = encodeURIComponent(String(fileKey || ""));
  const { data } = await platformApiClient.get(
    `${tenantLibrariesBase(tenantId)}/${libraryId}/documents/by-file/${encodedFileKey}`,
  );
  return data;
}

export async function listDocumentLibraries(tenantId) {
  const { data } = await platformApiClient.get(tenantLibrariesBase(tenantId));
  return Array.isArray(data) ? data : [];
}

export async function createDocumentLibrary(tenantId, payload) {
  const { data } = await platformApiClient.post(tenantLibrariesBase(tenantId), {
    ...payload,
    portal_id: Number(tenantId),
  });
  return data;
}
