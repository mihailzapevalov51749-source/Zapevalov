import axios from "axios";

import { getToken, logout } from "../../../api/authApi";
import { getRuntimeAuthToken } from "../../../api/runtimeAuthToken.js";

import { API_BASE_URL } from "../../../config/apiConfig.js";

export const platformApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

platformApiClient.interceptors.request.use((config) => {
  const { token } = getRuntimeAuthToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

platformApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { kind } = getRuntimeAuthToken();
      if (kind === "login" && getToken()) {
        logout();
      }
    }

    return Promise.reject(error);
  },
);

const RESTORE_CONFLICT_ENTITY_LABELS = {
  relation_definition: "связь",
  object_type: "объект",
  object_view: "представление",
  field_definition: "поле",
  workspace: "рабочее пространство",
  workspace_tab: "вкладка",
  page: "страница",
  navigation_item: "элемент навигации",
};

export function formatRestoreConflictMessage(detail) {
  if (!detail || typeof detail !== "object") {
    return "Невозможно восстановить запись.";
  }

  if (typeof detail.message === "string" && detail.message.trim() && !detail.entity_type) {
    return `Невозможно восстановить запись.\n\n${detail.message.trim()}`;
  }

  const entityLabel =
    RESTORE_CONFLICT_ENTITY_LABELS[detail.entity_type] || "запись";
  const key = String(detail.key || "").trim();
  const suffix = key
    ? `В системе уже существует активная ${entityLabel} с ключом "${key}".`
    : `В системе уже существует активная ${entityLabel}.`;

  return `Невозможно восстановить запись.\n\n${suffix}`;
}

function formatObjectTypeDeleteConflictMessage(detail) {
  const groups = Array.isArray(detail?.groups) ? detail.groups : [];
  const lines = [detail?.message || "Нельзя удалить объект.", "", "Объект используется в:"];

  groups.forEach((group) => {
    const items = Array.isArray(group?.items) ? group.items.filter(Boolean) : [];
    if (!items.length) {
      return;
    }
    const label = String(group?.label || "").trim();
    if (label) {
      lines.push(`- ${label}`);
    }
    items.forEach((item) => lines.push(`  • ${item}`));
  });

  return lines.join("\n");
}

export function getApiErrorMessage(error, fallback = "Ошибка запроса") {
  const detail = error.response?.data?.detail;

  if (detail && typeof detail === "object" && detail.error === "object_type_delete_conflict") {
    return formatObjectTypeDeleteConflictMessage(detail);
  }

  if (detail && typeof detail === "object" && detail.error === "restore_conflict") {
    return formatRestoreConflictMessage(detail);
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && detail.message.trim()) {
      return detail.message.trim();
    }

    return JSON.stringify(detail);
  }

  if (error.message === "Network Error") {
    return fallback;
  }

  return error.message || fallback;
}
