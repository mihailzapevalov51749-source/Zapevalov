import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listPlatformModuleRollbacks() {
  const response = await platformApiClient.get("/platform/module-rollbacks");
  return response.data;
}

export function getApiErrorMessage(error, fallback = "Ошибка запроса") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || String(item)).join("; ");
  }
  return error?.message || fallback;
}
