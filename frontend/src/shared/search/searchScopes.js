/** @typedef {"runtime" | "designer"} SearchMode */

/** @typedef {typeof RUNTIME_SCOPES[keyof typeof RUNTIME_SCOPES]} RuntimeScope */
/** @typedef {typeof DESIGNER_SCOPES[keyof typeof DESIGNER_SCOPES]} DesignerScope */
/** @typedef {RuntimeScope | DesignerScope} SearchScope */

export const SEARCH_MODES = Object.freeze({
  RUNTIME: "runtime",
  DESIGNER: "designer",
});

export const RUNTIME_SCOPES = Object.freeze({
  COMPANY: "runtime.company",
  SECTION: "runtime.section",
  OBJECT_TYPE: "runtime.object_type",
  OBJECT_ENTITY: "runtime.object_entity",
  DOCUMENT_LIBRARY: "runtime.document_library",
  DOCUMENT_FOLDER: "runtime.document_folder",
});

export const DESIGNER_SCOPES = Object.freeze({
  WORKSPACE: "designer.workspace",
  OBJECT_TYPE: "designer.object_type",
  FIELDS: "designer.fields",
  VIEWS: "designer.views",
  RELATIONS: "designer.relations",
  PERMISSIONS: "designer.permissions",
});

/** Default UI labels for header search placeholder / scope indicator. */
export const SEARCH_SCOPE_LABELS = Object.freeze({
  [RUNTIME_SCOPES.COMPANY]: "По всей компании",
  [RUNTIME_SCOPES.SECTION]: "В текущем разделе",
  [RUNTIME_SCOPES.OBJECT_TYPE]: "В текущем разделе",
  [RUNTIME_SCOPES.OBJECT_ENTITY]: "В текущей карточке",
  [RUNTIME_SCOPES.DOCUMENT_LIBRARY]: "В библиотеке",
  [RUNTIME_SCOPES.DOCUMENT_FOLDER]: "В текущей папке",
  [DESIGNER_SCOPES.WORKSPACE]: "По всей студии",
  [DESIGNER_SCOPES.OBJECT_TYPE]: "В текущем типе объекта",
  [DESIGNER_SCOPES.FIELDS]: "В полях",
  [DESIGNER_SCOPES.VIEWS]: "В представлениях",
  [DESIGNER_SCOPES.RELATIONS]: "В связях",
  [DESIGNER_SCOPES.PERMISSIONS]: "В правах доступа",
});

/**
 * Higher depth = narrower search scope (used by resolver priority).
 * @type {Readonly<Record<SearchScope, number>>}
 */
export const SEARCH_SCOPE_DEPTH = Object.freeze({
  [RUNTIME_SCOPES.COMPANY]: 0,
  [DESIGNER_SCOPES.WORKSPACE]: 0,
  [RUNTIME_SCOPES.SECTION]: 1,
  [RUNTIME_SCOPES.OBJECT_TYPE]: 2,
  [DESIGNER_SCOPES.OBJECT_TYPE]: 2,
  [RUNTIME_SCOPES.DOCUMENT_LIBRARY]: 2,
  [DESIGNER_SCOPES.RELATIONS]: 2,
  [DESIGNER_SCOPES.FIELDS]: 3,
  [DESIGNER_SCOPES.VIEWS]: 3,
  [DESIGNER_SCOPES.PERMISSIONS]: 3,
  [RUNTIME_SCOPES.DOCUMENT_FOLDER]: 3,
  [RUNTIME_SCOPES.OBJECT_ENTITY]: 4,
});

export const DESIGNER_OBJECT_TYPE_TABS = Object.freeze({
  GENERAL: "general",
  FIELDS: "fields",
  VIEWS: "views",
  RELATIONS: "relations",
  DATA: "data",
  RUNTIME_PREVIEW: "runtime-preview",
  PERMISSIONS: "permissions",
});

export function getSearchScopeLabel(scope) {
  return SEARCH_SCOPE_LABELS[scope] ?? "Поиск";
}

export function getSearchScopeDepth(scope) {
  return SEARCH_SCOPE_DEPTH[scope] ?? 0;
}

export function isRuntimeScope(scope) {
  return String(scope ?? "").startsWith("runtime.");
}

export function isDesignerScope(scope) {
  return String(scope ?? "").startsWith("designer.");
}
