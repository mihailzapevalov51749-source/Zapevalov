import { platformApiClient, getApiErrorMessage } from "../../designer/api/platformApiClient";

const RELEASES_BASE = "/platform/releases";

export async function listPlatformReleases() {
  const { data } = await platformApiClient.get(RELEASES_BASE);
  return Array.isArray(data) ? data : [];
}

export async function listPlatformReviewQueue() {
  const { data } = await platformApiClient.get(`${RELEASES_BASE}/review-queue`);
  return Array.isArray(data) ? data : [];
}

export async function getPlatformReviewCount() {
  const { data } = await platformApiClient.get(`${RELEASES_BASE}/review-count`);
  const count = Number(data?.count);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export async function getPlatformRelease(releaseId) {
  const { data } = await platformApiClient.get(`${RELEASES_BASE}/${releaseId}`);
  return data;
}

export async function listReleaseModules(releaseId) {
  const { data } = await platformApiClient.get(`${RELEASES_BASE}/${releaseId}/modules`);
  return Array.isArray(data) ? data : [];
}

export async function createPlatformRelease(payload) {
  const { data } = await platformApiClient.post(RELEASES_BASE, payload);
  return data;
}

export async function updatePlatformRelease(releaseId, payload) {
  const { data } = await platformApiClient.patch(`${RELEASES_BASE}/${releaseId}`, payload);
  return data;
}

export async function submitReleaseForReview(releaseId) {
  const { data } = await platformApiClient.post(`${RELEASES_BASE}/${releaseId}/submit-for-review`);
  return data;
}

export async function startReleaseReview(releaseId) {
  const { data } = await platformApiClient.post(`${RELEASES_BASE}/${releaseId}/start-review`);
  return data;
}

export async function requestReleaseChanges(releaseId, comment) {
  const { data } = await platformApiClient.post(
    `${RELEASES_BASE}/${releaseId}/request-changes`,
    { comment },
  );
  return data;
}

export async function approvePlatformRelease(releaseId, comment = null) {
  const { data } = await platformApiClient.post(
    `${RELEASES_BASE}/${releaseId}/approve`,
    comment ? { comment } : null,
  );
  return data;
}

export async function publishReleaseToTemplate(releaseId) {
  const { data } = await platformApiClient.post(
    `${RELEASES_BASE}/${releaseId}/publish-to-template`,
  );
  return data;
}

export async function offerReleaseToTenants(releaseId) {
  const { data } = await platformApiClient.post(
    `${RELEASES_BASE}/${releaseId}/offer-to-tenants`,
  );
  return data;
}

export async function listTenantUpdates(tenantId, { status } = {}) {
  const params = status ? { status } : undefined;
  const { data } = await platformApiClient.get(`/tenants/${tenantId}/updates`, { params });
  return Array.isArray(data) ? data : [];
}

export async function applyTenantUpdate(tenantId, offerId) {
  const { data } = await platformApiClient.post(
    `/tenants/${tenantId}/updates/${offerId}/apply`,
  );
  return data;
}

export async function skipTenantUpdate(tenantId, offerId) {
  const { data } = await platformApiClient.post(
    `/tenants/${tenantId}/updates/${offerId}/skip`,
  );
  return data;
}

export { getApiErrorMessage };
