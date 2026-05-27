import {
  getNavigationTree,
  createNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
  moveNavigationItems,
} from "../../../api/navigationApi";

import { createPage } from "../../../api/pagesApi";

const API_BASE_URL = "http://127.0.0.1:8010";

async function createDocumentLibrary(data) {
  const response = await fetch(`${API_BASE_URL}/document-libraries/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      portal_id: data.portal_id,
      parent_id: data.parent_id ?? null,
      title: data.title,
      description: data.description || "",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Ошибка создания библиотеки:", errorText);
    throw new Error("Не удалось создать библиотеку документов");
  }

  return await response.json();
}

async function createSection(data) {
  const response = await fetch(`${API_BASE_URL}/sections/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_id: data.page_id,
      title: data.title || "",
      description: data.description || "",
      layout: data.layout || "one_column",
      sort_order: data.sort_order ?? 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Ошибка создания секции:", errorText);
    throw new Error("Не удалось создать секцию");
  }

  return await response.json();
}

async function createBlock(data) {
  const response = await fetch(`${API_BASE_URL}/blocks/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      section_id: data.section_id,
      type: data.type,
      title: data.title || "",
      content: data.content || {},
      settings: data.settings || {},
      sort_order: data.sort_order ?? 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Ошибка создания блока:", errorText);
    throw new Error("Не удалось создать блок");
  }

  return await response.json();
}

export const navigationService = {
  getTree: (portalId, options) => getNavigationTree(portalId, options),
  createItem: createNavigationItem,
  updateItem: updateNavigationItem,
  deleteItem: deleteNavigationItem,
  moveItems: moveNavigationItems,

  createPage,
  createDocumentLibrary,
  createSection,
  createBlock,
};