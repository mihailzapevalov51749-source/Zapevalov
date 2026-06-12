import { platformApiClient } from "./platformApiClient";

function tenantBase(tenantId) {
  return `/designer/tenants/${tenantId}`;
}

export async function listObjectTypes(tenantId) {
  const { data } = await platformApiClient.get(`${tenantBase(tenantId)}/object-types`);
  return data;
}

export async function listActionCategories(tenantId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/action-categories`,
  );
  return data;
}

export async function listActionTypes(tenantId) {
  const { data } = await platformApiClient.get(`${tenantBase(tenantId)}/action-types`);
  return data;
}

export async function listActionDefinitions(tenantId, objectTypeId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/action-definitions`,
  );
  return data;
}

export async function getActionDefinition(tenantId, objectTypeId, actionDefinitionId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/action-definitions/${actionDefinitionId}`,
  );
  return data;
}

export async function createActionDefinition(tenantId, objectTypeId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/action-definitions`,
    payload,
  );
  return data;
}

export async function updateActionDefinition(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  payload,
) {
  const { data } = await platformApiClient.patch(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/action-definitions/${actionDefinitionId}`,
    payload,
  );
  return data;
}

export async function deleteActionDefinition(tenantId, objectTypeId, actionDefinitionId) {
  await platformApiClient.delete(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/action-definitions/${actionDefinitionId}`,
  );
}

export async function getActionPlacementCatalog(tenantId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/action-placements`,
  );
  return data;
}

function actionPlacementsBase(tenantId, objectTypeId, actionDefinitionId) {
  return `${tenantBase(tenantId)}/object-types/${objectTypeId}/action-definitions/${actionDefinitionId}/placements`;
}

export async function listActionPlacements(tenantId, objectTypeId, actionDefinitionId) {
  const { data } = await platformApiClient.get(
    actionPlacementsBase(tenantId, objectTypeId, actionDefinitionId),
  );
  return data;
}

export async function createActionPlacement(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  payload,
) {
  const { data } = await platformApiClient.post(
    actionPlacementsBase(tenantId, objectTypeId, actionDefinitionId),
    payload,
  );
  return data;
}

export async function updateActionPlacement(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  placementId,
  payload,
) {
  const { data } = await platformApiClient.patch(
    `${actionPlacementsBase(tenantId, objectTypeId, actionDefinitionId)}/${placementId}`,
    payload,
  );
  return data;
}

export async function deleteActionPlacement(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  placementId,
) {
  await platformApiClient.delete(
    `${actionPlacementsBase(tenantId, objectTypeId, actionDefinitionId)}/${placementId}`,
  );
}

function actionFormBase(tenantId, objectTypeId, actionDefinitionId) {
  return `${tenantBase(tenantId)}/object-types/${objectTypeId}/action-definitions/${actionDefinitionId}/form`;
}

export async function getActionForm(tenantId, objectTypeId, actionDefinitionId) {
  const { data } = await platformApiClient.get(
    actionFormBase(tenantId, objectTypeId, actionDefinitionId),
  );
  return data;
}

export async function createActionForm(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  payload,
) {
  const { data } = await platformApiClient.post(
    actionFormBase(tenantId, objectTypeId, actionDefinitionId),
    payload,
  );
  return data;
}

export async function updateActionForm(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  payload,
) {
  const { data } = await platformApiClient.patch(
    actionFormBase(tenantId, objectTypeId, actionDefinitionId),
    payload,
  );
  return data;
}

export async function deleteActionForm(tenantId, objectTypeId, actionDefinitionId) {
  await platformApiClient.delete(
    actionFormBase(tenantId, objectTypeId, actionDefinitionId),
  );
}

export async function listActionFormFields(tenantId, objectTypeId, actionDefinitionId) {
  const { data } = await platformApiClient.get(
    `${actionFormBase(tenantId, objectTypeId, actionDefinitionId)}/fields`,
  );
  return data;
}

export async function createActionFormField(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  payload,
) {
  const { data } = await platformApiClient.post(
    `${actionFormBase(tenantId, objectTypeId, actionDefinitionId)}/fields`,
    payload,
  );
  return data;
}

export async function updateActionFormField(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  fieldId,
  payload,
) {
  const { data } = await platformApiClient.patch(
    `${actionFormBase(tenantId, objectTypeId, actionDefinitionId)}/fields/${fieldId}`,
    payload,
  );
  return data;
}

export async function deleteActionFormField(
  tenantId,
  objectTypeId,
  actionDefinitionId,
  fieldId,
) {
  await platformApiClient.delete(
    `${actionFormBase(tenantId, objectTypeId, actionDefinitionId)}/fields/${fieldId}`,
  );
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

export async function getObjectTypeDeletePreview(tenantId, objectTypeId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/object-types/${objectTypeId}/delete-preview`,
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
    `${tenantBase(tenantId)}/fields/${fieldId}`,
    payload,
  );
  return data;
}

export async function deleteField(tenantId, objectTypeId, fieldId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/fields/${fieldId}`,
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

export async function listDesignerWorkspaces(tenantId) {
  const { data } = await platformApiClient.get(`${tenantBase(tenantId)}/workspaces`);
  return data;
}

export async function listPortalPages(portalId) {
  const { data } = await platformApiClient.get(`/pages/portal/${portalId}`);
  return data;
}

export async function listDesignerPagesRegistry(tenantId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/pages/registry`,
  );
  return data;
}

export async function getDesignerPageRegistry(tenantId, pageId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/pages/${pageId}/registry`,
  );
  return data;
}

export async function listDesignerTrash(tenantId) {
  const { data } = await platformApiClient.get(`${tenantBase(tenantId)}/trash`);
  return data;
}

export async function getDesignerTrashItem(tenantId, kind, entityId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/trash/${kind}/${entityId}`,
  );
  return data;
}

export async function checkDesignerTrashPurge(tenantId, kind, entityId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/trash/${kind}/${entityId}/purge-check`,
  );
  return data;
}

export async function restoreDesignerTrashItems(tenantId, items) {
  const { data } = await platformApiClient.post(`${tenantBase(tenantId)}/trash/restore`, {
    items,
  });
  return data;
}

export async function purgeDesignerTrashItems(tenantId, items) {
  const { data } = await platformApiClient.post(`${tenantBase(tenantId)}/trash/purge`, {
    items,
  });
  return data;
}

export async function clearDesignerTrashDependenciesAndPurge(tenantId, kind, entityId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/trash/${kind}/${entityId}/purge-clear-dependencies`,
  );
  return data;
}

export async function purgeDesignerTrashCascade(tenantId, kind, entityId, { confirm = false } = {}) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/trash/${kind}/${entityId}/purge-cascade`,
    undefined,
    { params: { confirm } },
  );
  return data;
}

export async function duplicateDesignerPage(tenantId, pageId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/pages/${pageId}/duplicate`,
  );
  return data;
}

export async function deleteDesignerPage(tenantId, pageId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/pages/${pageId}`,
  );
  return data;
}

export async function bulkDeleteDesignerPages(tenantId, pageIds) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/pages/bulk-delete`,
    { page_ids: pageIds },
  );
  return data;
}

export async function createDesignerWorkspace(tenantId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces`,
    payload,
  );
  return data;
}

export async function getDesignerWorkspaceBySlug(tenantId, slug) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/workspaces/${encodeURIComponent(slug)}`,
  );
  return data;
}

export async function ensureDesignerWorkspaceHomePage(tenantId, workspaceId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/ensure-home-page`,
  );
  return data;
}

export async function ensureDesignerWorkspaceTabs(tenantId, workspaceId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/ensure-tabs`,
  );
  return data;
}

export async function listDesignerWorkspaceTabs(tenantId, workspaceId, options = {}) {
  const params = {};
  if (options.forUserMenu) {
    params.for_user_menu = true;
  }
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/tabs`,
    Object.keys(params).length > 0 ? { params } : undefined,
  );
  return data;
}

export async function createDesignerWorkspaceTab(tenantId, workspaceId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/tabs`,
    payload,
  );
  return data;
}

export async function updateDesignerWorkspaceTab(tenantId, workspaceId, tabId, payload) {
  const { data } = await platformApiClient.patch(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/tabs/${tabId}`,
    payload,
  );
  return data;
}

export async function deleteDesignerWorkspaceTab(tenantId, workspaceId, tabId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/tabs/${tabId}`,
  );
  return data;
}

export async function publishDesignerWorkspace(tenantId, workspaceId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/publish`,
  );
  return data;
}

export async function publishWorkspaceMenuPlacements(tenantId, workspaceId, payload) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/menu-placements`,
    payload,
  );
  return data;
}

export async function getWorkspaceMenuPlacements(tenantId, workspaceId) {
  const { data } = await platformApiClient.get(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/menu-placements`,
  );
  return data;
}

export async function unpublishDesignerWorkspace(tenantId, workspaceId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/unpublish`,
  );
  return data;
}

export async function archiveDesignerWorkspace(tenantId, workspaceId) {
  const { data } = await platformApiClient.post(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}/archive`,
  );
  return data;
}

export async function updateDesignerWorkspace(tenantId, workspaceId, payload) {
  const { data } = await platformApiClient.patch(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}`,
    payload,
  );
  return data;
}

export async function deleteDesignerWorkspace(tenantId, workspaceId) {
  const { data } = await platformApiClient.delete(
    `${tenantBase(tenantId)}/workspaces/${workspaceId}`,
  );
  return data;
}
