import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const hookSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../hooks/useLibraryDocuments.js"),
  "utf8",
);
const pageSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/LibraryPageView.jsx"),
  "utf8",
);
const runtimePageSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../portal/PortalLibraryRuntimePage.jsx",
  ),
  "utf8",
);
const documentWorkspaceSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../components/DocumentWorkspaceView.jsx",
  ),
  "utf8",
);
const fileViewerWorkspaceSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../shared/files/components/FileViewerWorkspace.jsx",
  ),
  "utf8",
);
const fileViewerToolbarSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../shared/files/components/FileViewerActionsToolbar.jsx",
  ),
  "utf8",
);

describe("library deep-link integration contract", () => {
  it("supports open=document deep-link contract", () => {
    assert.match(hookSource, /shouldOpenDocument/);
    assert.match(hookSource, /openDocumentId/);
    assert.match(hookSource, /!deepLink\.shouldOpenDocument/);
  });

  it("syncs URL with open=document when opening workspace document", () => {
    assert.match(hookSource, /open: LIBRARY_OPEN_DOCUMENT/);
  });

  it("routes document workspace through PortalLibraryRuntimePage", () => {
    assert.match(runtimePageSource, /DocumentWorkspaceView/);
    assert.match(runtimePageSource, /buildLibraryHeaderBreadcrumbItems/);
    assert.match(runtimePageSource, /PortalLayout/);
  });

  it("uses embedded FileViewerWorkspace with shared comments toolbar", () => {
    assert.match(documentWorkspaceSource, /FileViewerWorkspace/);
    assert.match(documentWorkspaceSource, /onClose={onClose}/);
    assert.match(fileViewerWorkspaceSource, /FileViewerActionsToolbar/);
    assert.match(fileViewerToolbarSource, /chat\.png/);
    assert.doesNotMatch(documentWorkspaceSource, /FileViewerModal/);
    assert.doesNotMatch(pageSource, /FileViewerModal/);
  });

  it("keeps highlight only as fallback path", () => {
    assert.match(hookSource, /setHighlightDocumentId\(document\.id\)/);
    assert.match(hookSource, /highlightDocumentId: nextHighlightId/);
  });
});
