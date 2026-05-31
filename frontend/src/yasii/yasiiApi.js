import { apiClient } from "../api/apiClient";

export async function sendYasiiQuery(text) {
  const response = await apiClient.post("/yasii/query", {
    requestId: `yasii-${Date.now()}`,
    payload: {
      text,
    },
  });

  return response.data;
}
