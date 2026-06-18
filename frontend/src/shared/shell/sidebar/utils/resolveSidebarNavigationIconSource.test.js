import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveSidebarNavigationIconSource } from "./resolveSidebarNavigationIconSource.js";

describe("resolveSidebarNavigationIconSource", () => {
  it("returns uploaded icon file url when present", () => {
    const source = resolveSidebarNavigationIconSource({
      title: "Релизы",
      icon_file_url: "/uploads/icons/releases.svg",
      icon_type: "objects",
      icon: "objects",
    });

    assert.equal(source.title, "Релизы");
    assert.equal(source.iconFileUrl, "/uploads/icons/releases.svg");
    assert.equal(source.hasUploadedIcon, true);
  });

  it("does not resolve system icon fields", () => {
    const source = resolveSidebarNavigationIconSource({
      title: "Компании",
      icon_type: "users",
      iconType: "settings",
      icon: "users",
      type: "system_page",
    });

    assert.equal(source.title, "Компании");
    assert.equal(source.iconFileUrl, undefined);
    assert.equal(source.hasUploadedIcon, false);
  });
});
