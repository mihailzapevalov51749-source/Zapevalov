import assert from "node:assert/strict";
import test from "node:test";

import {
  filterWorkspaceTabsForTenant,
  resolveWorkspaceTabTenantId,
} from "./workspaceTabTenantScope.js";

test("resolveWorkspaceTabTenantId reads explicit tenant_id", () => {
  assert.equal(resolveWorkspaceTabTenantId({ tenant_id: 21 }), 21);
});

test("resolveWorkspaceTabTenantId infers tenant from office route", () => {
  assert.equal(
    resolveWorkspaceTabTenantId({ route: "/portal/21/page/42" }),
    21,
  );
});

test("filterWorkspaceTabsForTenant keeps only current tenant tabs", () => {
  const tabs = [
    { id: "a", tenant_id: 1, route: "/portal/1/page/2" },
    { id: "b", tenant_id: 21, route: "/portal/21/page/55" },
    { id: "c", route: "/portal/21/object-types/tasks" },
  ];

  const filtered = filterWorkspaceTabsForTenant(tabs, 21);

  assert.deepEqual(filtered.map((tab) => tab.id), ["b", "c"]);
});

test("filterWorkspaceTabsForTenant without tenant keeps global tabs only", () => {
  const tabs = [
    { id: "a", tenant_id: 1, route: "/portal/1/page/2" },
    { id: "b", route: "__panel__/profile/7" },
  ];

  const filtered = filterWorkspaceTabsForTenant(tabs, null);

  assert.deepEqual(filtered.map((tab) => tab.id), ["b"]);
});
