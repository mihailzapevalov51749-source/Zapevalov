export const PAGE_LAYOUT_PAGE_TYPE = {

  OFFICE_WORKSPACE: "office_workspace",

  OFFICE_PAGE: "office_page",

  OFFICE_LIBRARY: "office_library",

  OBJECT_RUNTIME: "object_runtime",

  OBJECT_PLAN: "object_plan",

  CHAT_ROOM: "chat_room",

  STUDIO_OBJECT: "studio_object",

  STUDIO_OBJECT_DATA: "studio_object_data",

  STUDIO_OBJECT_LIST: "studio_object_list",

  /** @deprecated use STUDIO_OBJECT_LIST */
  STUDIO_LIST: "studio_object_list",

  STUDIO_PAGES: "studio_pages",

  STUDIO_TRASH: "studio_trash",

  STUDIO_WORKSPACES: "studio_workspaces",

  STUDIO_WORKSPACE_DETAIL: "studio_workspace_detail",

  STUDIO_SECTION: "studio_section",

  STUDIO_PAGE_EDITOR: "studio_page_editor",

  STUDIO_ADMIN: "studio_admin",

  YASII_WORKSPACE: "yasii_workspace",

  DASHBOARD: "dashboard",

  PROFILE: "profile",

  UNKNOWN: "unknown",

};



export const PAGE_LAYOUT_MODULE_KEY = {

  OFFICE: "office",

  STUDIO: "studio",

  DASHBOARD: "dashboard",

  CHAT: "chat",

  PROFILE: "profile",

  YASII: "yasii",

};



export const PAGE_LAYOUT_TOOLBAR_ZONE = {

  APP_HEADER: "app-header",

  OBJECT_RUNTIME_HEADER: "object-runtime-header",

  CHAT_HEADER: "chat-header",

  STUDIO_OBJECT_HEADER: "studio-object-header",

  DASHBOARD_TOOLBAR: "dashboard-toolbar",

  PROFILE_TOOLBAR: "profile-toolbar",

};



/** @typedef {import('./pageLayoutContractTypes.js').PageLayoutContract} PageLayoutContract */



/**

 * @typedef {{

 *   pageType: string,

 *   title: string,

 *   route: string,

 *   moduleKey: string,

 *   toolbarZoneId: string | null,

 *   canMinimize: boolean,

 *   fallbackRoute: string | null,

 *   context: Record<string, unknown>,

 * }} PageLayoutContract

 */


