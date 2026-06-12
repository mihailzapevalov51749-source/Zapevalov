import assert from "node:assert/strict";
import test from "node:test";

import {
  beginNavigationReloadRequest,
  isStaleNavigationReloadResponse,
  normalizeNavigationPortalId,
} from "./navigationReloadRace.js";

test("normalizeNavigationPortalId treats invalid values as null", () => {
  assert.equal(normalizeNavigationPortalId(null), null);
  assert.equal(normalizeNavigationPortalId(0), null);
  assert.equal(normalizeNavigationPortalId("21"), 21);
});

test("beginNavigationReloadRequest increments sequence", () => {
  const requestSeqRef = { current: 0 };

  const first = beginNavigationReloadRequest(requestSeqRef);
  const second = beginNavigationReloadRequest(requestSeqRef);

  assert.equal(first.requestId, 1);
  assert.equal(second.requestId, 2);
  assert.equal(requestSeqRef.current, 2);
});

test("late portal-1 response is ignored after portal-21 response", () => {
  const requestSeqRef = { current: 0 };
  let currentPortalId = 1;

  const requestA = beginNavigationReloadRequest(requestSeqRef);
  const portalA = 1;

  currentPortalId = 21;
  const requestB = beginNavigationReloadRequest(requestSeqRef);
  const portalB = 21;

  assert.equal(
    isStaleNavigationReloadResponse({
      requestId: requestB.requestId,
      requestSeqRef,
      requestPortalId: portalB,
      currentPortalId,
    }),
    false,
  );

  assert.equal(
    isStaleNavigationReloadResponse({
      requestId: requestA.requestId,
      requestSeqRef,
      requestPortalId: portalA,
      currentPortalId,
    }),
    true,
  );
});

test("simulated reload keeps portal-21 navigation when portal-1 response arrives later", async () => {
  const requestSeqRef = { current: 0 };
  const currentPortalIdRef = { current: 1 };

  let navigation = [];
  let error = "";

  const portal1Menu = [{ id: 1, title: "DEV Page", route: "/portal/1/page/2" }];
  const portal21Menu = [{ id: 2, title: "CLIENT Page", route: "/portal/21/page/55" }];

  const pendingPortal1 = new Promise((resolve) => {
    setTimeout(() => resolve(portal1Menu), 30);
  });
  const pendingPortal21 = Promise.resolve(portal21Menu);

  const applyReloadResult = ({ requestId, requestPortalId, items }) => {
    if (
      isStaleNavigationReloadResponse({
        requestId,
        requestSeqRef,
        requestPortalId,
        currentPortalId: currentPortalIdRef.current,
      })
    ) {
      return false;
    }

    navigation = items;
    error = "";
    return true;
  };

  const requestA = beginNavigationReloadRequest(requestSeqRef);
  const requestB = beginNavigationReloadRequest(requestSeqRef);
  currentPortalIdRef.current = 21;

  const portal21Items = await pendingPortal21;
  assert.equal(
    applyReloadResult({ requestId: requestB.requestId, requestPortalId: 21, items: portal21Items }),
    true,
  );

  const portal1Items = await pendingPortal1;
  assert.equal(
    applyReloadResult({ requestId: requestA.requestId, requestPortalId: 1, items: portal1Items }),
    false,
  );

  assert.deepEqual(navigation, portal21Menu);
  assert.equal(error, "");
});

test("stale portal error is ignored after portal switch", () => {
  const requestSeqRef = { current: 0 };
  let currentPortalId = 1;
  let error = "";

  const requestA = beginNavigationReloadRequest(requestSeqRef);
  currentPortalId = 21;
  beginNavigationReloadRequest(requestSeqRef);

  const isStale = isStaleNavigationReloadResponse({
    requestId: requestA.requestId,
    requestSeqRef,
    requestPortalId: 1,
    currentPortalId,
  });

  if (!isStale) {
    error = "Ошибка загрузки меню";
  }

  assert.equal(isStale, true);
  assert.equal(error, "");
});
