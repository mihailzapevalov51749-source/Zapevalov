import { API_BASE_URL } from "../config/apiConfig.js";
import { getRuntimeAuthToken } from "./runtimeAuthToken.js";

/**
 * Build Authorization headers for TEMPLATE/DEV/CLIENT runtime API calls.
 * Prefers bridge_token when Session Bridge session is active.
 */
export function buildRuntimeAuthHeaders(extraHeaders = {}) {
  const { token } = getRuntimeAuthToken();
  return {
    Accept: "application/json",
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function hasRuntimeAuthToken() {
  return Boolean(getRuntimeAuthToken().token);
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
export async function runtimeFetch(path, options = {}) {
  const normalizedPath = String(path || "").trim();
  const url = normalizedPath.startsWith("http")
    ? normalizedPath
    : `${API_BASE_URL}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;

  const headers = buildRuntimeAuthHeaders(options.headers || {});

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || `Ошибка запроса: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}
