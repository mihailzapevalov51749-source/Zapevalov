import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

describe("DocumentsBlockView protected document links", () => {
  it("opens documents via openFileViewer instead of direct href", () => {
    const source = read("modules/blockTypes/documents/DocumentsBlockView.jsx");

    assert.match(source, /openFileViewer/);
    assert.doesNotMatch(source, /<a[^>]+href=/);
    assert.doesNotMatch(source, /target="_blank"/);
    assert.doesNotMatch(source, /window\.open\(/);
  });
});

describe("NotificationOverlayHost protected document links", () => {
  it("uses authenticated blob flow for uploaded and library files", () => {
    const source = read(
      "modules/notifications/components/NotificationOverlayHost.jsx",
    );

    assert.match(source, /fetchProtectedFileBlobUrl/);
    assert.match(source, /fetchLibraryDocumentBlobUrl/);
    assert.match(source, /isProtectedDocumentFilePath/);
    assert.doesNotMatch(source, /buildUploadedFileUrl/);
    assert.doesNotMatch(source, /href=\{.*files\/documents/);
    assert.doesNotMatch(source, /window\.open\(/);
  });
});

describe("DocumentActionsMenu protected document links", () => {
  it("does not expose direct download hrefs", () => {
    const source = read(
      "modules/documentLibraries/components/DocumentActionsMenu.jsx",
    );

    assert.match(source, /buildWorkspacePreviewPayload/);
    assert.match(source, /downloadLibraryDocument/);
    assert.doesNotMatch(source, /<a[^>]+href=/);
    assert.doesNotMatch(source, /target="_blank"/);
  });
});

describe("FileValueRenderer protected document links", () => {
  it("opens file cards via button and openFileViewer", () => {
    const source = read("shared/fieldTypes/file/FileValueRenderer.jsx");

    assert.match(source, /openFileViewer/);
    assert.doesNotMatch(source, /href=\{fileUrl\}/);
    assert.doesNotMatch(source, /target="_blank"/);
  });
});

describe("FileViewerWorkspace protected document resolution", () => {
  it("resolves protected URLs before rendering FileViewer", () => {
    const source = read("shared/files/components/FileViewerWorkspace.jsx");

    assert.match(source, /useResolvedProtectedFileUrl/);
  });
});
