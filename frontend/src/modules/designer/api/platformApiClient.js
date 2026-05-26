import axios from "axios";

import { getToken, logout } from "../../../api/authApi";

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
    config.headers.Authorization = `Bearer ${token}`;
  }

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

export function getApiErrorMessage(error, fallback = "Ошибка запроса") {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  }

  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }

  return error.message || fallback;
}
