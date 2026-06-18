import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { API_BASE_URL } from "../../../config/apiConfig.js";
import { buildAvatarUrl, buildFileUrl, resolvePublicStaticUploadPath } from "./filesApi.js";

describe("filesApi public static upload bridge", () => {
  it("maps /files/images to /uploads/images for img tags", () => {
    assert.equal(
      resolvePublicStaticUploadPath("/files/images/abc.jpg"),
      "/uploads/images/abc.jpg",
    );
    assert.equal(
      buildFileUrl("/files/images/abc.jpg"),
      `${API_BASE_URL}/uploads/images/abc.jpg`,
    );
  });

  it("does not map /files/documents paths", () => {
    assert.equal(
      resolvePublicStaticUploadPath("/files/documents/abc.pdf"),
      "/files/documents/abc.pdf",
    );
    assert.equal(
      buildFileUrl("/files/documents/abc.pdf"),
      `${API_BASE_URL}/files/documents/abc.pdf`,
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
      `${API_BASE_URL}/uploads/avatars/user.png`,
    );
    assert.equal(
      buildAvatarUrl("/uploads/avatars/user.png"),
      `${API_BASE_URL}/uploads/avatars/user.png`,
    );
    assert.equal(
      buildAvatarUrl(`${API_BASE_URL}/files/avatars/user.png`),
      `${API_BASE_URL}/uploads/avatars/user.png`,
    );
  });
});
