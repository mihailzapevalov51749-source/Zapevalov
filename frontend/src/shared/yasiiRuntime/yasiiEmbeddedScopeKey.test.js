import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildEmbeddedScopeKey } from "../../yasii/embedded/embeddedScopeKey.js";

describe("embeddedScopeKey tenant isolation", () => {
  it("includes tenantId in scope key", () => {
    const tenantA = buildEmbeddedScopeKey("registry", {
      tenantId: "15",
      widgetId: "registry-tasks",
      selectedScope: "registry:tasks:default_table",
    });
    const tenantB = buildEmbeddedScopeKey("registry", {
      tenantId: "21",
      widgetId: "registry-tasks",
      selectedScope: "registry:tasks:default_table",
    });

    assert.notEqual(tenantA, tenantB);
    assert.match(tenantA, /^15:/);
    assert.match(tenantB, /^21:/);
  });
});
