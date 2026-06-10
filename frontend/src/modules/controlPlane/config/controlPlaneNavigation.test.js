import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTROL_PLANE_NAV_ITEMS,
  resolveControlPlaneActiveNavItemId,
  resolveControlPlaneActiveParentIds,
} from "./controlPlaneNavigation.js";

describe("controlPlaneNavigation", () => {
  it("highlights Tenant Registry under Companies group", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/clients/registry"),
      "cp-companies-registry",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/clients/registry"),
      ["cp-group-companies"],
    );
  });

  it("highlights platform users under System group", () => {
    assert.equal(
      resolveControlPlaneActiveNavItemId("/control-plane/platform-users"),
      "cp-platform-users",
    );
    assert.deepEqual(
      resolveControlPlaneActiveParentIds("/control-plane/platform-users"),
      ["cp-group-system"],
    );
  });

  it("builds grouped navigation tree", () => {
    const companiesGroup = CONTROL_PLANE_NAV_ITEMS.find(
      (item) => item.id === "cp-group-companies",
    );
    assert.ok(companiesGroup);
    assert.equal(companiesGroup.type, "section");
    assert.equal(companiesGroup.children?.length, 4);
  });
});
