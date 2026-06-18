import { API_BASE_URL } from "../../config/apiConfig.js";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Ошибка запроса: ${response.status}`);
  }

  return response.json();
}

export function getRuntimeModuleConfiguration(tenantId, moduleKey) {
  return request(
    `/runtime/tenants/${tenantId}/modules/${encodeURIComponent(moduleKey)}/configuration`,
  );
}
