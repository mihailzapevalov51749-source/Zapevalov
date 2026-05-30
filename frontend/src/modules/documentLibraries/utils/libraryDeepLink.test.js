import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LIBRARY_OPEN_DOCUMENT,
  buildLibraryDeepLinkSearchParams,
  parseLibraryDeepLink,
  resolveDeepLinkFolderTarget,
} from "./libraryDeepLink.js";

describe("libraryDeepLink", () => {
  it("parses folderId, documentId and open=document", () => {
    const params = new URLSearchParams(
      "folderId=10&documentId=77&open=document",
    );
    const parsed = parseLibraryDeepLink(params);

    assert.equal(parsed.folderId, 10);
    assert.equal(parsed.documentId, 77);
    assert.equal(parsed.shouldOpenDocument, true);
    assert.equal(parsed.hasDeepLink, true);
  });

  it("returns empty deep link for root library URL", () => {
    const parsed = parseLibraryDeepLink(new URLSearchParams());

    assert.equal(parsed.folderId, null);
    assert.equal(parsed.documentId, null);
    assert.equal(parsed.shouldOpenDocument, false);
    assert.equal(parsed.hasDeepLink, false);
  });

  it("builds query params for open document", () => {
    const params = buildLibraryDeepLinkSearchParams({
      folderId: 10,
      documentId: 55,
      open: LIBRARY_OPEN_DOCUMENT,
    });

    assert.equal(params.get("folderId"), "10");
    assert.equal(params.get("documentId"), "55");
    assert.equal(params.get("open"), "document");
  });

  it("clears params when folder and document are null", () => {
    const params = buildLibraryDeepLinkSearchParams({
      folderId: null,
      documentId: null,
      open: null,
    });

    assert.equal(params.toString(), "");
  });

  it("opens document instead of highlight when open=document", () => {
    const resolved = resolveDeepLinkFolderTarget({
      folderId: 10,
      documentId: 55,
      documentRecord: { parent_id: 10 },
      shouldOpenDocument: true,
    });

    assert.equal(resolved.targetFolderId, 10);
    assert.equal(resolved.openDocumentId, 55);
    assert.equal(resolved.highlightDocumentId, null);
  });

  it("uses highlight only when open=document is absent", () => {
    const resolved = resolveDeepLinkFolderTarget({
      folderId: 10,
      documentId: 55,
      documentRecord: { parent_id: 10 },
      shouldOpenDocument: false,
    });

    assert.equal(resolved.openDocumentId, null);
    assert.equal(resolved.highlightDocumentId, 55);
  });
});
