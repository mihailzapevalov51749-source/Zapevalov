import { PAGE_LAYOUT_PAGE_TYPE } from "../appShell/pageLayoutContract/pageLayoutContractTypes.js";
import { PROFILE_PANEL_PAGE_TYPE } from "../../profile/profilePanelWorkspaceTab.js";
import {
  STUDIO_SECTION_TITLES,
  resolveStudioSectionTitleFromPathname,
} from "./studioSectionTitles.js";

export const CORPORATE_CHAT_PAGE_ID = 35;

const WORKSPACE_PREFIX = {
  office: "Офис",
  studio: "Студия",
  profile: "Профиль",
  yasii: "Ясии",
};

const PAGE_TYPE_PAGE_NAMES = {
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST]: "Объекты",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT]: "Объект",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA]: "Данные объекта",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES]: "Рабочие пространства",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACE_DETAIL]: "Рабочее пространство",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES]: "Страницы",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH]: "Корзина",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR]: "Страница",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN]: "Администрирование",
  [PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION]: "Раздел",
  [PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE]: "Рабочее пространство",
  [PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE]: "Страница",
  [PAGE_LAYOUT_PAGE_TYPE.OFFICE_LIBRARY]: "Документы",
  [PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME]: "Объект",
  [PAGE_LAYOUT_PAGE_TYPE.OBJECT_PLAN]: "План",
  [PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM]: "Чат",
  [PAGE_LAYOUT_PAGE_TYPE.DASHBOARD]: "Развитие продукта",
  [PAGE_LAYOUT_PAGE_TYPE.PROFILE]: "Личный кабинет",
  [PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE]: "Ассистент",
  studio_object_settings: "Объект",
  object_table: "Объект",
  object_plan: "План",
  page: "Страница",
  library: "Документы",
  workspace: "Рабочее пространство",
  generic: "Страница",
};

const STUDIO_OBJECT_TAB_LABELS = {
  general: "Общие",
  fields: "Поля",
  relations: "Связи",
  views: "Представления",
  actions: "Действия",
  rules: "Правила",
  publishing: "Публикация",
  preview: "Предпросмотр",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function extractPathname(route) {
  return normalizeText(route).split(/[?#]/)[0];
}

function readContext(input) {
  if (input?.context_json && typeof input.context_json === "object") {
    return input.context_json;
  }

  if (input?.context && typeof input.context === "object") {
    return input.context;
  }

  return {};
}

function isTechnicalTitle(title) {
  const normalized = normalizeText(title);

  if (!normalized) {
    return true;
  }

  if (/^профиль$/i.test(normalized)) {
    return true;
  }

  if (/^страница$/i.test(normalized)) {
    return true;
  }

  if (/^(офис|студия):\s*страница$/i.test(normalized)) {
    return true;
  }

  if (/^раздел$/i.test(normalized)) {
    return true;
  }

  if (/^студия:\s*раздел$/i.test(normalized)) {
    return true;
  }

  if (/^страница\s+\d+$/i.test(normalized)) {
    return true;
  }

  if (/^(studio|office|dashboard|yasii)$/i.test(normalized)) {
    return true;
  }

  if (/^(studio|office|dashboard|yasii):\s*/i.test(normalized)) {
    return true;
  }

  if (/^объект:\s*/i.test(normalized)) {
    return true;
  }

  if (/^чат:\s*/i.test(normalized)) {
    return true;
  }

  if (/^платформа:\s*/i.test(normalized)) {
    return true;
  }

  if (/^план:\s*[a-z0-9_-]+$/i.test(normalized) && !/[А-Яа-яЁё]/.test(normalized)) {
    return true;
  }

  return false;
}

function isAlreadyFormatted(title, prefix) {
  const normalized = normalizeText(title);
  const normalizedPrefix = normalizeText(prefix);

  if (!normalized || !normalizedPrefix) {
    return false;
  }

  return normalized.toLowerCase().startsWith(`${normalizedPrefix.toLowerCase()}:`);
}

function formatDisplayTitle(prefix, pageName) {
  const normalizedPrefix = normalizeText(prefix) || "Страница";
  const normalizedPageName = normalizeText(pageName);

  if (!normalizedPageName) {
    return normalizedPrefix;
  }

  if (isAlreadyFormatted(normalizedPageName, normalizedPrefix)) {
    return normalizedPageName;
  }

  return `${normalizedPrefix}: ${normalizedPageName}`;
}

function isCorporateChatRoute(route, context) {
  const pathname = extractPathname(route);
  const pageMatch = pathname.match(/^\/portal\/\d+\/page\/(\d+)/);

  if (pageMatch && Number(pageMatch[1]) === CORPORATE_CHAT_PAGE_ID) {
    return true;
  }

  const pageId = Number(context.pageId);
  return pageId === CORPORATE_CHAT_PAGE_ID;
}

function resolveWorkspaceKey({ route, moduleKey }) {
  const pathname = extractPathname(route);
  const normalizedRoute = normalizeText(route);

  if (normalizedRoute.startsWith("__panel__/profile")) {
    return "profile";
  }

  if (pathname.startsWith("/yasii")) {
    return "yasii";
  }

  if (pathname.startsWith("/profile")) {
    return "profile";
  }

  if (
    pathname.startsWith("/designer") ||
    moduleKey === "studio" ||
    moduleKey === "admin"
  ) {
    return "studio";
  }

  return "office";
}

function resolveContextPrefix(input) {
  const workspaceKey = resolveWorkspaceKey(input);
  return WORKSPACE_PREFIX[workspaceKey];
}

function isOfficeChatPage(route, context, pageType, pathname) {
  if (isCorporateChatRoute(route, context)) {
    return true;
  }

  if (pageType === PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM) {
    return true;
  }

  return pathname.startsWith("/chats");
}

function resolveStudioSectionName(pathname, context) {
  const sectionTitle = normalizeText(context.sectionTitle);
  if (sectionTitle) {
    return sectionTitle;
  }

  const routeTitle = resolveStudioSectionTitleFromPathname(pathname);
  if (routeTitle) {
    return routeTitle;
  }

  const sectionKey = normalizeText(context.sectionKey || context.section);
  if (sectionKey && STUDIO_SECTION_TITLES[sectionKey]) {
    return STUDIO_SECTION_TITLES[sectionKey];
  }

  return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION];
}

function resolveStudioObjectTabName(pathname, context) {
  const tabMatch = pathname.match(/^\/designer\/tenant\/\d+\/object-types\/[^/]+\/([^/]+)$/);

  if (tabMatch?.[1] === "data") {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA];
  }

  const tabKey = normalizeText(context.tabKey || tabMatch?.[1]);
  if (tabKey && STUDIO_OBJECT_TAB_LABELS[tabKey]) {
    return STUDIO_OBJECT_TAB_LABELS[tabKey];
  }

  return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT];
}

function resolveObjectPageName(context, pathname) {
  const objectName = normalizeText(
    context.objectTypeName ||
      context.objectName ||
      context.objectTitle ||
      context.pageTitle,
  );

  if (objectName) {
    return objectName;
  }

  const objectKey = normalizeText(context.objectTypeKey || context.objectTypeRef);
  if (objectKey) {
    return objectKey;
  }

  const objectMatch = pathname.match(/^\/portal\/\d+\/object-types\/([^/]+)/);
  if (objectMatch?.[1] && objectMatch[1] !== "data") {
    return decodeURIComponent(objectMatch[1]);
  }

  return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME];
}

function resolveRoutePageName(pathname, context, pageType) {
  if (pathname.match(/^\/designer\/tenant\/\d+\/object-types\/?$/)) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/object-types\/[^/]+\/data$/)) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/object-types\/[^/]+\/[^/]+$/)) {
    return resolveStudioObjectTabName(pathname, context);
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/workspaces\/?$/)) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/workspaces\/[^/]+/)) {
    const workspaceTitle = normalizeText(context.workspaceTitle || context.workspaceName);
    if (workspaceTitle) {
      return workspaceTitle;
    }

    const slugMatch = pathname.match(/^\/designer\/tenant\/\d+\/workspaces\/([^/]+)/);
    if (slugMatch?.[1]) {
      return decodeURIComponent(slugMatch[1]);
    }

    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACE_DETAIL];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/pages\/?$/)) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/trash\/?$/)) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/administration/)) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/page\/\d+/)) {
    return normalizeText(context.pageTitle) || PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR];
  }

  if (pathname.includes("/platform")) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.DASHBOARD];
  }

  if (pathname.match(/^\/designer\/tenant\/\d+\/(relations|views|navigation|processes|publishing)\/?$/)) {
    return resolveStudioSectionName(pathname, context);
  }

  if (pathname.match(/^\/portal\/\d+\/object-types\//)) {
    return resolveObjectPageName(context, pathname);
  }

  if (pathname.match(/^\/portal\/\d+\/workspaces\//)) {
    const workspaceTitle = normalizeText(context.workspaceTitle || context.workspaceName);
    if (workspaceTitle) {
      return workspaceTitle;
    }

    const slugMatch = pathname.match(/^\/portal\/\d+\/workspaces\/([^/]+)/);
    if (slugMatch?.[1]) {
      return decodeURIComponent(slugMatch[1]);
    }

    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE];
  }

  const pageMatch = pathname.match(/^\/portal\/\d+\/page\/(\d+)/);
  if (pageMatch) {
    const pageId = Number(pageMatch[1]);

    if (pageId === CORPORATE_CHAT_PAGE_ID) {
      return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM];
    }

    return normalizeText(context.pageTitle) || PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE];
  }

  if (pathname.match(/^\/portal\/\d+\/library\//)) {
    return normalizeText(context.libraryTitle || context.pageTitle) || PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.OFFICE_LIBRARY];
  }

  if (pathname.startsWith("/yasii")) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE];
  }

  if (pathname.startsWith("/profile")) {
    return normalizeText(context.userName || context.pageTitle) || PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.PROFILE];
  }

  if (pageType && PAGE_TYPE_PAGE_NAMES[pageType]) {
    return PAGE_TYPE_PAGE_NAMES[pageType];
  }

  return "";
}

function resolveProfilePanelPageName(input) {
  const context = readContext(input);
  const pageType = normalizeText(
    context.layoutPageType || input?.pageType || input?.page_type,
  );

  if (
    pageType !== PROFILE_PANEL_PAGE_TYPE &&
    context.panelType !== PROFILE_PANEL_PAGE_TYPE
  ) {
    return "";
  }

  return normalizeText(context.userName || context.pageTitle) || "Личный кабинет";
}

function resolvePageName(input) {
  const context = readContext(input);
  const pathname = extractPathname(input?.route);
  const pageType = normalizeText(
    context.layoutPageType || input?.pageType || input?.page_type,
  );
  const profilePanelPageName = resolveProfilePanelPageName(input);

  if (profilePanelPageName) {
    return profilePanelPageName;
  }
  const explicitPageTitle = normalizeText(
    input?.pageTitle || context.pageTitle || context.title,
  );
  const storedTitle = normalizeText(input?.title);

  if (isOfficeChatPage(input?.route, context, pageType, pathname)) {
    return PAGE_TYPE_PAGE_NAMES[PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM];
  }

  const studioSectionTitle = normalizeText(context.sectionTitle);
  if (studioSectionTitle) {
    return studioSectionTitle;
  }

  if (explicitPageTitle && !isTechnicalTitle(explicitPageTitle)) {
    const prefix = resolveContextPrefix(input);

    if (isAlreadyFormatted(explicitPageTitle, prefix)) {
      return explicitPageTitle;
    }

    return explicitPageTitle;
  }

  const routePageName = resolveRoutePageName(pathname, context, pageType);
  if (routePageName) {
    return routePageName;
  }

  if (storedTitle && !isTechnicalTitle(storedTitle)) {
    return storedTitle;
  }

  if (pageType && PAGE_TYPE_PAGE_NAMES[pageType]) {
    return PAGE_TYPE_PAGE_NAMES[pageType];
  }

  return storedTitle || "Страница";
}

/**
 * @param {{
 *   title?: string,
 *   pageTitle?: string,
 *   route?: string,
 *   module_key?: string,
 *   moduleKey?: string,
 *   page_type?: string,
 *   pageType?: string,
 *   context_json?: Record<string, unknown>,
 *   context?: Record<string, unknown>,
 * }} input
 */
export function resolveWorkspaceTabDisplayTitle(input = {}) {
  const normalizedInput = {
    ...input,
    moduleKey: input.moduleKey || input.module_key,
    pageType: input.pageType || input.page_type,
    route: input.route,
  };

  const prefix = resolveContextPrefix(normalizedInput);
  const pageName = resolvePageName(normalizedInput);

  if (isAlreadyFormatted(pageName, prefix)) {
    return pageName;
  }

  return formatDisplayTitle(prefix, pageName);
}
