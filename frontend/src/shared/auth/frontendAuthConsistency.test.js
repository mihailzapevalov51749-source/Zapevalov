import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

function assertProtectedModule(relativePath, { label, allowFetchWithAuth = false } = {}) {
  const source = read(relativePath);

  assert.doesNotMatch(
    source,
    /from ["'][^"']*\/api\/apiClient/,
    `${label || relativePath} must not import bare apiClient`,
  );
  assert.doesNotMatch(
    source,
    /\bapiClient\.(get|post|put|patch|delete)\(/,
    `${label || relativePath} must not call apiClient directly`,
  );

  if (!allowFetchWithAuth) {
    assert.doesNotMatch(
      source,
      /\bfetch\(\s*[`'"]\$\{API_BASE_URL\}/,
      `${label || relativePath} must not use plain fetch to backend API`,
    );
  }
}

describe("frontend auth consistency — protected modules", () => {
  it("resolvePortalHomePage uses platformApiClient", () => {
    const source = read("portal/utils/resolvePortalHomePage.js");
    assert.match(source, /platformApiClient/);
    assertProtectedModule("portal/utils/resolvePortalHomePage.js");
  });

  it("uploadIcon uses authenticated shared upload", () => {
    const source = read("api/filesApi.js");
    assert.match(source, /uploadFile/);
    assert.match(source, /\/files\/upload-icon/);
    assertProtectedModule("api/filesApi.js");
  });

  it("yasiiEmbeddedApi uses platformApiClient", () => {
    const source = read("yasii/yasiiEmbeddedApi.js");
    assert.match(source, /platformApiClient/);
    assertProtectedModule("yasii/yasiiEmbeddedApi.js");
  });

  it("yasiiApi uses platformApiClient", () => {
    const source = read("yasii/yasiiApi.js");
    assert.match(source, /platformApiClient/);
    assertProtectedModule("yasii/yasiiApi.js");
  });

  it("documentLibrariesApi uses platformApiClient without plain fetch", () => {
    const source = read("modules/documentLibraries/api/documentLibrariesApi.js");
    assert.match(source, /platformApiClient/);
    assert.doesNotMatch(source, /\bfetch\(/);
    assertProtectedModule("modules/documentLibraries/api/documentLibrariesApi.js");
  });

  it("pagesApi uses authenticated client re-export", () => {
    const source = read("api/pagesApi.js");
    assert.match(source, /platformApiClient/);
    assertProtectedModule("api/pagesApi.js");
  });

  it("navigationApi uses authenticated client re-export", () => {
    const source = read("api/navigationApi.js");
    assert.match(source, /platformApiClient/);
    assertProtectedModule("api/navigationApi.js");
  });

  it("workspaceTabsApi uses platformApiClient", () => {
    const source = read("shared/workspaceTabs/workspaceTabsApi.js");
    assert.match(source, /platformApiClient/);
    assertProtectedModule("shared/workspaceTabs/workspaceTabsApi.js");
  });

  it("iconFileUtils does not depend on apiClient", () => {
    assertProtectedModule("shared/icons/iconFileUtils.js");
    const source = read("shared/icons/iconFileUtils.js");
    assert.match(source, /buildFileUrl/);
  });

  it("NotificationOverlayHost does not import apiClient", () => {
    assertProtectedModule("modules/notifications/components/NotificationOverlayHost.jsx");
    const source = read("modules/notifications/components/NotificationOverlayHost.jsx");
    assert.match(source, /fetchProtectedFileBlobUrl/);
    assert.match(source, /isProtectedDocumentFilePath/);
    assert.match(source, /fetchLibraryDocumentBlobUrl/);
  });
});

describe("frontend auth consistency — fetch wrappers with Bearer", () => {
  it("documents manual fetch helpers include Authorization when token exists", () => {
    for (const relativePath of [
      "modules/comments/api/commentsApi.js",
      "modules/chats/api/chatsApi.js",
      "modules/notifications/api/notificationsApi.js",
      "shared/checklists/checklistApi.js",
      "shared/notes/notesApi.js",
      "shared/files/api/filesApi.js",
    ]) {
      const source = read(relativePath);
      assert.match(source, /Authorization/);
      assert.match(source, /Bearer \$\{token\}|Bearer \$\{token\}/);
    }
  });
});
