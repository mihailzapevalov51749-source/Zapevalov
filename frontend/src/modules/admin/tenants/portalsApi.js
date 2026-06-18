import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listPortals() {
  const response = await platformApiClient.get("/portals/");
  return response.data;
}

export async function getPortal(portalId) {
  const response = await platformApiClient.get(`/portals/${portalId}`);
  return response.data;
}

export async function patchPortalGeneralSettings(portalId, payload) {
  const response = await platformApiClient.patch(
    `/portals/${portalId}/settings/general`,
    payload,
  );
  return response.data;
}

export async function createPortal(payload) {
  const response = await platformApiClient.post("/portals/", payload);
  return response.data;
}

export async function createPortalWithFirstAdmin(payload) {
  const response = await platformApiClient.post("/portals/create-with-first-admin", payload);
  return response.data;
}

export async function deletePortal(portalId) {
  await platformApiClient.delete(`/portals/${portalId}`);
}

export async function clonePortalStructure(portalId, payload) {
  const response = await platformApiClient.post(
    `/portals/${portalId}/clone-structure`,
    payload,
  );
  return response.data;
}
