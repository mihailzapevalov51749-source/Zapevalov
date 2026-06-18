import { getToken, logout as clearAuthToken } from "./authApi";

import { API_BASE_URL } from "../config/apiConfig.js";

const BASE_PATH = "/user-activity";

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getAuthHeaders() {
  const token = getToken();
  if (!token) {
    throw new Error("Токен отсутствует");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function buildStatsQuery(params = {}) {
  const search = new URLSearchParams();
  search.set("tz", getBrowserTimezone());
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") {
      search.set(key, String(value));
    }
  });
  return `?${search.toString()}`;
}

async function parseError(response, fallbackMessage) {
  const errorText = await response.text();
  return errorText || fallbackMessage;
}

export async function sendActivityHeartbeat(payload = {}) {
  const response = await fetch(`${API_BASE_URL}${BASE_PATH}/heartbeat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...payload,
      occurred_at: payload.occurred_at || new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorMessage = await parseError(
      response,
      "Не удалось отправить активность",
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function closeActivitySession(payload = { reason: "logout" }) {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${BASE_PATH}/close`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function getDailyActivityStats(day) {
  const response = await fetch(
    `${API_BASE_URL}${BASE_PATH}/stats/day${buildStatsQuery(day ? { day } : {})}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error(await parseError(response, "Не удалось загрузить статистику дня"));
  }
  return response.json();
}

export async function getWeeklyActivityStats(day) {
  const response = await fetch(
    `${API_BASE_URL}${BASE_PATH}/stats/week${buildStatsQuery(day ? { day } : {})}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error(await parseError(response, "Не удалось загрузить статистику недели"));
  }
  return response.json();
}

export async function getMonthlyActivityStats(year, month) {
  const params = {};
  if (year != null) {
    params.year = year;
  }
  if (month != null) {
    params.month = month;
  }
  const response = await fetch(
    `${API_BASE_URL}${BASE_PATH}/stats/month${buildStatsQuery(params)}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error(await parseError(response, "Не удалось загрузить статистику месяца"));
  }
  return response.json();
}

export async function getActivityStatsMeta() {
  const response = await fetch(
    `${API_BASE_URL}${BASE_PATH}/stats/meta${buildStatsQuery()}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error(await parseError(response, "Не удалось загрузить метаданные активности"));
  }
  return response.json();
}

export { clearAuthToken as logoutClearToken };
