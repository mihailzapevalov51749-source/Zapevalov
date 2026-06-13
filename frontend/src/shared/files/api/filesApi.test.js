import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAvatarUrl, buildFileUrl, resolvePublicStaticUploadPath } from "./filesApi.js";

describe("filesApi public static upload bridge", () => {
  it("maps /files/images to /uploads/images for img tags", () => {
    assert.equal(
      resolvePublicStaticUploadPath("/files/images/abc.jpg"),
      "/uploads/images/abc.jpg",
    );
    assert.equal(
      buildFileUrl("/files/images/abc.jpg"),
      "http://127.0.0.1:8010/uploads/images/abc.jpg",
    );
  });

  it("does not map /files/documents paths", () => {
    assert.equal(
      resolvePublicStaticUploadPath("/files/documents/abc.pdf"),
      "/files/documents/abc.pdf",
    );
    assert.equal(
      buildFileUrl("/files/documents/abc.pdf"),
      "http://127.0.0.1:8010/files/documents/abc.pdf",
    );
  });

  it("detects protected document paths", async () => {
    const { isProtectedDocumentFilePath } = await import("./filesApi.js");

    assert.equal(isProtectedDocumentFilePath("/files/documents/abc.pdf"), true);
    assert.equal(
      isProtectedDocumentFilePath("/tenants/1/documents/15/download"),
      true,
    );
    assert.equal(isProtectedDocumentFilePath("/uploads/documents/legacy.pdf"), true);
    assert.equal(isProtectedDocumentFilePath("/uploads/images/a.png"), false);
    assert.equal(isProtectedDocumentFilePath("/files/avatars/user.png"), false);
    assert.equal(isProtectedDocumentFilePath("/uploads/avatars/user.png"), false);
    assert.equal(isProtectedDocumentFilePath("blob:http://localhost/x"), false);
  });

  it("maps avatar paths to public static uploads", () => {
    assert.equal(
      resolvePublicStaticUploadPath("/files/avatars/user.png"),
      "/uploads/avatars/user.png",
    );
    assert.equal(
      buildAvatarUrl("/files/avatars/user.png"),
      "http://127.0.0.1:8010/uploads/avatars/user.png",
    );
    assert.equal(
      buildAvatarUrl("/uploads/avatars/user.png"),
      "http://127.0.0.1:8010/uploads/avatars/user.png",
    );
    assert.equal(
      buildAvatarUrl("http://127.0.0.1:8010/files/avatars/user.png"),
      "http://127.0.0.1:8010/uploads/avatars/user.png",
    );
  });
});
