import assert from "node:assert/strict";
import test from "node:test";

import {
  beginWorkspaceTabsReloadRequest,
  isStaleWorkspaceTabsReloadResponse,
  normalizeWorkspaceTabTenantId,
} from "./workspaceTabsReloadRace.js";

test("normalizeWorkspaceTabTenantId treats invalid values as null", () => {
  assert.equal(normalizeWorkspaceTabTenantId(null), null);
  assert.equal(normalizeWorkspaceTabTenantId(0), null);
  assert.equal(normalizeWorkspaceTabTenantId("21"), 21);
});

test("beginWorkspaceTabsReloadRequest increments sequence", () => {
  const requestSeqRef = { current: 0 };

  const first = beginWorkspaceTabsReloadRequest(requestSeqRef);
  const second = beginWorkspaceTabsReloadRequest(requestSeqRef);

  assert.equal(first.requestId, 1);
  assert.equal(second.requestId, 2);
  assert.equal(requestSeqRef.current, 2);
});

test("late tenant-1 response is ignored after tenant-21 response", () => {
  const requestSeqRef = { current: 0 };
  let currentTenantId = 1;

  const requestA = beginWorkspaceTabsReloadRequest(requestSeqRef);
  const tenantA = 1;

  currentTenantId = 21;
  const requestB = beginWorkspaceTabsReloadRequest(requestSeqRef);
  const tenantB = 21;

  assert.equal(
    isStaleWorkspaceTabsReloadResponse({
      requestId: requestB.requestId,
      requestSeqRef,
      requestTenantId: tenantB,
      currentTenantId,
    }),
    false,
  );

  assert.equal(
    isStaleWorkspaceTabsReloadResponse({
      requestId: requestA.requestId,
      requestSeqRef,
      requestTenantId: tenantA,
      currentTenantId,
    }),
    true,
  );
});

test("simulated reload state keeps tenant-21 tabs when tenant-1 response arrives later", async () => {
  const requestSeqRef = { current: 0 };
  const currentTenantIdRef = { current: 1 };

  let tabs = [];
  let activeTabId = null;
  let error = "";

  const tenant1Tabs = [{ id: "dev-tab", tenant_id: 1, route: "/portal/1/page/2" }];
  const tenant21Tabs = [{ id: "client-tab", tenant_id: 21, route: "/portal/21/page/55" }];

  const pendingTenant1 = new Promise((resolve) => {
    setTimeout(() => resolve(tenant1Tabs), 30);
  });
  const pendingTenant21 = Promise.resolve(tenant21Tabs);

  const applyReloadResult = ({ requestId, requestTenantId, items }) => {
    if (
      isStaleWorkspaceTabsReloadResponse({
        requestId,
        requestSeqRef,
        requestTenantId,
        currentTenantId: currentTenantIdRef.current,
      })
    ) {
      return false;
    }

    tabs = items;
    activeTabId = items[0]?.id ? String(items[0].id) : null;
    error = "";
    return true;
  };

  const requestA = beginWorkspaceTabsReloadRequest(requestSeqRef);
  const requestB = beginWorkspaceTabsReloadRequest(requestSeqRef);
  currentTenantIdRef.current = 21;

  const tenant21Items = await pendingTenant21;
  assert.equal(applyReloadResult({ requestId: requestB.requestId, requestTenantId: 21, items: tenant21Items }), true);

  const tenant1Items = await pendingTenant1;
  assert.equal(applyReloadResult({ requestId: requestA.requestId, requestTenantId: 1, items: tenant1Items }), false);

  assert.deepEqual(tabs, tenant21Tabs);
  assert.equal(activeTabId, "client-tab");
  assert.equal(error, "");
});

test("stale tenant error is ignored after tenant switch", () => {
  const requestSeqRef = { current: 0 };
  let currentTenantId = 1;
  let error = "";

  const requestA = beginWorkspaceTabsReloadRequest(requestSeqRef);
  currentTenantId = 21;
  beginWorkspaceTabsReloadRequest(requestSeqRef);

  const isStale = isStaleWorkspaceTabsReloadResponse({
    requestId: requestA.requestId,
    requestSeqRef,
    requestTenantId: 1,
    currentTenantId,
  });

  if (!isStale) {
    error = "Не удалось загрузить вкладки";
  }

  assert.equal(isStale, true);
  assert.equal(error, "");
});
