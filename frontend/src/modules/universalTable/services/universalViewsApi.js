const API_BASE_URL = "http://127.0.0.1:8010";

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken")
  );
}

async function request(url, options = {}) {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}${url}`,
    {
      headers: {
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },

      ...options,
    }
  );

  if (!response.ok) {
    let message = "Request failed";

    try {
      const data = await response.json();

      message = data?.detail || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getViewsByTable(tableId) {
  return request(
    `/universal-views/table/${tableId}`
  );
}

export async function getUniversalView(viewId) {
  return request(
    `/universal-views/${viewId}`
  );
}

export async function createUniversalView(payload) {
  return request(
    "/universal-views/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateUniversalView(
  viewId,
  payload,
) {
  return request(
    `/universal-views/${viewId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteUniversalView(viewId) {
  return request(
    `/universal-views/${viewId}`,
    {
      method: "DELETE",
    }
  );
}