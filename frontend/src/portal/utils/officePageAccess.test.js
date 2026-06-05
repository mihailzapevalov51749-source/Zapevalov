import { describe, expect, it } from "vitest";

import { shouldRequestOfficePageAccess } from "./officePageAccess";

describe("shouldRequestOfficePageAccess", () => {
  it("enables office access for portal runtime routes", () => {
    expect(shouldRequestOfficePageAccess("/portal/1/page/3")).toBe(true);
  });

  it("disables office access for studio page editor", () => {
    expect(shouldRequestOfficePageAccess("/designer/tenant/1/page/3")).toBe(false);
  });
});
