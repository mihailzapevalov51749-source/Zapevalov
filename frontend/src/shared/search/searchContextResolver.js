import {
  DESIGNER_OBJECT_TYPE_TABS,
  DESIGNER_SCOPES,
  getSearchScopeDepth,
  getSearchScopeLabel,
  RUNTIME_SCOPES,
  SEARCH_MODES,
} from "./searchScopes.js";

/**
 * Search Context Resolver — S1 Object Search.
 *
 * Determines WHERE the user is (mode + scope) for contextual header search.
 * Does not execute search queries.
 *
 * @example
 * resolveSearchContext({
 *   pathname: "/portal/1/object-types/projects",
 *   routeParams: { portalId: "1" },
 *   currentObjectType: { key: "projects" },
 * });
 *
 * @example fixture cases — see searchContextResolver.test.js
 */

function normalizePath(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return trimmed || "";
  }
  return trimmed.replace(/\/+$/, "");
}

function asString(value) {
  const next = String(value ?? "").trim();
  return next.length > 0 ? next : undefined;
}

function asNumber(value) {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null && value !== ""),
  );
}

function pickId(source, keys) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  for (const key of keys) {
    const value = source[key];
    if (value != null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

/**
 * @param {string} [pathname]
 * @returns {boolean}
 */
export function isDesignerPathname(pathname) {
  const normalized = normalizePath(pathname);
  return normalized === "/designer" || normalized.startsWith("/designer/");
}

/**
 * @param {{ mode?: string, pathname?: string }} input
 * @returns {"runtime" | "designer"}
 */
export function resolveSearchMode(input = {}) {
  const explicitMode = asString(input.mode)?.toLowerCase();
  if (explicitMode === SEARCH_MODES.DESIGNER || explicitMode === SEARCH_MODES.RUNTIME) {
    return explicitMode;
  }

  return isDesignerPathname(input.pathname) ? SEARCH_MODES.DESIGNER : SEARCH_MODES.RUNTIME;
}

function resolveTenantId(input, pathname, mode) {
  const routeParams = input.routeParams ?? {};

  const fromInput =
    pickId(input.currentPage, ["tenantId", "tenant_id"]) ??
    pickId(routeParams, ["tenantId", "tenant_id", "portalId", "portal_id"]) ??
    pickId(input.currentSection, ["tenantId", "tenant_id"]);

  if (fromInput != null) {
    return asNumber(fromInput) ?? fromInput;
  }

  const normalized = normalizePath(pathname);

  if (mode === SEARCH_MODES.DESIGNER) {
    const match = normalized.match(/\/designer\/tenant\/(\d+)/);
    if (match) {
      return asNumber(match[1]);
    }
  }

  const portalMatch = normalized.match(/\/portal\/(\d+)/);
  if (portalMatch) {
    return asNumber(portalMatch[1]);
  }

  return undefined;
}

function resolvePortalObjectTypeRef(pathname) {
  const match = normalizePath(pathname).match(/\/portal\/\d+\/object-types\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function resolveDesignerObjectTypeId(pathname, routeParams) {
  return (
    asString(routeParams?.objectTypeId) ??
    asString(routeParams?.objectTypeRef) ??
    (() => {
      const match = normalizePath(pathname).match(/\/object-types\/([^/?#]+)/);
      return match ? decodeURIComponent(match[1]) : undefined;
    })()
  );
}

function resolveDesignerTab(pathname, routeParams, currentSection) {
  const fromRoute = asString(routeParams?.tab)?.toLowerCase();
  if (fromRoute) {
    return fromRoute;
  }

  const fromSection = asString(currentSection?.tab ?? currentSection?.designerTab)?.toLowerCase();
  if (fromSection) {
    return fromSection;
  }

  const match = normalizePath(pathname).match(/\/object-types\/[^/?#]+\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]).toLowerCase() : undefined;
}

function resolveLibraryId(input, pathname, routeParams) {
  return (
    asNumber(pickId(input.currentLibrary, ["libraryId", "library_id", "id"])) ??
    asNumber(pickId(input.currentSection, ["libraryId", "library_id"])) ??
    asNumber(routeParams?.libraryId ?? routeParams?.library_id) ??
    (() => {
      const match = normalizePath(pathname).match(/\/portal\/\d+\/library\/(\d+)/);
      return match ? asNumber(match[1]) : undefined;
    })()
  );
}

function resolveFolderId(input) {
  const directFolder = input.currentFolder;
  if (directFolder && typeof directFolder === "object") {
    const folderId =
      pickId(directFolder, ["folderId", "folder_id", "id", "parentId", "parent_id"]) ??
      undefined;
    if (folderId != null) {
      return asNumber(folderId) ?? folderId;
    }
  }

  if (Array.isArray(input.currentFolder) && input.currentFolder.length > 0) {
    const last = input.currentFolder[input.currentFolder.length - 1];
    const folderId = pickId(last, ["folderId", "folder_id", "id"]);
    if (folderId != null) {
      return asNumber(folderId) ?? folderId;
    }
  }

  const folderPath = input.currentLibrary?.folderPath ?? input.currentSection?.folderPath;
  if (Array.isArray(folderPath) && folderPath.length > 0) {
    const last = folderPath[folderPath.length - 1];
    const folderId = pickId(last, ["folderId", "folder_id", "id"]);
    if (folderId != null) {
      return asNumber(folderId) ?? folderId;
    }
  }

  return undefined;
}

function resolveEntityId(input) {
  const entity = input.currentEntity;
  if (!entity || typeof entity !== "object") {
    return undefined;
  }

  const raw =
    pickId(entity, ["entityId", "entity_id", "id", "runtimeEntityId", "runtime_entity_id"]) ??
    undefined;

  if (raw == null) {
    return undefined;
  }

  return asString(raw) ?? raw;
}

function resolveObjectTypeIdentity(input, pathname) {
  const objectType = input.currentObjectType;
  const section = input.currentSection;

  const objectTypeId =
    asString(pickId(objectType, ["objectTypeId", "object_type_id", "id"])) ??
    asString(pickId(section, ["objectTypeId", "object_type_id"])) ??
    undefined;

  const objectTypeKey =
    asString(pickId(objectType, ["objectTypeKey", "object_type_key", "key"])) ??
    asString(pickId(section, ["objectTypeKey", "object_type_key"])) ??
    undefined;

  const routeRef = resolvePortalObjectTypeRef(pathname);
  const resolvedId =
    objectTypeId ??
    (routeRef && !objectTypeKey ? routeRef : undefined);

  return compactParams({
    objectTypeId: resolvedId,
    objectTypeKey: objectTypeKey ?? (routeRef && !objectTypeId ? routeRef : undefined),
  });
}

function isRuntimeCompanyHome(input, pathname) {
  if (input.currentPage?.isHome === true) {
    return true;
  }

  if (asString(input.currentSection?.scope) === "company") {
    return true;
  }

  const normalized = normalizePath(pathname);
  return /^\/portal\/\d+$/.test(normalized);
}

function isRuntimeObjectTypeContext(input, pathname) {
  if (input.currentObjectType) {
    return true;
  }

  const sectionType = asString(input.currentSection?.type)?.toLowerCase();
  if (sectionType === "object_type") {
    return true;
  }

  if (input.currentSection?.object_type_id != null || input.currentSection?.objectTypeId != null) {
    return true;
  }

  return Boolean(resolvePortalObjectTypeRef(pathname));
}

function isRuntimeLibraryContext(input, pathname) {
  if (resolveLibraryId(input, pathname, input.routeParams ?? {})) {
    return true;
  }

  const sectionType = asString(input.currentSection?.type)?.toLowerCase();
  return sectionType === "document_library";
}

function isRuntimeSectionContext(input, pathname) {
  if (input.currentSection?.id != null || input.currentSection?.key) {
    return true;
  }

  const routeParams = input.routeParams ?? {};
  if (routeParams.pageId != null || input.currentPage?.pageId != null) {
    return true;
  }

  return /\/portal\/\d+\/page\/\d+/.test(normalizePath(pathname));
}

function resolveSectionId(input, pathname, routeParams) {
  const raw =
    pickId(input.currentSection, ["sectionId", "section_id", "id", "key"]) ??
    routeParams?.pageId ??
    input.currentPage?.pageId ??
    (() => {
      const match = normalizePath(pathname).match(/\/portal\/\d+\/page\/(\d+)/);
      return match ? match[1] : undefined;
    })();

  if (raw == null || raw === "") {
    return undefined;
  }

  const numeric = asNumber(raw);
  return numeric ?? raw;
}

function isPermissionsContext(tab, currentSection) {
  const sectionKey = asString(currentSection?.key ?? currentSection?.id)?.toLowerCase();
  return (
    tab === DESIGNER_OBJECT_TYPE_TABS.PERMISSIONS ||
    sectionKey === DESIGNER_OBJECT_TYPE_TABS.PERMISSIONS
  );
}

function buildSearchContextResult(scope, mode, params, meta = {}) {
  const label = getSearchScopeLabel(scope);
  const depth = getSearchScopeDepth(scope);
  const context = {
    mode,
    scope,
    label,
    params: compactParams(params),
    depth,
    meta,
  };

  return {
    ...context,
    searchMode: mode,
    searchScope: scope,
    searchContext: context,
  };
}

function resolveRuntimeSearchContext(input, pathname) {
  const mode = SEARCH_MODES.RUNTIME;
  const routeParams = input.routeParams ?? {};
  const tenantId = resolveTenantId(input, pathname, mode);
  const baseParams = { tenantId };

  const entityId = resolveEntityId(input);
  if (entityId) {
    return buildSearchContextResult(RUNTIME_SCOPES.OBJECT_ENTITY, mode, {
      ...baseParams,
      ...resolveObjectTypeIdentity(input, pathname),
      entityId,
      sectionId: resolveSectionId(input, pathname, routeParams),
    });
  }

  const libraryId = resolveLibraryId(input, pathname, routeParams);
  const folderId = resolveFolderId(input);

  if (libraryId && folderId != null) {
    return buildSearchContextResult(
      RUNTIME_SCOPES.DOCUMENT_FOLDER,
      mode,
      {
        ...baseParams,
        libraryId,
        folderId,
        sectionId: resolveSectionId(input, pathname, routeParams),
      },
      { folderSearchRecursive: true },
    );
  }

  if (libraryId) {
    return buildSearchContextResult(RUNTIME_SCOPES.DOCUMENT_LIBRARY, mode, {
      ...baseParams,
      libraryId,
      sectionId: resolveSectionId(input, pathname, routeParams),
    });
  }

  if (isRuntimeObjectTypeContext(input, pathname)) {
    return buildSearchContextResult(RUNTIME_SCOPES.OBJECT_TYPE, mode, {
      ...baseParams,
      ...resolveObjectTypeIdentity(input, pathname),
      sectionId: resolveSectionId(input, pathname, routeParams),
    });
  }

  if (isRuntimeSectionContext(input, pathname) && !isRuntimeCompanyHome(input, pathname)) {
    return buildSearchContextResult(RUNTIME_SCOPES.SECTION, mode, {
      ...baseParams,
      sectionId: resolveSectionId(input, pathname, routeParams),
    });
  }

  return buildSearchContextResult(RUNTIME_SCOPES.COMPANY, mode, baseParams);
}

function resolveDesignerSearchContext(input, pathname) {
  const mode = SEARCH_MODES.DESIGNER;
  const routeParams = input.routeParams ?? {};
  const tenantId = resolveTenantId(input, pathname, mode);
  const baseParams = { tenantId };
  const objectTypeId = resolveDesignerObjectTypeId(pathname, routeParams);
  const tab = resolveDesignerTab(pathname, routeParams, input.currentSection);
  const normalized = normalizePath(pathname);

  const objectTypeParams = objectTypeId
    ? { ...baseParams, objectTypeId }
    : baseParams;

  if (isPermissionsContext(tab, input.currentSection)) {
    return buildSearchContextResult(DESIGNER_SCOPES.PERMISSIONS, mode, objectTypeParams);
  }

  if (tab === DESIGNER_OBJECT_TYPE_TABS.FIELDS) {
    return buildSearchContextResult(DESIGNER_SCOPES.FIELDS, mode, objectTypeParams);
  }

  if (tab === DESIGNER_OBJECT_TYPE_TABS.VIEWS) {
    return buildSearchContextResult(DESIGNER_SCOPES.VIEWS, mode, objectTypeParams);
  }

  if (
    tab === DESIGNER_OBJECT_TYPE_TABS.RELATIONS ||
    (/\/relations(?:\/|$)/.test(normalized) && !/\/object-types\//.test(normalized))
  ) {
    return buildSearchContextResult(DESIGNER_SCOPES.RELATIONS, mode, objectTypeParams);
  }

  if (
    objectTypeId &&
    (tab === DESIGNER_OBJECT_TYPE_TABS.GENERAL ||
      tab === DESIGNER_OBJECT_TYPE_TABS.DATA ||
      tab === DESIGNER_OBJECT_TYPE_TABS.RUNTIME_PREVIEW ||
      !tab)
  ) {
    return buildSearchContextResult(DESIGNER_SCOPES.OBJECT_TYPE, mode, objectTypeParams);
  }

  if (objectTypeId) {
    return buildSearchContextResult(DESIGNER_SCOPES.OBJECT_TYPE, mode, objectTypeParams);
  }

  return buildSearchContextResult(DESIGNER_SCOPES.WORKSPACE, mode, baseParams);
}

/**
 * Resolves contextual header search scope from route and workspace signals.
 *
 * @param {object} [input]
 * @param {"runtime"|"designer"} [input.mode]
 * @param {string} [input.pathname]
 * @param {Record<string, unknown>} [input.routeParams]
 * @param {Record<string, unknown>} [input.currentPage]
 * @param {Record<string, unknown>} [input.currentSection]
 * @param {Record<string, unknown>} [input.currentObjectType]
 * @param {Record<string, unknown>|Array<Record<string, unknown>>} [input.currentEntity]
 * @param {Record<string, unknown>} [input.currentLibrary]
 * @param {Record<string, unknown>|Array<Record<string, unknown>>} [input.currentFolder]
 * @returns {{
 *   mode: "runtime"|"designer",
 *   scope: string,
 *   label: string,
 *   params: Record<string, unknown>,
 *   depth: number,
 *   meta: Record<string, unknown>,
 *   searchMode: "runtime"|"designer",
 *   searchScope: string,
 *   searchContext: object,
 * }}
 */
export function resolveSearchContext(input = {}) {
  const pathname = normalizePath(input.pathname ?? "");
  const mode = resolveSearchMode({ ...input, pathname });

  if (mode === SEARCH_MODES.DESIGNER) {
    return resolveDesignerSearchContext(input, pathname);
  }

  return resolveRuntimeSearchContext(input, pathname);
}

/** Dev / QA fixture table for manual verification. */
export const SEARCH_CONTEXT_FIXTURES = Object.freeze([
  {
    name: "runtime root → runtime.company",
    input: { pathname: "/portal/1" },
    expectedScope: RUNTIME_SCOPES.COMPANY,
  },
  {
    name: "runtime object type → runtime.object_type",
    input: {
      pathname: "/portal/1/object-types/projects",
      currentObjectType: { key: "projects" },
    },
    expectedScope: RUNTIME_SCOPES.OBJECT_TYPE,
  },
  {
    name: "runtime entity card → runtime.object_entity",
    input: {
      pathname: "/portal/1/object-types/projects",
      currentObjectType: { key: "projects" },
      currentEntity: { entityId: "ent-1" },
    },
    expectedScope: RUNTIME_SCOPES.OBJECT_ENTITY,
  },
  {
    name: "runtime library root → runtime.document_library",
    input: {
      pathname: "/portal/1/page/12",
      currentSection: { type: "document_library", libraryId: 5 },
      currentLibrary: { libraryId: 5 },
    },
    expectedScope: RUNTIME_SCOPES.DOCUMENT_LIBRARY,
  },
  {
    name: "runtime folder → runtime.document_folder",
    input: {
      pathname: "/portal/1/page/12",
      currentLibrary: { libraryId: 5, folderPath: [{ id: 42, title: "Contracts" }] },
    },
    expectedScope: RUNTIME_SCOPES.DOCUMENT_FOLDER,
  },
  {
    name: "designer root → designer.workspace",
    input: { pathname: "/designer/tenant/1/object-types" },
    expectedScope: DESIGNER_SCOPES.WORKSPACE,
  },
  {
    name: "designer fields → designer.fields",
    input: {
      pathname: "/designer/tenant/1/object-types/abc/fields",
      routeParams: { tenantId: "1", objectTypeId: "abc", tab: "fields" },
    },
    expectedScope: DESIGNER_SCOPES.FIELDS,
  },
  {
    name: "designer relations → designer.relations",
    input: { pathname: "/designer/tenant/1/relations" },
    expectedScope: DESIGNER_SCOPES.RELATIONS,
  },
]);
