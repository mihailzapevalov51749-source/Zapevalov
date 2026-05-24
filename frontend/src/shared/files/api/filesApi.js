const API_BASE_URL = "http://127.0.0.1:8010";

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken")
  );
}

export async function uploadFile({
  file,
  endpoint = "/files/upload",
}) {
  if (!file) {
    throw new Error("Файл не выбран");
  }

  const token = getAuthToken();

  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method: "POST",

      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
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
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith("/uploads/")) {
    return `${API_BASE_URL}${normalizedUrl}`;
  }

  if (normalizedUrl.startsWith("uploads/")) {
    return `${API_BASE_URL}/${normalizedUrl}`;
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