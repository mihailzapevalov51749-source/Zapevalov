import { API_BASE_URL } from "../config/apiConfig.js";

import { clearBridgeSessionStorage, hasActiveBridgeSession } from "./bridgeSessionContext.js";

const TOKEN_KEY = "token";
const LEGACY_TOKEN_KEY = "access_token";

export function getToken() {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    null
  );
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);

  if (token) {
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  clearBridgeSessionStorage();
}

function getAuthHeaders() {
  const token = getToken();

  if (!token) {
    throw new Error("Токен отсутствует");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getJsonAuthHeaders() {
  return {
    ...getAuthHeaders(),
    "Content-Type": "application/json",
  };
}

function extractApiDetail(responseText) {
  if (!responseText) return "";

  try {
    const payload = JSON.parse(responseText);
    const detail = payload?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((item) => item?.msg || item?.message || "")
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  } catch {
    // not JSON
  }

  const trimmed = String(responseText).trim();
  return trimmed.startsWith("{") ? "" : trimmed;
}

async function parseError(response, fallbackMessage) {
  const errorText = await response.text();
  return extractApiDetail(errorText) || errorText || fallbackMessage;
}

export async function getTenantLoginBranding(tenantId, tenantKey = null) {
  const normalizedTenantKey = String(tenantKey || "").trim();
  if (normalizedTenantKey) {
    const response = await fetch(
      `${API_BASE_URL}/auth/tenant-login-branding?tenantKey=${encodeURIComponent(normalizedTenantKey)}`,
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const displayName = String(data?.display_name || "").trim();
    return displayName || null;
  }

  const normalizedTenantId = Number(tenantId);
  if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {
    return null;
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/tenant-login-branding?tenantId=${normalizedTenantId}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const displayName = String(data?.display_name || "").trim();

  return displayName || null;
}

export async function getTenantEntryByKey(tenantKey) {
  const normalizedTenantKey = String(tenantKey || "").trim().toLowerCase();
  if (!normalizedTenantKey) {
    throw new Error("tenantKey is required");
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/tenant-entry/${encodeURIComponent(normalizedTenantKey)}`,
  );

  if (response.status === 404) {
    throw new Error("Компания не найдена");
  }

  if (!response.ok) {
    const errorMessage = await parseError(response, "Не удалось определить компанию");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const errorMessage = await parseError(response, "Неверный логин или пароль");
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Сервер не вернул токен авторизации");
  }

  setToken(data.access_token);

  return data;
}

export async function register({ email, password, full_name }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      full_name,
    }),
  });

  if (!response.ok) {
    const errorMessage = await parseError(response, "Ошибка регистрации");
    throw new Error(errorMessage);
  }

  return response.json();
}

export function normalizeCurrentUser(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  return {
    ...data,
    is_platform_owner: Boolean(data.is_platform_owner ?? data.isPlatformOwner),
    is_infrastructure_superadmin: Boolean(
      data.is_infrastructure_superadmin ?? data.isInfrastructureSuperadmin,
    ),
  };
}

export async function getMe() {
  if (hasActiveBridgeSession()) {
    const { getBridgeMe } = await import("./sessionBridgeApi.js");
    return normalizeCurrentUser(await getBridgeMe());
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (!hasActiveBridgeSession()) {
      logout();
    }
    throw new Error("Пользователь не авторизован");
  }

  return normalizeCurrentUser(await response.json());
}

export async function updateMe(payload) {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: getJsonAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось обновить данные пользователя"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function changeMyPassword({
  current_password,
  new_password,
  confirm_password,
}) {
  const response = await fetch(`${API_BASE_URL}/users/me/password`, {
    method: "PATCH",
    headers: getJsonAuthHeaders(),
    body: JSON.stringify({
      current_password,
      new_password,
      confirm_password,
    }),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось изменить пароль"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/files/upload-avatar`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось загрузить аватар"
    );
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return {
    ...data,
    absolute_url: `${API_BASE_URL}${data.file_url}`,
  };
}

export async function getUsers() {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось загрузить пользователей"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getAdminUsers() {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось загрузить пользователей"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getAdminRoles() {
  const response = await fetch(`${API_BASE_URL}/admin/roles`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось загрузить роли"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function createAdminUser(payload) {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    headers: getJsonAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось создать пользователя"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function updateAdminUser(userId, payload) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "PATCH",
    headers: getJsonAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось обновить пользователя"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function sendAdminUserInvite(userId) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/invite`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось отправить приглашение"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function deleteAdminUser(userId) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось удалить пользователя"
    );
    throw new Error(errorMessage);
  }

  return response.json();
}