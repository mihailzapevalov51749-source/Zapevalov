import {
  getNavigationTree,
  createNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
  moveNavigationItems,
} from "../../../api/navigationApi";

import { createPage } from "../../../api/pagesApi";
import { platformApiClient } from "../../designer/api/platformApiClient";
import { createDocumentLibrary as createDocumentLibraryApi } from "../../documentLibraries/api/documentLibrariesApi";

export const navigationService = {
  getTree: (portalId, options) => getNavigationTree(portalId, options),
  createItem: (portalId, data) => createNavigationItem(portalId, data),
  updateItem: (portalId, itemId, data) => updateNavigationItem(portalId, itemId, data),
  deleteItem: (portalId, itemId) => deleteNavigationItem(portalId, itemId),
  moveItems: (portalId, items) => moveNavigationItems(portalId, items),

  createPage: (portalId, data) => createPage(portalId, data),
  createDocumentLibrary: createDocumentLibrary,
  createSection: (portalId, data) => createSection(portalId, data),
  createBlock: (portalId, data) => createBlock(portalId, data),
};

async function createDocumentLibrary(data) {
  const portalId = Number(data?.portal_id);
  return createDocumentLibraryApi(portalId, {
    parent_id: data.parent_id ?? null,
    title: data.title,
    description: data.description || "",
  });
}

async function createSection(portalId, data) {
  const normalizedPortalId = Number(portalId);
  const response = await platformApiClient.post(
    `/sections/portal/${normalizedPortalId}/`,
    {
      page_id: data.page_id,
      title: data.title || "",
      description: data.description || "",
      layout: data.layout || "one_column",
      sort_order: data.sort_order ?? 0,
    },
  );

  return response.data;
}

async function createBlock(portalId, data) {
  const normalizedPortalId = Number(portalId);
  const response = await platformApiClient.post(`/blocks/portal/${normalizedPortalId}/`, {
    section_id: data.section_id,
    type: data.type,
    title: data.title || "",
    content: data.content || {},
    settings: data.settings || {},
    sort_order: data.sort_order ?? 0,
  });

  return response.data;
}
