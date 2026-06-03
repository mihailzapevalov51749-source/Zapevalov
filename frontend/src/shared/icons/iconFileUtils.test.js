import { describe, expect, it } from "vitest";

import {
  getObjectTypeAppearanceFields,
  getObjectTypeIconFields,
  hasUploadedIcon,
  mergeObjectTypeAppearance,
} from "./iconFileUtils";

describe("getObjectTypeIconFields", () => {
  it("reads published catalog snake_case fields", () => {
    expect(
      getObjectTypeIconFields({
        icon_type: "upload",
        icon_file_url: "/uploads/icons/test.png",
      }),
    ).toEqual({
      icon_type: "upload",
      icon_file_url: "/uploads/icons/test.png",
    });
  });

  it("reads legacy icon string URL", () => {
    expect(
      getObjectTypeIconFields({
        icon: "/uploads/icons/legacy.svg",
      }),
    ).toEqual({
      icon_type: "upload",
      icon_file_url: "/uploads/icons/legacy.svg",
    });
  });
});

describe("getObjectTypeAppearanceFields", () => {
  it("prefers display_icon enrichment on navigation items", () => {
    expect(
      getObjectTypeAppearanceFields({
        display_icon_type: "upload",
        display_icon_file_url: "/uploads/icons/menu.png",
        color: "#112233",
      }),
    ).toEqual({
      icon_type: "upload",
      icon_file_url: "/uploads/icons/menu.png",
      color: "#112233",
    });
  });
});

describe("mergeObjectTypeAppearance", () => {
  it("uses navigation fallback when published catalog has no icon URL", () => {
    const merged = mergeObjectTypeAppearance(
      { key: "zadachnik", name: "Задачник" },
      {
        display_icon_type: "upload",
        display_icon_file_url: "/uploads/icons/from-menu.png",
        display_color: "#445566",
      },
    );

    expect(merged).toEqual({
      icon_type: "upload",
      icon_file_url: "/uploads/icons/from-menu.png",
      color: "#445566",
    });
  });

  it("keeps published icon when catalog has upload URL", () => {
    const merged = mergeObjectTypeAppearance(
      {
        icon_type: "upload",
        icon_file_url: "/uploads/icons/catalog.png",
      },
      {
        display_icon_file_url: "/uploads/icons/menu.png",
      },
    );

    expect(merged.icon_file_url).toBe("/uploads/icons/catalog.png");
  });
});

describe("hasUploadedIcon", () => {
  it("treats URL without icon_type as uploaded", () => {
    expect(hasUploadedIcon(null, "/uploads/icons/a.png")).toBe(true);
  });
});
