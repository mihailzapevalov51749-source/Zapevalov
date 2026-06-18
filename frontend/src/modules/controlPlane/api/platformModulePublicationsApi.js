import { platformApiClient, getApiErrorMessage } from "../../designer/api/platformApiClient";

export async function listPlatformModulePublications() {
  const response = await platformApiClient.get("/platform/module-publications");
  return response.data;
}

export async function listDevModulePublications() {
  const response = await platformApiClient.get("/platform/module-publications/dev");
  return response.data;
}

export async function getPlatformModulePublication(publicationId) {
  const response = await platformApiClient.get(
    `/platform/module-publications/${publicationId}`,
  );
  return response.data;
}

export async function createModulePublication(payload) {
  const response = await platformApiClient.post("/platform/module-publications", payload);
  return response.data;
}

export async function submitModulePublication(publicationId) {
  const response = await platformApiClient.post(
    `/platform/module-publications/${publicationId}/submit-for-review`,
  );
  return response.data;
}

export async function startModulePublicationReview(publicationId) {
  const response = await platformApiClient.post(
    `/platform/module-publications/${publicationId}/start-review`,
  );
  return response.data;
}

export async function approveModulePublication(publicationId, notes = "") {
  const response = await platformApiClient.post(
    `/platform/module-publications/${publicationId}/approve`,
    { notes: notes || null },
  );
  return response.data;
}

export async function rejectModulePublication(publicationId, notes = "") {
  const response = await platformApiClient.post(
    `/platform/module-publications/${publicationId}/reject`,
    { notes: notes || null },
  );
  return response.data;
}

export async function publishModulePublication(publicationId) {
  const response = await platformApiClient.post(
    `/platform/module-publications/${publicationId}/publish`,
  );
  return response.data;
}

export { getApiErrorMessage };
