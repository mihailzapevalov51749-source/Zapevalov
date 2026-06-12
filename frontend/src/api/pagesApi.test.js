import assert from "node:assert/strict";
import test from "node:test";

import { buildPageFullRequestParams } from "./pageFullRequestParams.js";

test("buildPageFullRequestParams includes office_access and portal_id", () => {
  assert.deepEqual(
    buildPageFullRequestParams({ officeAccess: true, portalId: 21 }),
    { office_access: true, portal_id: 21 },
  );
});

test("buildPageFullRequestParams ignores invalid portalId", () => {
  assert.deepEqual(
    buildPageFullRequestParams({ officeAccess: true, portalId: 0 }),
    { office_access: true },
  );
});

test("buildPageFullRequestParams supports portal_id without office_access", () => {
  assert.deepEqual(buildPageFullRequestParams({ portalId: 1 }), { portal_id: 1 });
});
