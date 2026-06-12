import { platformApiClient } from "../designer/api/platformApiClient.js";
import { setToken } from "../../api/authApi.js";

const API_BASE_URL = "http://127.0.0.1:8010";

export async function getPlatformSetupState() {
  const response = await fetch(`${API_BASE_URL}/auth/platform-setup-state`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("access_token")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Не удалось проверить состояние платформы");
  }

  return response.json();
}

export async function createFirstPlatformOwner(payload) {
  const response = await platformApiClient.post(
    "/control-plane/platform-profile/owner/first-setup",
    payload,
  );

  if (response.data?.access_token) {
    setToken(response.data.access_token);
  }

  return response.data;
}
