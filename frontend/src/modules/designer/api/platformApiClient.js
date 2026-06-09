import axios from "axios";

import { getToken, logout } from "../../../api/authApi";
import { recordApiActivity } from "../../../shared/userActivity/userActivityTracker";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

export const platformApiClient = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
  },
});

platformApiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  recordApiActivity();

  return config;
});

platformApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
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

export function getApiErrorMessage(error, fallback = "Ошибка запроса") {
  const detail = error.response?.data?.detail;

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
