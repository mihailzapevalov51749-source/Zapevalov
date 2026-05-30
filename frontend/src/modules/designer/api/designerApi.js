import { platformApiClient } from "./platformApiClient";

function tenantBase(tenantId) {
  return `/designer/tenants/${tenantId}`;
}

export async function listObjectTypes(tenantId) {
  const { data } = await platformApiClient.get(`${tenantBase(tenantId)}/object-types`);
  return data;
}

export async function getObjectType(tenantId, objectTypeId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}`,
  );
  return data;
}

export async function createObjectType(tenantId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/object-types`,
    payload,
  );
  return data;
}

export async function updateObjectType(tenantId, objectTypeId, payload) {
  const { data } = await platformApiClient.patch(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}`,
    payload,
  );
  return data;
}

export async function deleteObjectType(tenantId, objectTypeId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}`,
  );
  return data;
}

export async function publishMenuPlacements(tenantId, objectTypeId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/menu-placements`,
    payload,
  );
  return data;
}

export async function listFields(tenantId, objectTypeId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/fields`,
  );
  return data;
}

export async function createField(tenantId, objectTypeId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/fields`,
    payload,
  );
  return data;
}

export async function updateField(tenantId, objectTypeId, fieldId, payload) {
  const { data } = await platformApiClient.patch(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/fields/${fieldId}`,
    payload,
  );
  return data;
}

export async function deleteField(tenantId, objectTypeId, fieldId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/fields/${fieldId}`,
  );
  return data;
}

export async function listRelations(tenantId, objectTypeId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/relations`,
  );
  return data;
}

export async function createRelation(tenantId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/relations`,
    payload,
  );
  return data;
}

export async function updateRelation(tenantId, relationId, payload) {
  const { data } = await platformApiClient.patch(
    `${tenantBase(tenantId)}/relations/${relationId}`,
    payload,
  );
  return data;
}

export async function deleteRelation(tenantId, relationId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/relations/${relationId}`,
  );
  return data;
}

export async function listViews(tenantId, objectTypeId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/views`,
  );
  return data;
}

export async function getView(tenantId, viewId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/views/${viewId}`,
  );
  return data;
}

export async function createView(tenantId, objectTypeId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/views`,
    payload,
  );
  return data;
}

export async function updateView(tenantId, viewId, payload) {
  const { data } = await platformApiClient.patch(
    `${tenantBase(tenantId)}/views/${viewId}`,
    payload,
  );
  return data;
}

export async function deleteView(tenantId, viewId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/views/${viewId}`,
  );
  return data;
}

export async function validatePublish(tenantId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/publish/validate`,
  );
  return data;
}

export async function publishCatalog(tenantId) {
  const { data } = await platformApiClient.post(`${tenantBase(tenantId)}/publish`);
  return data;
}

export async function getLatestPublish(tenantId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/publish/latest`,
  );
  return data;
}
