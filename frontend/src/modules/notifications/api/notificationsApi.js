const API_URL = "http://127.0.0.1:8010";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken")
  );
}

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,

      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      errorText || "Ошибка запроса уведомлений"
    );
  }

  return response.json();
}

export async function getNotifications() {
  return request("/notifications");
}

export async function getUnreadNotificationsCount() {
  return request("/notifications/unread-count");
}

export async function markNotificationAsRead(
  notificationId
) {
  return request(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );
}