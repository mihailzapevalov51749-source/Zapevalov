import { describe, expect, it } from "vitest";

import {
  canShowNavigationDeleteAction,
  getNavigationDeleteBlockReason,
} from "./navigationDeletePolicy";

describe("navigationDeletePolicy", () => {
  it("blocks protected system items", () => {
    expect(
      getNavigationDeleteBlockReason({ id: 10, is_protected: true, title: "Custom" }),
    ).toMatch(/системным/);
    expect(canShowNavigationDeleteAction({ id: 10, is_protected: true })).toBe(false);
  });

  it("allows regular page menu items", () => {
    expect(
      getNavigationDeleteBlockReason({ id: 10, type: "page", title: "About" }),
    ).toBeNull();
    expect(canShowNavigationDeleteAction({ id: 10, type: "page", title: "About" })).toBe(
      true,
    );
  });

  it("blocks object_type menu items", () => {
    expect(
      getNavigationDeleteBlockReason({ id: 10, type: "object_type", object_type_id: 3 }),
    ).toMatch(/объекта/);
  });
});
