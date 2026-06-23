import { API_BASE_URL } from "../../../config/apiConfig.js";
import { buildRuntimeAuthHeaders } from "../../../api/runtimeFetch.js";
import { getRuntimeAuthToken } from "../../../api/runtimeAuthToken.js";

function normalizeProtectedFilePath(fileUrlOrPath) {
  const raw = String(fileUrlOrPath || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      if (url.origin === API_BASE_URL.replace(/\/$/, "")) {
        return url.pathname;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
}

const PROTECTED_DOCUMENT_PATH_PATTERNS = [
  /\/files\/documents\//i,
  /\/uploads\/documents\//i,
  /\/tenants\/\d+\/documents\/\d+\/download/i,
];

export function isProtectedDocumentFilePath(fileUrlOrPath) {
  const raw = String(fileUrlOrPath || "").trim();
  if (!raw || raw.startsWith("blob:")) {
    return false;
  }

  const path = normalizeProtectedFilePath(raw);
  if (!path || path.startsWith("http")) {
    return false;
  }

  return PROTECTED_DOCUMENT_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export async function fetchProtectedFileBlobUrl(fileUrlOrPath) {
  const normalizedPath = normalizeProtectedFilePath(fileUrlOrPath);
  if (!normalizedPath || normalizedPath.startsWith("http")) {
    throw new Error("Некорректный путь к защищённому файлу");
  }

  const { token } = getRuntimeAuthToken();
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = "Не удалось загрузить файл";
    try {
      const data = await response.json();
      message = data?.detail || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function downloadProtectedDocumentFile({
  fileUrl,
  fileName = "document",
}) {
  const blobUrl = await fetchProtectedFileBlobUrl(fileUrl);

  try {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

const PUBLIC_STATIC_UPLOAD_PREFIXES = [
  ["/files/images/", "/uploads/images/"],
  ["/files/icons/", "/uploads/icons/"],
  ["/files/avatars/", "/uploads/avatars/"],
];

/**
 * Map authenticated /files/* paths to still-public StaticFiles mounts.
 * <img> tags cannot send Bearer tokens; CMS image/icon assets stay on /uploads/*.
 */
export function resolvePublicStaticUploadPath(fileUrl) {
  const normalizedUrl = String(fileUrl || "").trim();
  if (!normalizedUrl) {
    return "";
  }

  for (const [apiPrefix, staticPrefix] of PUBLIC_STATIC_UPLOAD_PREFIXES) {
    if (normalizedUrl.startsWith(apiPrefix)) {
      return `${staticPrefix}${normalizedUrl.slice(apiPrefix.length)}`;
    }
  }

  return normalizedUrl;
}

export async function uploadFile({
  file,
  endpoint = "/files/upload",
}) {
  if (!file) {
    throw new Error("Файл не выбран");
  }

  const { token } = getRuntimeAuthToken();

  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    let message = "Ошибка загрузки файла";

    try {
      const data = await response.json();

      message = data?.detail || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  return response.json();
}

function remapApiOriginStaticPath(absoluteUrl) {
  const normalizedUrl = String(absoluteUrl || "").trim();
  if (
    !normalizedUrl.startsWith("http://")
    && !normalizedUrl.startsWith("https://")
  ) {
    return normalizedUrl;
  }

  try {
    const url = new URL(normalizedUrl);
    const apiBase = new URL(`${API_BASE_URL.replace(/\/$/, "")}/`);
    if (url.origin !== apiBase.origin) {
      return normalizedUrl;
    }

    const publicPath = resolvePublicStaticUploadPath(url.pathname);
    if (publicPath.startsWith("/uploads/")) {
      return `${url.origin}${publicPath}`;
    }

    return normalizedUrl;
  } catch {
    return normalizedUrl;
  }
}

export function buildAvatarUrl(avatarUrl) {
  return buildFileUrl(avatarUrl);
}

export function buildFileUrl(fileUrl) {
  if (!fileUrl) {
    return "";
  }

  const normalizedUrl = String(fileUrl).trim();

  if (!normalizedUrl) {
    return "";
  }

  if (
    normalizedUrl.startsWith("http://") ||
    normalizedUrl.startsWith("https://")
  ) {
    return remapApiOriginStaticPath(normalizedUrl);
  }

  const publicPath = resolvePublicStaticUploadPath(
    normalizedUrl.startsWith("/") ? normalizedUrl : `/${normalizedUrl}`,
  );

  if (publicPath.startsWith("/uploads/")) {
    return `${API_BASE_URL}${publicPath}`;
  }

  if (normalizedUrl.startsWith("/uploads/")) {
    return `${API_BASE_URL}${normalizedUrl}`;
  }

  if (normalizedUrl.startsWith("uploads/")) {
    return `${API_BASE_URL}/${normalizedUrl}`;
  }

  if (publicPath.startsWith("/")) {
    return `${API_BASE_URL}${publicPath}`;
  }

  if (normalizedUrl.startsWith("/")) {
    return `${API_BASE_URL}${normalizedUrl}`;
  }

  return `${API_BASE_URL}/uploads/${normalizedUrl}`;
}

export function isImageFile(fileType = "", fileName = "") {
  const normalizedType = String(fileType).toLowerCase();

  const normalizedName = String(fileName).toLowerCase();

  return (
    normalizedType.startsWith("image/") ||
    normalizedName.endsWith(".jpg") ||
    normalizedName.endsWith(".jpeg") ||
    normalizedName.endsWith(".png") ||
    normalizedName.endsWith(".gif") ||
    normalizedName.endsWith(".svg") ||
    normalizedName.endsWith(".webp")
  );
}

export function formatFileSize(bytes) {
  const value = Number(bytes);

  if (!value || Number.isNaN(value)) {
    return "";
  }

  if (value < 1024) {
    return `${value} Б`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} КБ`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}