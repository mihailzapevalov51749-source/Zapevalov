import { apiClient } from "./apiClient";

export async function uploadIcon(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiClient.post("/files/upload-icon", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}