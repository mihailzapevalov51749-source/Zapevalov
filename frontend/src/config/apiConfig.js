export const FRONTEND_ENVIRONMENT_ERROR =
  "Frontend Environment Error\n\nVITE_API_BASE_URL is not configured.";

export function readApiBaseUrlFromEnvironment() {
  const raw = String(
    import.meta.env?.VITE_API_BASE_URL
      || (typeof process !== "undefined" ? process.env.VITE_API_BASE_URL : "")
      || "",
  ).trim();

  return raw.replace(/\/$/, "");
}

export function assertApiBaseUrlConfigured(
  value = readApiBaseUrlFromEnvironment(),
) {
  if (!value) {
    throw new Error(FRONTEND_ENVIRONMENT_ERROR);
  }

  return value;
}

export const API_BASE_URL = assertApiBaseUrlConfigured();

export function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

export function joinApiUrl(path = "") {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) {
    return API_BASE_URL;
  }

  if (
    normalizedPath.startsWith("http://")
    || normalizedPath.startsWith("https://")
  ) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

/** OnlyOffice Document Server runs in Docker and cannot reach 127.0.0.1 on the host. */
export function resolveDockerAccessibleApiUrl(url = "") {
  const normalized = String(url || "").trim();
  if (!normalized) {
    return "";
  }

  const apiOrigin = getApiOrigin();
  const dockerOrigin = apiOrigin
    .replace("127.0.0.1", "host.docker.internal")
    .replace("localhost", "host.docker.internal");

  if (normalized.startsWith(apiOrigin)) {
    return normalized.replace(apiOrigin, dockerOrigin);
  }

  return normalized;
}
