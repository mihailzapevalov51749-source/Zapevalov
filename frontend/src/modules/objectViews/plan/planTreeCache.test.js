import { describe, expect, it } from "vitest";

import {
  buildPlanTreeCacheKey,
  getCachedPlanTree,
  invalidatePlanTreeCache,
  setCachedPlanTree,
} from "./planTreeCache.js";

describe("planTreeCache", () => {
  it("stores and retrieves payload by scoped cache key", () => {
    const key = buildPlanTreeCacheKey({
      tenantId: 1,
      objectTypeKey: "napravleniya",
      viewKey: "arhitektura",
      relationKey: "podpunkt",
    });
    const payload = { entities: [{ id: "a" }], instances: [] };

    setCachedPlanTree(key, payload);

    expect(getCachedPlanTree(key)).toEqual(payload);
  });

  it("invalidates cache entries by tenant and object type", () => {
    const key = buildPlanTreeCacheKey({
      tenantId: 1,
      objectTypeKey: "napravleniya",
      viewKey: "arhitektura",
      relationKey: "podpunkt",
    });

    setCachedPlanTree(key, { entities: [], instances: [] });
    invalidatePlanTreeCache({ tenantId: 1, objectTypeKey: "napravleniya" });

    expect(getCachedPlanTree(key)).toBeNull();
  });
});
