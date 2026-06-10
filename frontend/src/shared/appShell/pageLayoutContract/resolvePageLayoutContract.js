import { resolveRuntimeFallbackPath } from "../../appMode/appModeNavigation.js";

import { isWorkspaceTabDescriptorSupported } from "../../workspaceTabs/isWorkspaceTabDescriptorSupported.js";

import {

  PAGE_LAYOUT_MODULE_KEY,

  PAGE_LAYOUT_PAGE_TYPE,

  PAGE_LAYOUT_TOOLBAR_ZONE,

} from "./pageLayoutContractTypes.js";



function buildRoute(location) {

  const pathname = String(location?.pathname || "").trim();

  const search = String(location?.search || "");

  const hash = String(location?.hash || "");

  return `${pathname}${search}${hash}`;

}



export function resolvePageLayoutFallbackRoute(tenantId) {
  const normalizedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;
  return resolveRuntimeFallbackPath(normalizedTenantId);
}



function resolveDefaultToolbarZoneId(pageType) {

  if (!pageType || pageType === PAGE_LAYOUT_PAGE_TYPE.UNKNOWN) {

    return null;

  }



  return PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER;

}



function mapDescriptorPageType(descriptor, location) {

  const pathname = String(location?.pathname || "").trim();

  const descriptorPageType = String(descriptor?.pageType || "").trim();



  if (pathname.startsWith("/profile")) {

    return PAGE_LAYOUT_PAGE_TYPE.PROFILE;

  }



  if (pathname.includes("/platform")) {

    return PAGE_LAYOUT_PAGE_TYPE.DASHBOARD;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/administration/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/pages\/?$/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/trash\/?$/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/workspaces\/[^/]+/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACE_DETAIL;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/workspaces\/?$/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/page\/\d+/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR;

  }



  if (

    pathname.match(

      /^\/designer\/tenant\/\d+\/(relations|views|navigation|processes|publishing)\/?$/,

    )

  ) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION;

  }



  if (pathname.startsWith("/yasii")) {

    return PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/object-types\/[^/]+\/data$/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/object-types\/[^/]+\/[^/]+$/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT;

  }



  if (pathname.match(/^\/portal\/\d+\/library\/[^/]+/)) {

    return PAGE_LAYOUT_PAGE_TYPE.OFFICE_LIBRARY;

  }



  if (pathname.match(/^\/portal\/\d+\/page\/\d+/)) {

    return PAGE_LAYOUT_PAGE_TYPE.OFFICE_PAGE;

  }



  if (pathname.match(/^\/designer\/tenant\/\d+\/object-types\/?$/)) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST;

  }



  if (descriptorPageType === "object_plan") {

    return PAGE_LAYOUT_PAGE_TYPE.OBJECT_PLAN;

  }



  if (

    descriptorPageType === "object_table" ||

    pathname.match(/^\/portal\/\d+\/object-types\//)

  ) {

    return PAGE_LAYOUT_PAGE_TYPE.OBJECT_RUNTIME;

  }



  if (descriptorPageType === "workspace" || pathname.includes("/workspaces/")) {

    return PAGE_LAYOUT_PAGE_TYPE.OFFICE_WORKSPACE;

  }



  if (descriptorPageType === "chat_room") {

    return PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM;

  }



  if (pathname.startsWith("/designer")) {

    return PAGE_LAYOUT_PAGE_TYPE.STUDIO_LIST;

  }



  return PAGE_LAYOUT_PAGE_TYPE.UNKNOWN;

}



function mapDescriptorModuleKey(descriptor, pageType) {

  if (pageType === PAGE_LAYOUT_PAGE_TYPE.PROFILE) {

    return PAGE_LAYOUT_MODULE_KEY.PROFILE;

  }



  if (pageType === PAGE_LAYOUT_PAGE_TYPE.DASHBOARD) {

    return PAGE_LAYOUT_MODULE_KEY.DASHBOARD;

  }



  if (pageType === PAGE_LAYOUT_PAGE_TYPE.CHAT_ROOM) {

    return PAGE_LAYOUT_MODULE_KEY.CHAT;

  }



  if (pageType === PAGE_LAYOUT_PAGE_TYPE.YASII_WORKSPACE) {

    return PAGE_LAYOUT_MODULE_KEY.YASII;

  }



  if (

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_DATA ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_OBJECT_LIST ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_LIST ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACE_DETAIL ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGE_EDITOR ||

    pageType === PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN

  ) {

    return PAGE_LAYOUT_MODULE_KEY.STUDIO;

  }



  return String(descriptor?.moduleKey || PAGE_LAYOUT_MODULE_KEY.OFFICE).trim() || PAGE_LAYOUT_MODULE_KEY.OFFICE;

}



/**

 * @param {import('react-router-dom').Location | { pathname?: string, search?: string, hash?: string }} location

 * @param {Record<string, unknown> | null | undefined} descriptor

 * @param {Partial<import('./pageLayoutContractTypes.js').PageLayoutContract>} [overrides]

 */

export function resolvePageLayoutContract(location, descriptor, overrides = {}) {

  const route = buildRoute(location);

  const pageType = String(overrides.pageType || mapDescriptorPageType(descriptor, location)).trim();

  const moduleKey = String(overrides.moduleKey || mapDescriptorModuleKey(descriptor, pageType)).trim();

  const toolbarZoneId =

    overrides.toolbarZoneId !== undefined

      ? overrides.toolbarZoneId

      : resolveDefaultToolbarZoneId(pageType);

  const normalizedToolbarZoneId = toolbarZoneId ? String(toolbarZoneId).trim() : null;

  const fallbackRoute =

    overrides.fallbackRoute !== undefined

      ? overrides.fallbackRoute

      : resolvePageLayoutFallbackRoute(descriptor?.tenantId);

  const canMinimize =

    overrides.canMinimize !== undefined

      ? Boolean(overrides.canMinimize)

      : Boolean(

          normalizedToolbarZoneId &&

            isWorkspaceTabDescriptorSupported(descriptor, location),

        );



  return {

    pageType,

    title: String(overrides.title || descriptor?.title || "").trim(),

    route: String(overrides.route || descriptor?.route || route).trim(),

    moduleKey,

    toolbarZoneId: normalizedToolbarZoneId,

    canMinimize,

    fallbackRoute: fallbackRoute ? String(fallbackRoute).trim() : null,

    context:

      overrides.context && typeof overrides.context === "object"

        ? overrides.context

        : descriptor?.context && typeof descriptor.context === "object"

          ? descriptor.context

          : {},

  };

}


