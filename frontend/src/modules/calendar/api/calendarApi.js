import { API_BASE_URL } from "../../../config/apiConfig.js";
import { buildRuntimeAuthHeaders } from "../../../api/runtimeFetch.js";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildRuntimeAuthHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Ошибка запроса: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function listCalendarEvents(tenantId, params = {}) {
  return request(
    `/tenants/${tenantId}/calendar/events${buildQuery(params)}`,
  );
}

export function getCalendarEvent(tenantId, eventId) {
  return request(`/tenants/${tenantId}/calendar/events/${eventId}`);
}

export function createCalendarEvent(tenantId, payload) {
  return request(`/tenants/${tenantId}/calendar/events`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCalendarEvent(tenantId, eventId, payload) {
  return request(`/tenants/${tenantId}/calendar/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCalendarEvent(tenantId, eventId) {
  return request(`/tenants/${tenantId}/calendar/events/${eventId}`, {
    method: "DELETE",
  });
}

export function respondCalendarEvent(tenantId, eventId, status) {
  return request(`/tenants/${tenantId}/calendar/events/${eventId}/respond`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export { searchUsers } from "../../chats/api/chatsApi";
