import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DESIGNER_SCOPES,
  RUNTIME_SCOPES,
  SEARCH_MODES,
} from "./searchScopes.js";
import {
  SEARCH_CONTEXT_FIXTURES,
  isDesignerPathname,
  resolveSearchContext,
  resolveSearchMode,
} from "./searchContextResolver.js";

describe("resolveSearchMode", () => {
  it("detects designer from pathname", () => {
    assert.equal(
      resolveSearchMode({ pathname: "/designer/tenant/1/object-types" }),
      SEARCH_MODES.DESIGNER,
    );
  });

  it("detects runtime from pathname", () => {
    assert.equal(
      resolveSearchMode({ pathname: "/portal/1/page/1" }),
      SEARCH_MODES.RUNTIME,
    );
  });

  it("respects explicit mode override", () => {
    assert.equal(
      resolveSearchMode({ mode: "designer", pathname: "/portal/1/page/1" }),
      SEARCH_MODES.DESIGNER,
    );
  });
});

describe("isDesignerPathname", () => {
  it("matches designer routes", () => {
    assert.equal(isDesignerPathname("/designer/tenant/1/relations"), true);
    assert.equal(isDesignerPathname("/portal/1/page/1"), false);
  });
});

describe("resolveSearchContext — runtime", () => {
  it("resolves company home", () => {
    const result = resolveSearchContext({ pathname: "/portal/1" });

    assert.equal(result.mode, SEARCH_MODES.RUNTIME);
    assert.equal(result.scope, RUNTIME_SCOPES.COMPANY);
    assert.equal(result.searchScope, RUNTIME_SCOPES.COMPANY);
    assert.equal(result.label, "По всей компании");
    assert.equal(result.params.tenantId, 1);
  });

  it("resolves portal page as section", () => {
    const result = resolveSearchContext({
      pathname: "/portal/1/page/7",
      routeParams: { portalId: "1", pageId: "7" },
    });

    assert.equal(result.scope, RUNTIME_SCOPES.SECTION);
    assert.equal(result.params.sectionId, 7);
    assert.equal(result.label, "В текущем разделе");
  });

  it("resolves object type section", () => {
    const result = resolveSearchContext({
      pathname: "/portal/1/object-types/projects",
      currentObjectType: { key: "projects" },
    });

    assert.equal(result.scope, RUNTIME_SCOPES.OBJECT_TYPE);
    assert.equal(result.params.objectTypeKey, "projects");
  });

  it("resolves entity card scope over object type route", () => {
    const result = resolveSearchContext({
      pathname: "/portal/1/object-types/projects",
      currentObjectType: { key: "projects" },
      currentEntity: { entityId: "11111111-1111-1111-1111-111111111111" },
    });

    assert.equal(result.scope, RUNTIME_SCOPES.OBJECT_ENTITY);
    assert.equal(result.params.entityId, "11111111-1111-1111-1111-111111111111");
    assert.equal(result.label, "В текущей карточке");
  });

  it("resolves document library root", () => {
    const result = resolveSearchContext({
      pathname: "/portal/1/page/12",
      currentLibrary: { libraryId: 5 },
      currentSection: { type: "document_library", libraryId: 5 },
    });

    assert.equal(result.scope, RUNTIME_SCOPES.DOCUMENT_LIBRARY);
    assert.equal(result.params.libraryId, 5);
  });

  it("resolves document folder with recursive meta flag", () => {
    const result = resolveSearchContext({
      pathname: "/portal/1/page/12",
      currentLibrary: {
        libraryId: 5,
        folderPath: [{ id: 42, title: "Договоры" }],
      },
    });

    assert.equal(result.scope, RUNTIME_SCOPES.DOCUMENT_FOLDER);
    assert.equal(result.params.libraryId, 5);
    assert.equal(result.params.folderId, 42);
    assert.equal(result.meta.folderSearchRecursive, true);
    assert.equal(result.label, "В текущей папке");
  });
});

describe("resolveSearchContext — designer", () => {
  it("resolves designer workspace", () => {
    const result = resolveSearchContext({
      pathname: "/designer/tenant/1/object-types",
    });

    assert.equal(result.mode, SEARCH_MODES.DESIGNER);
    assert.equal(result.scope, DESIGNER_SCOPES.WORKSPACE);
    assert.equal(result.label, "По всей студии");
  });

  it("resolves designer fields tab", () => {
    const result = resolveSearchContext({
      pathname: "/designer/tenant/1/object-types/abc/fields",
      routeParams: { tenantId: "1", objectTypeId: "abc", tab: "fields" },
    });

    assert.equal(result.scope, DESIGNER_SCOPES.FIELDS);
    assert.equal(result.params.objectTypeId, "abc");
    assert.equal(result.label, "В полях");
  });

  it("resolves tenant-wide relations section", () => {
    const result = resolveSearchContext({
      pathname: "/designer/tenant/1/relations",
    });

    assert.equal(result.scope, DESIGNER_SCOPES.RELATIONS);
    assert.equal(result.label, "В связях");
  });

  it("resolves object type general tab", () => {
    const result = resolveSearchContext({
      pathname: "/designer/tenant/1/object-types/abc/general",
      routeParams: { objectTypeId: "abc", tab: "general" },
    });

    assert.equal(result.scope, DESIGNER_SCOPES.OBJECT_TYPE);
    assert.equal(result.params.objectTypeId, "abc");
  });

  it("resolves permissions subsection", () => {
    const result = resolveSearchContext({
      pathname: "/designer/tenant/1/object-types/abc/general",
      routeParams: { objectTypeId: "abc", tab: "general" },
      currentSection: { key: "permissions" },
    });

    assert.equal(result.scope, DESIGNER_SCOPES.PERMISSIONS);
    assert.equal(result.label, "В правах доступа");
  });
});

describe("SEARCH_CONTEXT_FIXTURES", () => {
  for (const fixture of SEARCH_CONTEXT_FIXTURES) {
    it(fixture.name, () => {
      const result = resolveSearchContext(fixture.input);
      assert.equal(result.scope, fixture.expectedScope);
    });
  }
});

describe("resolveSearchContext return shape", () => {
  it("exposes searchMode, searchScope and nested searchContext", () => {
    const result = resolveSearchContext({ pathname: "/portal/1" });

    assert.equal(result.searchMode, result.mode);
    assert.equal(result.searchScope, result.scope);
    assert.equal(result.searchContext.scope, result.scope);
    assert.equal(typeof result.depth, "number");
  });
});
